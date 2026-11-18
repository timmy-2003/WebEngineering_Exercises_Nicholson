import { pino } from 'pino';
import { createDatabase } from '../db/database.js';
import { createDrizzleRepos } from '../repositories/drizzle.js';
import { loadEnv } from '../schemas/env.js';
import { fetchBearsFromWikipedia } from '../services/fetch-bears.js';
import { createWikipediaClient } from '../upstream/wikipedia.js';

const env = loadEnv();
const log = pino(
  env.LOG_FORMAT === 'pretty' ? { transport: { target: 'pino-pretty' } } : {}
);
const database = createDatabase(env);

try {
  const bears = await fetchBearsFromWikipedia(
    createWikipediaClient(env, globalThis.fetch),
    log
  );
  await createDrizzleRepos(database.db).bears.upsertMany(bears);
  log.info(`seeded ${bears.length} bears`);
} catch (err) {
  log.error({ err }, 'seed failed');
  process.exitCode = 1;
} finally {
  await database.close();
}
