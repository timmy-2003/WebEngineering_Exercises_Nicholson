import { NotFoundError } from '../errors.js';
import type { CommentPage, Page, Repos } from '../repositories/types.js';
import type { Env } from '../schemas/env.js';
import type { Comment, NewComment } from '../schemas/comment.js';

export interface CommentService {
  list: (bearId: string, page: Page) => Promise<CommentPage>;
  get: (commentId: string) => Promise<Comment>;
  create: (bearId: string, input: NewComment) => Promise<Comment>;
  remove: (commentId: string) => Promise<void>;
  report: (commentId: string) => Promise<Comment>;
}

const HIDE_AFTER_REPORTS = 3;

declare module 'fastify' {
  interface FastifyInstance {
    commentService: CommentService;
  }
}

// Read, increment in TypeScript, write. Safe only when the read locked the row.
async function addReport(
  { comments }: Repos,
  commentId: string,
  lock: boolean
): Promise<Comment> {
  const comment = await comments.findById(commentId, { lock });
  if (comment === null) {
    throw new NotFoundError('comment', commentId);
  }
  const reportCount = comment.reportCount + 1;
  const hiddenAt =
    comment.hiddenAt ??
    (reportCount >= HIDE_AFTER_REPORTS ? new Date().toISOString() : null);
  const updated = await comments.update(commentId, { reportCount, hiddenAt });
  if (updated === null) {
    throw new NotFoundError('comment', commentId);
  }
  return updated;
}

export function createCommentService(
  repos: Repos,
  reportMode: Env['REPORT_MODE']
): CommentService {
  const { bears, comments } = repos;
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

    async report(commentId) {
      if (reportMode === 'naive') {
        // Lost update: concurrent requests read the same count and each
        // writes count + 1.
        return await addReport(repos, commentId, false);
      }
      // The transaction boundary lives here, in the service: the row lock
      // from SELECT … FOR UPDATE is held until the UPDATE commits.
      return await repos.transaction(
        async (tx) => await addReport(tx, commentId, true)
      );
    },
  };
}
