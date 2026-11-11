import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { buildApp } from '../src/app.js';
import { Problem } from '../src/schemas/problem.js';
import { loadEnv } from '../src/schemas/env.js';
import { captureLogs } from './capture-logs.js';
import { fakeWikipedia, type FakeWikipediaOptions } from './fake-wikipedia.js';

const PROBLEMS = 'https://bears.example/problems';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/v;

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
});

async function start(
  options: {
    wiki?: FakeWikipediaOptions;
    env?: Record<string, string>;
  } = {}
): Promise<FastifyInstance> {
  app = await buildApp({
    env: loadEnv(options.env ?? {}),
    fetch: fakeWikipedia(options.wiki).fetch,
  });
  return app;
}

function expectProblem(res: LightMyRequestResponse, status: number): Problem {
  expect(res.statusCode).toBe(status);
  expect(res.headers['content-type']).toMatch(/^application\/problem\+json/v);
  const requestId = String(res.headers['x-request-id']);
  expect(requestId).toMatch(UUID);
  const problem = Problem.parse(res.json());
  expect(problem.status).toBe(status);
  expect(problem.instance).toBe(`urn:uuid:${requestId}`);
  return problem;
}

describe('Problem Details (RFC 9457)', () => {
  it('400 for a zod validation error, with errors[] naming the field', async () => {
    const res = await (
      await start()
    ).inject({
      method: 'POST',
      url: '/api/bears/ursus-arctos/comments',
      payload: { author: '', text: 'x' },
    });

    const problem = expectProblem(res, 400);
    expect(problem.type).toBe(`${PROBLEMS}/validation`);
    expect(problem.errors?.[0]).toEqual({
      path: 'author',
      message: 'author must not be empty',
    });
  });

  it('400 with a readable message for an over-long author', async () => {
    const res = await (
      await start()
    ).inject({
      method: 'POST',
      url: '/api/bears/ursus-arctos/comments',
      payload: { author: 'a'.repeat(81), text: 'x' },
    });

    expect(expectProblem(res, 400).errors?.[0]).toEqual({
      path: 'author',
      message: 'author must be at most 80 characters',
    });
  });

  it('400 for an invalid path parameter', async () => {
    const res = await (
      await start()
    ).inject({ method: 'GET', url: '/api/bears/Not_A_Slug' });

    const problem = expectProblem(res, 400);
    expect(problem.errors?.[0]?.path).toBe('id');
  });

  it('400 for a malformed JSON body', async () => {
    const res = await (
      await start()
    ).inject({
      method: 'POST',
      url: '/api/bears/ursus-arctos/comments',
      headers: { 'content-type': 'application/json' },
      payload: '{',
    });

    expect(expectProblem(res, 400).type).toBe(`${PROBLEMS}/validation`);
  });

  it('415 for a text/plain body', async () => {
    const res = await (
      await start()
    ).inject({
      method: 'POST',
      url: '/api/bears/ursus-arctos/comments',
      headers: { 'content-type': 'text/plain' },
      payload: 'hello',
    });

    expect(expectProblem(res, 415).type).toBe(
      `${PROBLEMS}/unsupported-media-type`
    );
  });

  it('404 for an unknown bear', async () => {
    const res = await (
      await start()
    ).inject({ method: 'GET', url: '/api/bears/no-such-bear' });

    const problem = expectProblem(res, 404);
    expect(problem.type).toBe(`${PROBLEMS}/not-found`);
    expect(problem.detail).toContain('no-such-bear');
  });

  it('404 for an unknown route', async () => {
    const res = await (await start()).inject({ method: 'GET', url: '/nope' });

    expect(expectProblem(res, 404).type).toBe(`${PROBLEMS}/not-found`);
  });

  it('502 for an unreachable upstream, without internals', async () => {
    const res = await (
      await start({ wiki: { parse: new TypeError('fetch failed') } })
    ).inject({ method: 'GET', url: '/api/bears' });

    const problem = expectProblem(res, 502);
    expect(problem.type).toBe(`${PROBLEMS}/upstream`);
    expect(res.payload).not.toMatch(/fetch failed|wikipedia\.org|api\.php/iv);
  });

  it('504 for an upstream timeout', async () => {
    const res = await (
      await start({ wiki: { parse: new DOMException('t', 'TimeoutError') } })
    ).inject({ method: 'GET', url: '/api/bears' });

    expect(expectProblem(res, 504).type).toBe(`${PROBLEMS}/upstream-timeout`);
  });

  it('503 with Retry-After when the upstream throttles', async () => {
    const res = await (
      await start({
        wiki: { parse: { status: 429, headers: { 'retry-after': '30' } } },
      })
    ).inject({ method: 'GET', url: '/api/bears' });

    expect(expectProblem(res, 503).type).toBe(`${PROBLEMS}/upstream-throttled`);
    expect(res.headers['retry-after']).toBe('30');
  });

  it('500 hides the message and stack of an unexpected error', async () => {
    const res = await (
      await start({ env: { ENABLE_DEBUG_ROUTES: 'true' } })
    ).inject({ method: 'GET', url: '/api/debug/boom' });

    const problem = expectProblem(res, 500);
    expect(problem.type).toBe(`${PROBLEMS}/internal`);
    expect(problem.detail).toBe('An unexpected error occurred.');
    expect(res.payload).not.toMatch(/secret|\/srv|stack/v);
  });

  it('has no debug route unless enabled', async () => {
    const res = await (
      await start()
    ).inject({ method: 'GET', url: '/api/debug/boom' });

    expectProblem(res, 404);
  });
});

describe('request ids', () => {
  it('sends an x-request-id on successful responses too', async () => {
    const res = await (await start()).inject({ method: 'GET', url: '/health' });

    expect(String(res.headers['x-request-id'])).toMatch(UUID);
  });

  it('reuses a valid incoming x-request-id', async () => {
    const id = '6f2b0c1e-8d1a-4f43-9a8e-2f1d2a9b7c55';
    const res = await (
      await start()
    ).inject({
      method: 'GET',
      url: '/api/bears/no-such-bear',
      headers: { 'x-request-id': id },
    });

    expect(res.headers['x-request-id']).toBe(id);
    expect(expectProblem(res, 404).instance).toBe(`urn:uuid:${id}`);
  });

  it('replaces an incoming x-request-id that is not a UUID', async () => {
    const res = await (
      await start()
    ).inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-request-id': '<script>alert(1)</script>' },
    });

    expect(String(res.headers['x-request-id'])).toMatch(UUID);
  });

  it('writes the request id into the error log line', async () => {
    const { stream, lines } = captureLogs();
    app = await buildApp({
      env: loadEnv({}),
      fetch: fakeWikipedia({ parse: new TypeError('fetch failed') }).fetch,
      logger: { level: 'info', stream },
    });

    const res = await app.inject({ method: 'GET', url: '/api/bears' });

    const requestId = String(res.headers['x-request-id']);
    expect(
      lines.some((line) => line.reqId === requestId && line.level === 50)
    ).toBe(true);
  });
});
