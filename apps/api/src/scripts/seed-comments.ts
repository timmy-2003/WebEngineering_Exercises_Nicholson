import { sql } from 'drizzle-orm';
import { createDatabase } from '../db/database.js';
import { loadEnv } from '../schemas/env.js';

const COMMENT_COUNT = 100_000;

const database = createDatabase(loadEnv());
try {
  // One statement: bears round-robin, one second apart, newest = now.
  const result = await database.db.execute(sql`
    WITH ids AS (SELECT array_agg(id ORDER BY id) AS a FROM bears)
    INSERT INTO comments (bear_id, author, text, created_at)
    SELECT ids.a[1 + n % cardinality(ids.a)],
           'seed',
           'Seeded comment #' || n,
           now() - make_interval(secs => n)
    FROM ids, generate_series(1, ${COMMENT_COUNT}) AS n
  `);
  await database.db.execute(sql`ANALYZE comments`);
  process.stdout.write(`inserted ${result.rowCount ?? 0} comments\n`);
} finally {
  await database.close();
}
