import { asc, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { bears, comments } from '../db/schema.js';
import { NotFoundError } from '../errors.js';
import type { Comment } from '../schemas/comment.js';
import type { Repos } from './types.js';

const FOREIGN_KEY_VIOLATION = '23503';

const bearColumns = {
  id: bears.id,
  name: bears.name,
  binomial: bears.binomial,
  imageUrl: bears.imageUrl,
  range: bears.range,
};

type CommentRow = typeof comments.$inferSelect;

function toComment(row: CommentRow): Comment {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

// Drizzle wraps driver errors, so the Postgres error code sits on the cause.
function isForeignKeyViolation(err: unknown): boolean {
  const cause = err instanceof Error ? err.cause : undefined;
  return (
    typeof cause === 'object' &&
    cause !== null &&
    'code' in cause &&
    cause.code === FOREIGN_KEY_VIOLATION
  );
}

export function createDrizzleRepos(db: NodePgDatabase): Repos {
  return {
    bears: {
      async list() {
        return await db.select(bearColumns).from(bears).orderBy(bears.binomial);
      },
      async get(id) {
        const [bear] = await db
          .select({ ...bearColumns, intro: bears.intro })
          .from(bears)
          .where(eq(bears.id, id));
        return bear ?? null;
      },
      async upsertMany(records) {
        if (records.length === 0) {
          return;
        }
        await db
          .insert(bears)
          .values([...records])
          .onConflictDoUpdate({
            target: bears.id,
            set: {
              name: sql`excluded.name`,
              binomial: sql`excluded.binomial`,
              imageUrl: sql`excluded.image_url`,
              range: sql`excluded.range`,
              intro: sql`excluded.intro`,
              fetchedAt: sql`now()`,
            },
          });
      },
    },

    comments: {
      async listByBear(bearId) {
        const rows = await db
          .select()
          .from(comments)
          .where(eq(comments.bearId, bearId))
          .orderBy(asc(comments.createdAt), asc(comments.id));
        return rows.map(toComment);
      },
      async findById(id) {
        const [row] = await db
          .select()
          .from(comments)
          .where(eq(comments.id, id));
        return row === undefined ? null : toComment(row);
      },
      async create(input) {
        try {
          const [row] = await db.insert(comments).values(input).returning();
          if (row === undefined) {
            throw new Error('INSERT … RETURNING returned no row');
          }
          return toComment(row);
        } catch (err) {
          if (isForeignKeyViolation(err)) {
            throw new NotFoundError('bear', input.bearId);
          }
          throw err;
        }
      },
      async delete(id) {
        const deleted = await db
          .delete(comments)
          .where(eq(comments.id, id))
          .returning({ id: comments.id });
        return deleted.length > 0;
      },
    },
  };
}
