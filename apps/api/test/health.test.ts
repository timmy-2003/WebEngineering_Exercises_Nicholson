import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadEnv } from '../src/schemas/env.js';

const USER_AGENT = 'BearApp/0.1 (test)';

describe('GET /health', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it('returns 200 JSON with status, version, uptime', async () => {
    app = await buildApp({ env: loadEnv({ USER_AGENT }) });
    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/v);
    const body = res.json<{
      status: string;
      version: string;
      uptime: number;
    }>();
    expect(body.status).toBe('ok');
    expect(body.version).toBe('dev');
    expect(Number.isInteger(body.uptime)).toBe(true);
  });

  it('reports APP_VERSION', async () => {
    app = await buildApp({
      env: loadEnv({ USER_AGENT, APP_VERSION: '1.2.3' }),
    });
    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.json<{ version: string }>().version).toBe('1.2.3');
  });
});

describe('loadEnv', () => {
  it('rejects an invalid PORT', () => {
    expect(() => loadEnv({ USER_AGENT, PORT: 'abc' })).toThrow();
  });

  it('falls back to a descriptive default USER_AGENT (clean clone must start)', () => {
    expect(loadEnv({}).USER_AGENT).toMatch(/^BearApp\/0\.1 \(.+\)$/v);
  });

  it('rejects a blank USER_AGENT', () => {
    expect(() => loadEnv({ USER_AGENT: '  ' })).toThrow(/USER_AGENT/v);
  });

  it('applies defaults', () => {
    const env = loadEnv({ USER_AGENT });
    expect(env).toMatchObject({
      PORT: 3000,
      HOST: '0.0.0.0',
      WIKIPEDIA_BASE_URL: 'https://en.wikipedia.org',
      UPSTREAM_TIMEOUT_MS: 5000,
      CORS_ORIGINS: ['http://localhost:4173'],
      ENABLE_DEBUG_ROUTES: false,
    });
  });
});
