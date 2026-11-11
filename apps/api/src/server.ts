import { buildApp } from './app.js';
import { loadEnv } from './schemas/env.js';

const env = loadEnv();
const app = await buildApp({ env, logger: true });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, 'shutting down');
    void app.close().then(() => process.exit(0));
  });
}

await app.listen({ host: env.HOST, port: env.PORT });
