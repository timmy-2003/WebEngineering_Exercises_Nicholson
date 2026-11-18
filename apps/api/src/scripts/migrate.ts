import { createDatabase } from '../db/database.js';
import { loadEnv } from '../schemas/env.js';

const database = createDatabase(loadEnv());
try {
  await database.migrate();
  process.stdout.write('migrations applied\n');
} finally {
  await database.close();
}
