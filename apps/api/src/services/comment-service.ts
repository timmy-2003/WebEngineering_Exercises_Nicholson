import { NotFoundError } from '../errors.js';
import type { CommentPage, Page, Repos } from '../repositories/types.js';
import type { Comment, NewComment } from '../schemas/comment.js';

export interface CommentService {
  list: (bearId: string, page: Page) => Promise<CommentPage>;
  get: (commentId: string) => Promise<Comment>;
  create: (bearId: string, input: NewComment) => Promise<Comment>;
  remove: (commentId: string) => Promise<void>;
}

declare module 'fastify' {
  interface FastifyInstance {
    commentService: CommentService;
  }
}

export function createCommentService({
  bears,
  comments,
}: Repos): CommentService {
  return {
    async list(bearId, page) {
      if ((await bears.get(bearId)) === null) {
        throw new NotFoundError('bear', bearId);
      }
      return await comments.listByBear(bearId, page);
    },

    async get(commentId) {
      const comment = await comments.findById(commentId);
      if (comment === null) {
        throw new NotFoundError('comment', commentId);
      }
      return comment;
    },

    async create(bearId, input) {
      return await comments.create({ bearId, ...input });
    },

    async remove(commentId) {
      if (!(await comments.delete(commentId))) {
        throw new NotFoundError('comment', commentId);
      }
    },
  };
}
