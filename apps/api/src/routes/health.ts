import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

const Health = z.object({
  status: z.literal('ok'),
  version: z.string(),
  uptime: z.number().int().nonnegative(),
});

export const healthRoutes: FastifyPluginCallbackZod = (app, _opts, done) => {
  app.get(
    '/health',
    {
      schema: {
        tags: ['health'],
        summary: 'Liveness check',
        response: { 200: Health },
      },
    },
    () => ({
      status: 'ok' as const,
      version: app.config.APP_VERSION ?? 'dev',
      uptime: Math.round(process.uptime()),
    })
  );
  done();
};
