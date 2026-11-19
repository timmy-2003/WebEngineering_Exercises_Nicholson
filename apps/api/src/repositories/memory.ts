import { randomUUID } from 'node:crypto';
import { NotFoundError } from '../errors.js';
import type { BearDetail } from '../schemas/bear.js';
import type { Comment } from '../schemas/comment.js';
import { decodeCursor, toPage, type CommentKey } from './cursor.js';
import type { Repos } from './types.js';

// (createdAt, id) compared like the database's row comparison.
function isBefore(row: CommentKey, key: CommentKey): boolean {
  return (
    row.createdAt < key.createdAt ||
    (row.createdAt === key.createdAt && row.id < key.id)
  );
}

function newestFirst(a: CommentKey, b: CommentKey): number {
  return Number(isBefore(a, b)) - Number(isBefore(b, a));
}

export function createMemoryRepos(
  options: { bears?: readonly BearDetail[]; now?: () => Date } = {}
): Repos {
  const bears = new Map((options.bears ?? []).map((bear) => [bear.id, bear]));
  const comments = new Map<string, Comment>();

  // Real clocks repeat milliseconds; keep creation order visible in createdAt.
  let lastMs = 0;
  const now =
    options.now ??
    ((): Date => {
      lastMs = Math.max(Date.now(), lastMs + 1);
      return new Date(lastMs);
    });

  return {
    bears: {
      async list(q) {
        const needle = q?.toLowerCase();
        return await Promise.resolve(
          [...bears.values()]
            .filter(
              (bear) =>
                needle === undefined || bear.name.toLowerCase().includes(needle)
            )
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
      async listByBear(bearId, { limit, cursor }) {
        const after = cursor === undefined ? undefined : decodeCursor(cursor);
        const rows = [...comments.values()]
          .filter(
            (comment) =>
              comment.bearId === bearId &&
              (after === undefined || isBefore(comment, after))
          )
          .sort(newestFirst);
        return await Promise.resolve(toPage(rows, limit));
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
          createdAt: now().toISOString(),
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
