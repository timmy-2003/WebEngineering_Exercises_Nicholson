import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { configPlugin } from './plugins/config.js';
import { healthRoutes } from './routes/health.js';
import type { Env } from './schemas/env.js';

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

  await app.register(configPlugin, { env: options.env });
  await app.register(healthRoutes);

  return app;
}
