import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import {
  BearDetail,
  BearIdParams,
  BearList,
  BearListQuery,
} from '../schemas/bear.js';
import { problemResponses } from '../schemas/problem.js';

export const bearRoutes: FastifyPluginCallbackZod = (app, _opts, done) => {
  app.get(
    '/api/bears',
    {
      schema: {
        tags: ['bears'],
        summary: 'List bears, optionally filtered by name',
        querystring: BearListQuery,
        response: {
          200: BearList,
          ...problemResponses('validation', 'internal'),
        },
      },
    },
    async (req) => ({
      items: await app.bearService.list(req.query.q),
      nextCursor: null,
    })
  );

  app.get(
    '/api/bears/:id',
    {
      schema: {
        tags: ['bears'],
        summary: 'Get one bear with its stored Wikipedia introduction',
        params: BearIdParams,
        response: {
          200: BearDetail,
          ...problemResponses('validation', 'not-found', 'internal'),
        },
      },
    },
    async (req) => await app.bearService.get(req.params.id)
  );

  done();
};
