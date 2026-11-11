const baseUrl = 'https://en.wikipedia.org/w/api.php';

async function fetchJson(
  params: Record<string, string | number>,
  signal: AbortSignal
): Promise<unknown> {
  const searchParams = new URLSearchParams({ format: 'json', origin: '*' });
  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, String(value));
  }

  const res = await fetch(`${baseUrl}?${searchParams.toString()}`, { signal });

  if (!res.ok) {
    throw new Error(`Wikipedia API request failed with status ${res.status}`);
  }

  return await res.json();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

interface WikiApiError {
  error: {
    code: string;
    info: string;
  };
}

function isWikiApiError(data: unknown): data is WikiApiError {
  return isObject(data) && isObject(data['error']);
}

function assertNoApiError(data: unknown): void {
  if (isWikiApiError(data)) {
    throw new Error(`Wikipedia API error: ${data.error.info}`);
  }
}

interface ParseWikitextResponse {
  parse: {
    wikitext: {
      '*': string;
    };
  };
}

function isParseWikitextResponse(data: unknown): data is ParseWikitextResponse {
  if (!isObject(data)) {
    return false;
  }
  const { parse } = data;
  if (!isObject(parse)) {
    return false;
  }
  const { wikitext } = parse;
  return isObject(wikitext) && typeof wikitext['*'] === 'string';
}

export async function fetchWikitext(
  title: string,
  section: number,
  signal: AbortSignal
): Promise<string> {
  const data = await fetchJson(
    { action: 'parse', page: title, prop: 'wikitext', section },
    signal
  );

  assertNoApiError(data);
  if (!isParseWikitextResponse(data)) {
    throw new Error('Unexpected Wikipedia API response: missing wikitext.');
  }

  return data.parse.wikitext['*'];
}

interface QueryPagesResponse {
  query: {
    pages: Record<string, unknown>;
  };
}

function isQueryPagesResponse(data: unknown): data is QueryPagesResponse {
  return (
    isObject(data) &&
    isObject(data['query']) &&
    isObject(data['query']['pages'])
  );
}

function firstQueryPage(data: unknown): Record<string, unknown> | undefined {
  assertNoApiError(data);
  if (!isQueryPagesResponse(data)) {
    return undefined;
  }
  const [page] = Object.values(data.query.pages);
  return isObject(page) ? page : undefined;
}

export async function fetchImageUrl(
  fileName: string,
  signal: AbortSignal
): Promise<string> {
  const data = await fetchJson(
    {
      action: 'query',
      titles: `File:${fileName}`,
      prop: 'imageinfo',
      iiprop: 'url',
    },
    signal
  );

  const imageinfo = firstQueryPage(data)?.['imageinfo'];
  const info: unknown = Array.isArray(imageinfo) ? imageinfo[0] : undefined;

  if (!isObject(info) || typeof info['url'] !== 'string') {
    throw new Error(`No image available for "${fileName}"`);
  }

  return info['url'];
}

export async function fetchArticleIntro(
  title: string,
  signal: AbortSignal
): Promise<string> {
  const data = await fetchJson(
    {
      action: 'query',
      titles: title,
      prop: 'extracts',
      exintro: 1,
      explaintext: 1,
      redirects: 1,
    },
    signal
  );

  const extract = firstQueryPage(data)?.['extract'];
  return typeof extract === 'string' ? extract.trim() : '';
}
