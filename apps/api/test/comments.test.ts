import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { testApp } from './helpers.js';
import { Comment, CommentList } from '../src/schemas/comment.js';
import { loadEnv } from '../src/schemas/env.js';
import { fakeWikipedia } from './fake-wikipedia.js';

const env = loadEnv({ USER_AGENT: 'BearApp/0.1 (test)' });

let app: FastifyInstance;

beforeEach(async () => {
  app = await testApp({ env, fetch: fakeWikipedia().fetch });
});

afterEach(async () => {
  await app.close();
});

async function post(
  bearId: string,
  payload: Record<string, unknown>
): Promise<LightMyRequestResponse> {
  return await app.inject({
    method: 'POST',
    url: `/api/bears/${bearId}/comments`,
    payload,
  });
}

async function list(bearId: string): Promise<Comment[]> {
  const res = await app.inject({
    method: 'GET',
    url: `/api/bears/${bearId}/comments`,
  });
  expect(res.statusCode).toBe(200);
  const body = CommentList.parse(res.json());
  expect(body.nextCursor).toBeNull();
  return body.items;
}

describe('POST /api/bears/:id/comments', () => {
  it('creates a comment: 201 with Location, trimmed fields', async () => {
    const res = await post('ursus-arctos', { author: ' Ada ', text: 'Hi' });

    expect(res.statusCode).toBe(201);
    const comment = Comment.parse(res.json());
    expect(res.headers.location).toBe(`/api/comments/${comment.id}`);
    expect(comment).toMatchObject({
      bearId: 'ursus-arctos',
      author: 'Ada',
      text: 'Hi',
    });
  });

  it('makes the Location URI resolvable', async () => {
    const created = await post('ursus-arctos', { author: 'Ada', text: 'Hi' });
    const res = await app.inject({
      method: 'GET',
      url: String(created.headers.location),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(created.json());
  });

  it('rejects a whitespace-only author with 400', async () => {
    const res = await post('ursus-arctos', { author: '   ', text: 'x' });

    expect(res.statusCode).toBe(400);
  });

  it('rejects text over 2000 characters with 400', async () => {
    const res = await post('ursus-arctos', {
      author: 'Ada',
      text: 'x'.repeat(2001),
    });

    expect(res.statusCode).toBe(400);
  });

  it('accepts text of exactly 2000 characters', async () => {
    const res = await post('ursus-arctos', {
      author: 'Ada',
      text: 'x'.repeat(2000),
    });

    expect(res.statusCode).toBe(201);
  });

  it('rejects an author over 80 characters with 400', async () => {
    const res = await post('ursus-arctos', {
      author: 'a'.repeat(81),
      text: 'x',
    });

    expect(res.statusCode).toBe(400);
  });

  it('rejects a body without fields with 400', async () => {
    expect((await post('ursus-arctos', {})).statusCode).toBe(400);
  });

  it('is 404 for an unknown bear', async () => {
    const res = await post('no-such-bear', { author: 'Ada', text: 'Hi' });

    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/bears/:id/comments', () => {
  it('lists comments in creation order', async () => {
    await post('ursus-arctos', { author: 'Ada', text: 'first' });
    await post('ursus-arctos', { author: 'Bob', text: 'second' });

    expect((await list('ursus-arctos')).map((c) => c.text)).toEqual([
      'first',
      'second',
    ]);
  });

  it('keeps comments per bear', async () => {
    await post('ursus-arctos', { author: 'Ada', text: 'brown' });

    expect(await list('ursus-maritimus')).toEqual([]);
  });

  it('is 404 for an unknown bear', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/bears/no-such-bear/comments',
    });

    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /api/comments/:commentId', () => {
  it('returns 204 with an empty body and removes the comment', async () => {
    const { id } = Comment.parse(
      (await post('ursus-arctos', { author: 'Ada', text: 'Hi' })).json()
    );

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/comments/${id}`,
    });

    expect(res.statusCode).toBe(204);
    expect(res.payload).toBe('');
    expect(await list('ursus-arctos')).toEqual([]);
    expect(
      (await app.inject({ method: 'GET', url: `/api/comments/${id}` }))
        .statusCode
    ).toBe(404);
  });

  it('answers a second DELETE with 404', async () => {
    const { id } = Comment.parse(
      (await post('ursus-arctos', { author: 'Ada', text: 'Hi' })).json()
    );
    await app.inject({ method: 'DELETE', url: `/api/comments/${id}` });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/comments/${id}`,
    });

    expect(res.statusCode).toBe(404);
  });

  it('rejects an id that is not a UUID with 400', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/comments/abc',
    });

    expect(res.statusCode).toBe(400);
  });
});
