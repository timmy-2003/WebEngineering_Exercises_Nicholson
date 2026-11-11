import { readFileSync } from 'node:fs';
import { z } from 'zod';

const fixture = (name: string): unknown =>
  JSON.parse(
    readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
  );

export const ursidsFixture = z
  .object({ parse: z.looseObject({ wikitext: z.string() }) })
  .parse(fixture('ursids-section3.json'));

export const imageInfoFixture = z
  .object({
    query: z.object({ pages: z.array(z.looseObject({ title: z.string() })) }),
  })
  .parse(fixture('imageinfo.json'));

export type FakeReply =
  Error | { status?: number; body?: unknown; headers?: Record<string, string> };

export interface FakeWikipediaOptions {
  parse?: FakeReply;
  images?: FakeReply;
  intro?: FakeReply;
}

export interface RecordedCall {
  url: URL;
  init: RequestInit | undefined;
}

export function introReply(title: string, extract: string): FakeReply {
  return { body: { query: { pages: [{ title, extract }] } } };
}

export function imagesWithout(fileTitle: string): FakeReply {
  return {
    body: {
      query: {
        pages: imageInfoFixture.query.pages.map((page) =>
          page.title === fileTitle ? { title: page.title, missing: true } : page
        ),
      },
    },
  };
}

export function fakeWikipedia(options: FakeWikipediaOptions = {}): {
  fetch: typeof globalThis.fetch;
  calls: RecordedCall[];
} {
  const calls: RecordedCall[] = [];

  const reply = async (fake: FakeReply): Promise<Response> => {
    if (fake instanceof Error) {
      throw fake;
    }
    return await Promise.resolve(
      new Response(JSON.stringify(fake.body ?? {}), {
        status: fake.status ?? 200,
        headers: { 'content-type': 'application/json', ...fake.headers },
      })
    );
  };

  const fetchStub = async (
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : input);
    calls.push({ url, init });
    const { searchParams } = url;

    if (searchParams.get('action') === 'parse') {
      return await reply(options.parse ?? { body: ursidsFixture });
    }
    if (searchParams.get('prop') === 'imageinfo') {
      return await reply(options.images ?? { body: imageInfoFixture });
    }
    if (searchParams.get('prop') === 'extracts') {
      return await reply(
        options.intro ??
          introReply(searchParams.get('titles') ?? '', 'An intro.')
      );
    }
    return await reply({ status: 404 });
  };

  return { fetch: fetchStub, calls };
}
