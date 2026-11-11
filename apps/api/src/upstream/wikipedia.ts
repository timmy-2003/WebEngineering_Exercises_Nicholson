import { z } from 'zod';
import {
  UpstreamError,
  UpstreamThrottledError,
  UpstreamTimeoutError,
} from '../errors.js';
import type { Env } from '../schemas/env.js';

const HTTP_TOO_MANY_REQUESTS = 429;
const DEFAULT_RETRY_AFTER_SECONDS = 60;
const MS_PER_SECOND = 1000;
const URSIDS_PAGE = 'List_of_ursids';
const URSIDS_SECTION = '3';

const WikiApiError = z.object({ error: z.object({ info: z.string() }) });

const ParseResponse = z.object({
  parse: z.object({ wikitext: z.string() }),
});

const ImageInfoResponse = z.object({
  query: z.object({
    normalized: z
      .array(z.object({ from: z.string(), to: z.string() }))
      .optional(),
    pages: z.array(
      z.object({
        title: z.string(),
        imageinfo: z.array(z.object({ url: z.url() })).optional(),
      })
    ),
  }),
});

const ExtractResponse = z.object({
  query: z.object({
    pages: z.array(z.object({ extract: z.string().optional() })),
  }),
});

export interface WikipediaClient {
  fetchUrsidsWikitext: () => Promise<string>;
  fetchImageUrls: (
    fileNames: readonly string[]
  ) => Promise<Map<string, string>>;
  fetchIntro: (title: string) => Promise<string>;
}

function parseRetryAfter(header: string | null): number {
  if (header === null) {
    return DEFAULT_RETRY_AFTER_SECONDS;
  }
  const seconds = Number(header);
  if (Number.isInteger(seconds) && seconds >= 0) {
    return seconds;
  }
  const date = Date.parse(header);
  return Number.isNaN(date)
    ? DEFAULT_RETRY_AFTER_SECONDS
    : Math.max(0, Math.ceil((date - Date.now()) / MS_PER_SECOND));
}

function isTimeout(err: unknown): boolean {
  return err instanceof Error && err.name === 'TimeoutError';
}

export function createWikipediaClient(
  env: Env,
  fetchFn: typeof globalThis.fetch
): WikipediaClient {
  async function fetchBody(url: URL): Promise<unknown> {
    try {
      const res = await fetchFn(url, {
        headers: { 'User-Agent': env.USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(env.UPSTREAM_TIMEOUT_MS),
      });
      if (res.status === HTTP_TOO_MANY_REQUESTS) {
        throw new UpstreamThrottledError(
          'Wikipedia is throttling requests',
          parseRetryAfter(res.headers.get('retry-after'))
        );
      }
      if (!res.ok) {
        throw new UpstreamError(`Wikipedia answered ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      if (
        err instanceof UpstreamError ||
        err instanceof UpstreamThrottledError
      ) {
        throw err;
      }
      if (isTimeout(err)) {
        throw new UpstreamTimeoutError('Wikipedia did not answer in time', {
          cause: err,
        });
      }
      throw new UpstreamError('Wikipedia could not be reached', { cause: err });
    }
  }

  async function call<T>(
    params: Record<string, string>,
    schema: z.ZodType<T>
  ): Promise<T> {
    const url = new URL('/w/api.php', env.WIKIPEDIA_BASE_URL);
    url.search = new URLSearchParams({
      ...params,
      format: 'json',
      formatversion: '2',
    }).toString();

    const body = await fetchBody(url);
    const apiError = WikiApiError.safeParse(body);
    if (apiError.success) {
      throw new UpstreamError(
        `Wikipedia API error: ${apiError.data.error.info}`
      );
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new UpstreamError('Unexpected Wikipedia response', {
        cause: parsed.error,
      });
    }
    return parsed.data;
  }

  return {
    async fetchUrsidsWikitext() {
      const data = await call(
        {
          action: 'parse',
          page: URSIDS_PAGE,
          prop: 'wikitext',
          section: URSIDS_SECTION,
        },
        ParseResponse
      );
      return data.parse.wikitext;
    },

    async fetchImageUrls(fileNames) {
      const titles = fileNames.map((fileName) => `File:${fileName}`);
      const { query } = await call(
        {
          action: 'query',
          prop: 'imageinfo',
          iiprop: 'url',
          titles: titles.join('|'),
        },
        ImageInfoResponse
      );

      const normalized = new Map(
        (query.normalized ?? []).map(({ from, to }) => [from, to])
      );
      const urlByTitle = new Map(
        query.pages.flatMap((page) => {
          const url = page.imageinfo?.[0]?.url;
          return url === undefined ? [] : [[page.title, url] as const];
        })
      );

      const result = new Map<string, string>();
      fileNames.forEach((fileName, index) => {
        const title = titles[index] ?? '';
        const url = urlByTitle.get(normalized.get(title) ?? title);
        if (url !== undefined) {
          result.set(fileName, url);
        }
      });
      return result;
    },

    async fetchIntro(title) {
      const { query } = await call(
        {
          action: 'query',
          prop: 'extracts',
          exintro: '1',
          explaintext: '1',
          redirects: '1',
          titles: title,
        },
        ExtractResponse
      );
      return query.pages[0]?.extract?.trim() ?? '';
    },
  };
}
