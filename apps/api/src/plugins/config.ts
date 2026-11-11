import fp from 'fastify-plugin';
import type { Env } from '../schemas/env.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: Env;
  }
}

export const configPlugin = fp<{ env: Env }>(
  (app, { env }, done) => {
    app.decorate('config', env);
    done();
  },
  { name: 'config' }
);
