import { randomUUID } from 'node:crypto';
import { NotFoundError } from '../errors.js';
import type { BearDetail } from '../schemas/bear.js';
import type { Comment } from '../schemas/comment.js';
import type { Repos } from './types.js';

export function createMemoryRepos(
  seed: { bears?: readonly BearDetail[] } = {}
): Repos {
  const bears = new Map((seed.bears ?? []).map((bear) => [bear.id, bear]));
  const comments = new Map<string, Comment>();

  return {
    bears: {
      async list() {
        return await Promise.resolve(
          [...bears.values()]
            .sort((a, b) => a.binomial.localeCompare(b.binomial))
            .map(({ intro: _intro, ...bear }) => bear)
        );
      },
      async get(id) {
        return await Promise.resolve(bears.get(id) ?? null);
      },
      async upsertMany(records) {
        for (const record of records) {
          bears.set(record.id, record);
        }
        await Promise.resolve();
      },
    },

    comments: {
      async listByBear(bearId) {
        return await Promise.resolve(
          [...comments.values()].filter((comment) => comment.bearId === bearId)
        );
      },
      async findById(id) {
        return await Promise.resolve(comments.get(id) ?? null);
      },
      async create(input) {
        if (!bears.has(input.bearId)) {
          throw new NotFoundError('bear', input.bearId);
        }
        const comment: Comment = {
          id: randomUUID(),
          ...input,
          createdAt: new Date().toISOString(),
        };
        comments.set(comment.id, comment);
        return await Promise.resolve(comment);
      },
      async delete(id) {
        return await Promise.resolve(comments.delete(id));
      },
    },
  };
}
