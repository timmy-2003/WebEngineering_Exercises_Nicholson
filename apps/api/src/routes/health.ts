import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { DatabaseUnavailableError } from '../errors.js';
import { problemResponses } from '../schemas/problem.js';

const Health = z.object({
  status: z.literal('ok'),
  version: z.string(),
  uptime: z.number().int().nonnegative(),
});

const Ready = z.object({ status: z.literal('ready') });

export interface HealthRoutesOptions {
  ping: () => Promise<void>;
}

export const healthRoutes: FastifyPluginCallbackZod<HealthRoutesOptions> = (
  app,
  { ping },
  done
) => {
  app.get(
    '/health',
    {
      schema: {
        tags: ['health'],
        summary: 'Liveness check',
        response: { 200: Health, ...problemResponses('internal') },
      },
    },
    () => ({
      status: 'ok' as const,
      version: app.config.APP_VERSION ?? 'dev',
      uptime: Math.round(process.uptime()),
    })
  );

  app.get(
    '/health/ready',
    {
      schema: {
        tags: ['health'],
        summary: 'Readiness check: 200 only if the database answers',
        response: {
          200: Ready,
          ...problemResponses('database-unavailable', 'internal'),
        },
      },
    },
    async (req) => {
      try {
        await ping();
      } catch (err) {
        req.log.warn({ err }, 'readiness check failed');
        throw new DatabaseUnavailableError('database ping failed', {
          cause: err,
        });
      }
      return { status: 'ready' as const };
    }
  );

  done();
};
