import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';

export const debugRoutes: FastifyPluginCallbackZod = (app, _opts, done) => {
  app.get('/api/debug/boom', { schema: { hide: true } }, () => {
    throw new Error('secret internal detail at /srv/db');
  });
  done();
};
