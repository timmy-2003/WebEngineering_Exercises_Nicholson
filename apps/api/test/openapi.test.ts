import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { testApp } from './helpers.js';
import { loadEnv } from '../src/schemas/env.js';

const env = loadEnv({ USER_AGENT: 'BearApp/0.1 (test)' });

const OpenApiDocument = z.object({
  openapi: z.string(),
  paths: z.record(z.string(), z.record(z.string(), z.unknown())),
  components: z.object({
    schemas: z.record(
      z.string(),
      z.object({ properties: z.record(z.string(), z.unknown()) })
    ),
  }),
});

let app: FastifyInstance;
let text: string;
let doc: z.infer<typeof OpenApiDocument>;

beforeAll(async () => {
  app = await testApp({ env });
  const res = await app.inject({ method: 'GET', url: '/api/docs/json' });
  expect(res.statusCode).toBe(200);
  ({ body: text } = res);
  doc = OpenApiDocument.parse(res.json());
});

afterAll(async () => {
  await app.close();
});

describe('OpenAPI document', () => {
  it('document is OpenAPI 3.1', () => {
    expect(doc.openapi.startsWith('3.1')).toBe(true);
  });

  it('lists every route', () => {
    expect(doc.paths['/health']).toHaveProperty('get');
    expect(doc.paths['/api/bears']).toHaveProperty('get');
    expect(doc.paths['/api/bears/{id}']).toHaveProperty('get');
    expect(doc.paths['/api/bears/{id}/comments']).toHaveProperty('get');
    expect(doc.paths['/api/bears/{id}/comments']).toHaveProperty('post');
    expect(doc.paths['/api/comments/{commentId}']).toHaveProperty('get');
    expect(doc.paths['/api/comments/{commentId}']).toHaveProperty('delete');
  });

  it('hides the debug and docs routes', () => {
    expect(Object.keys(doc.paths).some((p) => p.includes('docs'))).toBe(false);
    expect(doc.paths).not.toHaveProperty('/api/debug/boom');
  });

  it('has no unreferenced input components', () => {
    expect(Object.keys(doc.components.schemas)).toEqual(['Problem']);
  });

  it('Problem schema present', () => {
    expect(text).toContain('"application/problem+json"');
    expect(
      Object.keys(doc.components.schemas.Problem?.properties ?? {})
    ).toEqual(
      expect.arrayContaining(['type', 'title', 'status', 'detail', 'instance'])
    );

    const badRequest = z
      .object({
        responses: z.object({
          400: z.object({
            content: z.object({
              'application/problem+json': z.object({
                schema: z.object({ $ref: z.string() }),
              }),
            }),
          }),
        }),
      })
      .parse(doc.paths['/api/bears/{id}/comments']?.post);
    expect(
      badRequest.responses[400].content['application/problem+json'].schema.$ref
    ).toBe('#/components/schemas/Problem');
  });
});
