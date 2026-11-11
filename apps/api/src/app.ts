import Fastify, {
  type FastifyError,
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { AppError, UpstreamThrottledError } from './errors.js';
import { configPlugin } from './plugins/config.js';
import { bearRoutes } from './routes/bears.js';
import { healthRoutes } from './routes/health.js';
import type { Env } from './schemas/env.js';
import { createBearService } from './services/bear-service.js';
import { createWikipediaClient } from './upstream/wikipedia.js';

const HTTP_INTERNAL_SERVER_ERROR = 500;

export interface BuildAppOptions {
  env: Env;
  fetch?: typeof globalThis.fetch;
  logger?: FastifyServerOptions['logger'];
}

export async function buildApp(
  options: BuildAppOptions
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((err: FastifyError, req, reply) => {
    if (err instanceof UpstreamThrottledError) {
      void reply.header('retry-after', String(err.retryAfterSeconds));
    }
    const status =
      err instanceof AppError
        ? err.status
        : (err.statusCode ?? HTTP_INTERNAL_SERVER_ERROR);
    if (status >= HTTP_INTERNAL_SERVER_ERROR) {
      req.log.error({ err }, 'request failed');
    }
    return reply.code(status).send({
      title: err instanceof AppError ? err.title : err.name,
      detail: err.message,
    });
  });

  await app.register(configPlugin, { env: options.env });
  app.decorate(
    'bearService',
    createBearService(
      createWikipediaClient(options.env, options.fetch ?? globalThis.fetch),
      app.log
    )
  );

  await app.register(healthRoutes);
  await app.register(bearRoutes);

  return app;
}
