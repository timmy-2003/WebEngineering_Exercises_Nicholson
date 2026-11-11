import { randomUUID } from 'node:crypto';
import { NotFoundError } from '../errors.js';
import type { Comment, NewComment } from '../schemas/comment.js';
import type { BearService } from './bear-service.js';

export interface CommentStore {
  list: (bearId: string) => Promise<Comment[]>;
  get: (commentId: string) => Comment;
  create: (bearId: string, input: NewComment) => Promise<Comment>;
  remove: (commentId: string) => void;
}

declare module 'fastify' {
  interface FastifyInstance {
    commentStore: CommentStore;
  }
}

export function createCommentService(bears: BearService): CommentStore {
  const comments = new Map<string, Comment>();

  async function requireBear(bearId: string): Promise<void> {
    const known = await bears.list();
    if (!known.some((bear) => bear.id === bearId)) {
      throw new NotFoundError('bear', bearId);
    }
  }

  function get(commentId: string): Comment {
    const comment = comments.get(commentId);
    if (comment === undefined) {
      throw new NotFoundError('comment', commentId);
    }
    return comment;
  }

  return {
    async list(bearId) {
      await requireBear(bearId);
      return [...comments.values()]
        .filter((comment) => comment.bearId === bearId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },

    get,

    async create(bearId, input) {
      await requireBear(bearId);
      const comment: Comment = {
        id: randomUUID(),
        bearId,
        author: input.author,
        text: input.text,
        createdAt: new Date().toISOString(),
      };
      comments.set(comment.id, comment);
      return comment;
    },

    remove(commentId) {
      get(commentId);
      comments.delete(commentId);
    },
  };
}
