import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { BearIdParams } from '../schemas/bear.js';
import {
  Comment,
  CommentIdParams,
  CommentList,
  NewComment,
} from '../schemas/comment.js';
import { problemResponses, UPSTREAM_PROBLEMS } from '../schemas/problem.js';

const HTTP_CREATED = 201;
const HTTP_NO_CONTENT = 204;

export const commentRoutes: FastifyPluginCallbackZod = (app, _opts, done) => {
  app.get(
    '/api/bears/:id/comments',
    {
      schema: {
        tags: ['comments'],
        summary: 'List the comments of a bear',
        params: BearIdParams,
        response: {
          200: CommentList,
          ...problemResponses(
            'validation',
            'not-found',
            'internal',
            ...UPSTREAM_PROBLEMS
          ),
        },
      },
    },
    async (req) => ({
      items: await app.commentStore.list(req.params.id),
      nextCursor: null,
    })
  );

  app.post(
    '/api/bears/:id/comments',
    {
      schema: {
        tags: ['comments'],
        summary: 'Add a comment to a bear',
        params: BearIdParams,
        body: NewComment,
        response: {
          [HTTP_CREATED]: Comment,
          ...problemResponses(
            'validation',
            'not-found',
            'unsupported-media-type',
            'internal',
            ...UPSTREAM_PROBLEMS
          ),
        },
      },
    },
    async (req, reply) => {
      const comment = await app.commentStore.create(req.params.id, req.body);
      return await reply
        .code(HTTP_CREATED)
        .header('location', `/api/comments/${comment.id}`)
        .send(comment);
    }
  );

  app.get(
    '/api/comments/:commentId',
    {
      schema: {
        tags: ['comments'],
        summary: 'Get one comment',
        params: CommentIdParams,
        response: {
          200: Comment,
          ...problemResponses('validation', 'not-found', 'internal'),
        },
      },
    },
    (req) => app.commentStore.get(req.params.commentId)
  );

  app.delete(
    '/api/comments/:commentId',
    {
      schema: {
        tags: ['comments'],
        summary: 'Delete a comment',
        params: CommentIdParams,
        response: {
          [HTTP_NO_CONTENT]: z.null().describe('No content'),
          ...problemResponses('validation', 'not-found', 'internal'),
        },
      },
    },
    async (req, reply) => {
      app.commentStore.remove(req.params.commentId);
      return await reply.code(HTTP_NO_CONTENT).send(null);
    }
  );

  done();
};
