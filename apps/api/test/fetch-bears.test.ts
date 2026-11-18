import { describe, expect, it, vi } from 'vitest';
import {
  UpstreamError,
  UpstreamThrottledError,
  UpstreamTimeoutError,
} from '../src/errors.js';
import { loadEnv } from '../src/schemas/env.js';
import { fetchBearsFromWikipedia } from '../src/services/fetch-bears.js';
import { createWikipediaClient } from '../src/upstream/wikipedia.js';
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

function setup(options: FakeWikipediaOptions = {}): {
  fake: ReturnType<typeof fakeWikipedia>;
  warn: ReturnType<typeof vi.fn<(obj: unknown, msg?: string) => void>>;
  run: () => ReturnType<typeof fetchBearsFromWikipedia>;
} {
  const fake = fakeWikipedia(options);
  const warn = vi.fn<(obj: unknown, msg?: string) => void>();
  return {
    fake,
    warn,
    run: async () =>
      await fetchBearsFromWikipedia(createWikipediaClient(env, fake.fetch), {
        warn,
      }),
  };
}

describe('fetchBearsFromWikipedia', () => {
  it('returns 8 bears with image and intro', async () => {
    const bears = await setup().run();

    expect(bears).toHaveLength(8);
    expect(bears[0]).toMatchObject({
      id: 'ailuropoda-melanoleuca',
      name: 'Giant panda',
      binomial: 'Ailuropoda melanoleuca',
      intro: 'An intro.',
    });
    expect(bears[0]?.imageUrl).toMatch(/^https:\/\/upload\.wikimedia\.org\//v);
  });

  it('fetches one intro per bear', async () => {
    const { fake, run } = setup({
      intro: (title) => introReply(title, `About ${title}.`),
    });
    const bears = await run();

    const introCalls = fake.calls.filter(
      ({ url }) => url.searchParams.get('prop') === 'extracts'
    );
    expect(introCalls).toHaveLength(8);
    expect(bears.find((bear) => bear.id === 'ursus-arctos')?.intro).toBe(
      'About Brown bear.'
    );
  });

  it('keeps a bear whose intro fails, with an empty intro', async () => {
    const { warn, run } = setup({
      intro: (title) =>
        title === 'Brown bear'
          ? new TypeError('fetch failed')
          : introReply(title, 'An intro.'),
    });
    const bears = await run();

    expect(bears).toHaveLength(8);
    expect(bears.find((bear) => bear.id === 'ursus-arctos')?.intro).toBe('');
    expect(bears[0]?.intro).toBe('An intro.');
    expect(warn).toHaveBeenCalled();
  });

  it('keeps a bear whose image is missing, with imageUrl null', async () => {
    const bears = await setup({
      images: imagesWithout('File:Grosser Panda.JPG'),
    }).run();

    expect(bears[0]?.imageUrl).toBeNull();
    expect(bears[1]?.imageUrl).not.toBeNull();
  });

  it('keeps all bears when the image lookup itself fails', async () => {
    const bears = await setup({ images: { status: 500 } }).run();

    expect(bears).toHaveLength(8);
    expect(bears.every((bear) => bear.imageUrl === null)).toBe(true);
  });

  it('throws UpstreamError when Wikipedia is unreachable', async () => {
    await expect(
      setup({ parse: new TypeError('fetch failed') }).run()
    ).rejects.toBeInstanceOf(UpstreamError);
  });

  it.each([
    ['an error body', { body: { error: { code: 'x', info: 'y' } } }],
    ['a 5xx', { status: 503 }],
    ['a page without bears', { body: { parse: { wikitext: 'nothing here' } } }],
  ])('throws UpstreamError for %s', async (_case, parse) => {
    await expect(setup({ parse }).run()).rejects.toBeInstanceOf(UpstreamError);
  });

  it('throws UpstreamTimeoutError when Wikipedia times out', async () => {
    await expect(
      setup({ parse: new DOMException('timed out', 'TimeoutError') }).run()
    ).rejects.toBeInstanceOf(UpstreamTimeoutError);
  });

  it('throws UpstreamThrottledError with the Retry-After seconds', async () => {
    await expect(
      setup({
        parse: { status: 429, headers: { 'retry-after': '30' } },
      }).run()
    ).rejects.toMatchObject({
      constructor: UpstreamThrottledError,
      retryAfterSeconds: 30,
    });
  });

  it('sends the User-Agent, a timeout signal and formatversion=2', async () => {
    const { fake, run } = setup();
    await run();

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
    const { fake, run } = setup();
    await run();

    const imageCalls = fake.calls.filter(
      ({ url }) => url.searchParams.get('prop') === 'imageinfo'
    );
    expect(imageCalls).toHaveLength(1);
    expect(
      imageCalls[0]?.url.searchParams.get('titles')?.split('|')
    ).toHaveLength(8);
  });
});
