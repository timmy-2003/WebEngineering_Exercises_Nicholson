import { buildApp } from './app.js';
import { createDatabase } from './db/database.js';
import { loggerOptions } from './plugins/request-logging.js';
import { loadEnv } from './schemas/env.js';

const env = loadEnv();
const database = createDatabase(env);
const app = await buildApp({
  env,
  logger: loggerOptions(env.LOG_FORMAT),
  ping: database.ping,
});
database.onIdleClientError((err) => {
  app.log.error({ err }, 'idle database client failed');
});
app.addHook('onClose', async () => {
  await database.close();
});

if (env.MIGRATE_ON_START) {
  await database.migrate();
  app.log.info('migrations applied');
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, 'shutting down');
    void app.close().then(() => process.exit(0));
  });
}

await app.listen({ host: env.HOST, port: env.PORT });
