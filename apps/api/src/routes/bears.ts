import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import { BearDetail, BearIdParams, BearList } from '../schemas/bear.js';
import { problemResponses } from '../schemas/problem.js';

export const bearRoutes: FastifyPluginCallbackZod = (app, _opts, done) => {
  app.get(
    '/api/bears',
    {
      schema: {
        tags: ['bears'],
        summary: 'List all bears',
        response: {
          200: BearList,
          ...problemResponses('internal'),
        },
      },
    },
    async () => ({
      items: await app.bearService.list(),
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
