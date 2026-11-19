import { and, desc, eq, ilike, isNull, sql } from 'drizzle-orm';
import type { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import { bears, comments } from '../db/schema.js';
import { NotFoundError } from '../errors.js';
import type { Comment } from '../schemas/comment.js';
import { decodeCursor, toPage } from './cursor.js';
import type { Repos } from './types.js';

const FOREIGN_KEY_VIOLATION = '23503';

// User input inside LIKE: % and _ are text, not wildcards.
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/gv, '\\$&');
}

const bearColumns = {
  id: bears.id,
  name: bears.name,
  binomial: bears.binomial,
  imageUrl: bears.imageUrl,
  range: bears.range,
};

type CommentRow = typeof comments.$inferSelect;

function toComment(row: CommentRow): Comment {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    hiddenAt: row.hiddenAt?.toISOString() ?? null,
  };
}

// Both the pool-backed database and a transaction handle.
type Executor = PgDatabase<NodePgQueryResultHKT>;

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

export function createDrizzleRepos(db: Executor): Repos {
  return {
    bears: {
      async list(q) {
        return await db
          .select(bearColumns)
          .from(bears)
          .where(
            q === undefined
              ? undefined
              : ilike(bears.name, `%${escapeLike(q)}%`)
          )
          .orderBy(bears.binomial);
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
      async listByBear(bearId, { limit, cursor }) {
        const after = cursor === undefined ? undefined : decodeCursor(cursor);
        const rows = await db
          .select()
          .from(comments)
          .where(
            and(
              eq(comments.bearId, bearId),
              isNull(comments.hiddenAt),
              after === undefined
                ? undefined
                : sql`(${comments.createdAt}, ${comments.id}) < (${after.createdAt}::timestamptz, ${after.id}::uuid)`
            )
          )
          .orderBy(desc(comments.createdAt), desc(comments.id))
          .limit(limit + 1);
        return toPage(rows.map(toComment), limit);
      },
      async findById(id, { lock = false } = {}) {
        const query = db.select().from(comments).where(eq(comments.id, id));
        const [row] = lock ? await query.for('update') : await query;
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
      async update(id, { reportCount, hiddenAt }) {
        const [row] = await db
          .update(comments)
          .set({
            reportCount,
            hiddenAt: hiddenAt === null ? null : new Date(hiddenAt),
          })
          .where(eq(comments.id, id))
          .returning();
        return row === undefined ? null : toComment(row);
      },
    },

    transaction: async (work) =>
      await db.transaction(async (tx) => await work(createDrizzleRepos(tx))),
  };
}
