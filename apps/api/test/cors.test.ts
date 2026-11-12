import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadEnv } from '../src/schemas/env.js';
import { fakeWikipedia } from './fake-wikipedia.js';

const ALLOWED = 'http://localhost:4173';
const env = loadEnv({
  USER_AGENT: 'BearApp/0.1 (test)',
  CORS_ORIGINS: ALLOWED,
});
const COMMENT_URL = '/api/comments/0b7c3c3e-8f7a-4d4e-9a39-2f0e5b8f6a10';

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildApp({ env, fetch: fakeWikipedia().fetch });
});

afterEach(async () => {
  await app.close();
});

describe('CORS', () => {
  it('preflight DELETE from allowed origin', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: COMMENT_URL,
      headers: {
        origin: ALLOWED,
        'access-control-request-method': 'DELETE',
      },
    });

    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED);
    expect(res.headers['access-control-allow-methods']).toContain('DELETE');
    expect(res.headers['access-control-max-age']).toBe('600');
    expect(res.headers.vary).toContain('Origin');
  });

  it('preflight JSON POST', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/api/bears/ursus-arctos/comments',
      headers: {
        origin: ALLOWED,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });

    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-headers']).toContain(
      'content-type'
    );
  });

  it('disallowed origin gets no allow header', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: COMMENT_URL,
      headers: {
        origin: 'https://evil.example',
        'access-control-request-method': 'DELETE',
      },
    });

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('exposes location and x-request-id', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/bears/ursus-arctos/comments',
      headers: { origin: ALLOWED },
      payload: { author: 'Ada', text: 'Hi' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED);
    const exposed = String(res.headers['access-control-expose-headers']);
    expect(exposed).toContain('location');
    expect(exposed).toContain('x-request-id');
  });
});
