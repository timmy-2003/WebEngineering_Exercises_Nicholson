import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { BearDetail, BearList } from '../src/schemas/bear.js';
import { testApp, testBears } from './helpers.js';

let app: FastifyInstance;

beforeEach(async () => {
  app = await testApp();
});

afterEach(async () => {
  await app.close();
  vi.unstubAllGlobals();
});

async function get(url: string): Promise<LightMyRequestResponse> {
  return await app.inject({ method: 'GET', url });
}

describe('GET /api/bears', () => {
  it('returns the stored bears in an envelope', async () => {
    const res = await get('/api/bears');

    expect(res.statusCode).toBe(200);
    const body = BearList.parse(res.json());
    expect(body.nextCursor).toBeNull();
    expect(body.items.map((bear) => bear.id)).toEqual(
      testBears.map((bear) => bear.id)
    );
    expect(body.items[0]).not.toHaveProperty('intro');
  });

  it('is an empty list before the seed has run', async () => {
    const empty = await testApp({ bears: [] });
    const res = await empty.inject({ method: 'GET', url: '/api/bears' });
    await empty.close();

    expect(BearList.parse(res.json()).items).toEqual([]);
  });
});

describe('GET /api/bears/:id', () => {
  it('returns the bear with its stored intro', async () => {
    const res = await get('/api/bears/ursus-arctos');

    expect(res.statusCode).toBe(200);
    expect(BearDetail.parse(res.json())).toEqual(testBears[1]);
  });

  it('is 404 for an unknown bear', async () => {
    expect((await get('/api/bears/no-such-bear')).statusCode).toBe(404);
  });

  it('is 400 for an id that is not a slug', async () => {
    expect((await get('/api/bears/Ursus_arctos')).statusCode).toBe(400);
  });
});

describe('read path', () => {
  it('never calls Wikipedia', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await get('/api/bears');
    await get('/api/bears/ursus-arctos');

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
