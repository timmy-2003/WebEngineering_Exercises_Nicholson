import { sql, TransactionRollbackError } from 'drizzle-orm';
import { z } from 'zod';
import { createDatabase } from '../db/database.js';
import { loadEnv } from '../schemas/env.js';

const BEAR_ID = 'ursus-arctos';
const PAGE_ROWS = 21;

// The repository's first-page query (limit 20 + 1 to detect a next page).
const firstPage = sql`
  EXPLAIN (ANALYZE, BUFFERS)
  SELECT * FROM comments
  WHERE bear_id = ${BEAR_ID}
  ORDER BY created_at DESC, id DESC
  LIMIT ${PAGE_ROWS}
`;

const PlanRows = z.array(z.object({ 'QUERY PLAN': z.string() }));

function print(title: string, rows: unknown): void {
  const lines = PlanRows.parse(rows).map((row) => row['QUERY PLAN']);
  process.stdout.write(`\n=== ${title} ===\n${lines.join('\n')}\n`);
}

const database = createDatabase(loadEnv());
try {
  const { db } = database;
  const { rows: withIndex } = await db.execute(firstPage);
  print('with index comments_bear_created_idx', withIndex);

  // Drop the index inside a transaction and roll back, so the schema is
  // unchanged afterwards. Holds a lock on comments for a few milliseconds.
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`DROP INDEX comments_bear_created_idx`);
      const { rows: withoutIndex } = await tx.execute(firstPage);
      print(
        'without index (dropped inside a rolled-back transaction)',
        withoutIndex
      );
      tx.rollback();
    });
  } catch (err) {
    if (!(err instanceof TransactionRollbackError)) {
      throw err;
    }
  }
} finally {
  await database.close();
}
