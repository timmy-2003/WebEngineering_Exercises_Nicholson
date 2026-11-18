import { randomUUID } from 'node:crypto';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyServerOptions,
} from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import {
  AppError,
  RouteNotFoundError,
  toProblem,
  UpstreamThrottledError,
} from './errors.js';
import { transformObject } from './openapi.js';
import { configPlugin } from './plugins/config.js';
import {
  describeError,
  RequestLogController,
} from './plugins/request-logging.js';
import { bearRoutes } from './routes/bears.js';
import { commentRoutes } from './routes/comments.js';
import { debugRoutes } from './routes/debug.js';
import { healthRoutes } from './routes/health.js';
import type { Env } from './schemas/env.js';
import type { Problem } from './schemas/problem.js';
import { createBearService } from './services/bear-service.js';
import { createCommentService } from './services/comment-service.js';
import { createWikipediaClient } from './upstream/wikipedia.js';

const HTTP_INTERNAL_SERVER_ERROR = 500;
const CORS_MAX_AGE_SECONDS = 600;
const REQUEST_ID_HEADER = 'x-request-id';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iv;

export interface BuildAppOptions {
  env: Env;
  fetch?: typeof globalThis.fetch;
  ping: () => Promise<void>;
  logger?: FastifyServerOptions['logger'];
}

async function sendProblem(
  reply: FastifyReply,
  problem: Problem
): Promise<FastifyReply> {
  return await reply
    .code(problem.status)
    .type('application/problem+json; charset=utf-8')
    .send(problem);
}

export async function buildApp(
  options: BuildAppOptions
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false,
    logController: new RequestLogController(),
    requestIdHeader: false,
    genReqId: (req) => {
      const {
        headers: { 'x-request-id': incoming },
      } = req;
      return typeof incoming === 'string' && UUID.test(incoming)
        ? incoming
        : randomUUID();
    },
  }).withTypeProvider<ZodTypeProvider>();

  app.addHook('onRequest', (req, reply, done) => {
    void reply.header(REQUEST_ID_HEADER, req.id);
    done();
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.removeContentTypeParser('text/plain');

  app.setErrorHandler(async (err, req, reply) => {
    const problem = toProblem(err, req.id);
    if (problem.status >= HTTP_INTERNAL_SERVER_ERROR) {
      if (err instanceof AppError) {
        req.log.error({ errType: err.name }, describeError(err));
      } else {
        req.log.error({ err }, 'request failed');
      }
    }
    if (err instanceof UpstreamThrottledError) {
      void reply.header('retry-after', String(err.retryAfterSeconds));
    }
    return await sendProblem(reply, problem);
  });

  app.setNotFoundHandler(
    async (req, reply) =>
      await sendProblem(
        reply,
        toProblem(new RouteNotFoundError(req.method, req.url), req.id)
      )
  );

  await app.register(configPlugin, { env: options.env });

  await app.register(cors, {
    origin: options.env.CORS_ORIGINS,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['content-type', REQUEST_ID_HEADER],
    exposedHeaders: ['location', REQUEST_ID_HEADER],
    credentials: false,
    maxAge: CORS_MAX_AGE_SECONDS,
  });

  // Registered before the routes so that it sees every route schema.
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Bear API',
        version: options.env.APP_VERSION ?? 'dev',
      },
      tags: [
        { name: 'bears', description: 'Bear species from Wikipedia' },
        { name: 'comments', description: 'Comments on a bear' },
        { name: 'health', description: 'Operations' },
      ],
    },
    transform: jsonSchemaTransform,
    transformObject,
  });
  await app.register(swaggerUi, { routePrefix: '/api/docs' });
  app.decorate(
    'bearService',
    createBearService(
      createWikipediaClient(options.env, options.fetch ?? globalThis.fetch),
      app.log
    )
  );
  app.decorate('commentStore', createCommentService(app.bearService));

  await app.register(healthRoutes, { ping: options.ping });
  await app.register(bearRoutes);
  await app.register(commentRoutes);
  if (options.env.ENABLE_DEBUG_ROUTES) {
    await app.register(debugRoutes);
  }

  return app;
}
