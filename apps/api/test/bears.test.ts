import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { testApp } from './helpers.js';
import { BearDetail, BearList } from '../src/schemas/bear.js';
import { loadEnv } from '../src/schemas/env.js';
import {
  fakeWikipedia,
  imagesWithout,
  introReply,
  type FakeWikipediaOptions,
} from './fake-wikipedia.js';

const env = loadEnv({
  USER_AGENT: 'BearApp/0.1 (test)',
  WIKIPEDIA_BASE_URL: 'https://wiki.test',
});

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
});

async function start(
  options: FakeWikipediaOptions = {}
): Promise<ReturnType<typeof fakeWikipedia>> {
  const fake = fakeWikipedia(options);
  app = await testApp({ env, fetch: fake.fetch });
  return fake;
}

async function get(url: string): Promise<LightMyRequestResponse> {
  if (app === undefined) {
    throw new Error('app not started');
  }
  return await app.inject({ method: 'GET', url });
}

describe('GET /api/bears', () => {
  it('returns 8 validated bears in an envelope', async () => {
    await start();
    const res = await get('/api/bears');

    expect(res.statusCode).toBe(200);
    const body = BearList.parse(res.json());
    expect(body.nextCursor).toBeNull();
    expect(body.items).toHaveLength(8);
    expect(body.items[0]).toMatchObject({
      id: 'ailuropoda-melanoleuca',
      name: 'Giant panda',
      binomial: 'Ailuropoda melanoleuca',
    });
    expect(body.items[0]?.imageUrl).toMatch(
      /^https:\/\/upload\.wikimedia\.org\//v
    );
  });

  it('keeps a bear whose image is missing, with imageUrl null', async () => {
    await start({ images: imagesWithout('File:Grosser Panda.JPG') });
    const body = BearList.parse((await get('/api/bears')).json());

    expect(body.items).toHaveLength(8);
    expect(body.items[0]?.imageUrl).toBeNull();
    expect(body.items[1]?.imageUrl).not.toBeNull();
  });

  it('keeps all bears when the image lookup itself fails', async () => {
    await start({ images: { status: 500 } });
    const res = await get('/api/bears');

    expect(res.statusCode).toBe(200);
    const body = BearList.parse(res.json());
    expect(body.items.every((bear) => bear.imageUrl === null)).toBe(true);
  });

  it('is 502 when Wikipedia is unreachable, never an empty list', async () => {
    await start({ parse: new TypeError('fetch failed') });
    const res = await get('/api/bears');

    expect(res.statusCode).toBe(502);
    expect(Array.isArray(res.json())).toBe(false);
  });

  it('is 502 when Wikipedia answers 200 with an error body', async () => {
    await start({ parse: { body: { error: { code: 'x', info: 'y' } } } });

    expect((await get('/api/bears')).statusCode).toBe(502);
  });

  it('is 502 when Wikipedia answers 5xx', async () => {
    await start({ parse: { status: 503 } });

    expect((await get('/api/bears')).statusCode).toBe(502);
  });

  it('is 502 when the page contains no bears', async () => {
    await start({ parse: { body: { parse: { wikitext: 'nothing here' } } } });

    expect((await get('/api/bears')).statusCode).toBe(502);
  });

  it('is 504 when Wikipedia times out', async () => {
    await start({ parse: new DOMException('timed out', 'TimeoutError') });

    expect((await get('/api/bears')).statusCode).toBe(504);
  });

  it('is 503 with Retry-After when Wikipedia throttles', async () => {
    await start({ parse: { status: 429, headers: { 'retry-after': '30' } } });
    const res = await get('/api/bears');

    expect(res.statusCode).toBe(503);
    expect(res.headers['retry-after']).toBe('30');
  });

  it('sends the User-Agent, a timeout signal and formatversion=2', async () => {
    const fake = await start();
    await get('/api/bears');

    expect(fake.calls.length).toBeGreaterThan(0);
    for (const { url, init } of fake.calls) {
      expect(url.origin).toBe('https://wiki.test');
      expect(url.pathname).toBe('/w/api.php');
      expect(url.searchParams.get('formatversion')).toBe('2');
      expect(new Headers(init?.headers).get('user-agent')).toBe(env.USER_AGENT);
      expect(init?.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it('looks up all images in a single request', async () => {
    const fake = await start();
    await get('/api/bears');

    const imageCalls = fake.calls.filter(
      ({ url }) => url.searchParams.get('prop') === 'imageinfo'
    );
    expect(imageCalls).toHaveLength(1);
    expect(
      imageCalls[0]?.url.searchParams.get('titles')?.split('|')
    ).toHaveLength(8);
  });
});

describe('GET /api/bears/:id', () => {
  it('returns the bear with its Wikipedia intro', async () => {
    await start({ intro: introReply('Brown bear', 'The brown bear is big.') });
    const res = await get('/api/bears/ursus-arctos');

    expect(res.statusCode).toBe(200);
    expect(BearDetail.parse(res.json())).toMatchObject({
      id: 'ursus-arctos',
      name: 'Brown bear',
      binomial: 'Ursus arctos',
      intro: 'The brown bear is big.',
    });
  });

  it('is 404 for an unknown bear', async () => {
    await start();

    expect((await get('/api/bears/no-such-bear')).statusCode).toBe(404);
  });

  it('is 400 for an id that is not a slug', async () => {
    await start();

    expect((await get('/api/bears/Ursus_arctos')).statusCode).toBe(400);
  });

  it('is 502 when the intro lookup fails', async () => {
    await start({ intro: new TypeError('fetch failed') });

    expect((await get('/api/bears/ursus-arctos')).statusCode).toBe(502);
  });
});
