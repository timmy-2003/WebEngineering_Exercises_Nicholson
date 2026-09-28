const baseUrl = 'https://en.wikipedia.org/w/api.php';

async function fetchJson(
  params: Record<string, string | number>
): Promise<unknown> {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, String(value));
  }

  const url = `${baseUrl}?${searchParams.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Wikipedia API request failed with status ${res.status}`);
  }

  return await res.json();
}

interface WikiApiError {
  error: {
    code: string;
    info: string;
  };
}

function isWikiApiError(data: unknown): data is WikiApiError {
  return typeof data === 'object' && data !== null && 'error' in data;
}

interface ParseWikitextResponse {
  parse: {
    wikitext: {
      '*': string;
    };
  };
}

function isParseWikitextResponse(data: unknown): data is ParseWikitextResponse {
  if (typeof data !== 'object' || data === null || !('parse' in data)) {
    return false;
  }
  const { parse } = data;
  if (typeof parse !== 'object' || parse === null || !('wikitext' in parse)) {
    return false;
  }
  const { wikitext } = parse;
  return (
    typeof wikitext === 'object' &&
    wikitext !== null &&
    '*' in wikitext &&
    typeof wikitext['*'] === 'string'
  );
}

export async function fetchBearListWikitext(
  title: string,
  section: number
): Promise<string> {
  const data = await fetchJson({
    action: 'parse',
    page: title,
    prop: 'wikitext',
    section,
    format: 'json',
    origin: '*',
  });

  if (isWikiApiError(data)) {
    throw new Error(`Wikipedia API error: ${data.error.info}`);
  }
  if (!isParseWikitextResponse(data)) {
    throw new Error('Unexpected Wikipedia API response: missing wikitext.');
  }

  return data.parse.wikitext['*'];
}

interface ImageInfoResponse {
  query: {
    pages: Record<
      string,
      {
        title: string;
        missing?: string;
        imageinfo?: Array<{ url: string }>;
      }
    >;
  };
}

function isImageInfoResponse(data: unknown): data is ImageInfoResponse {
  if (typeof data !== 'object' || data === null || !('query' in data)) {
    return false;
  }
  const { query } = data;
  return typeof query === 'object' && query !== null && 'pages' in query;
}

export async function fetchImageUrl(fileName: string): Promise<string> {
  const data = await fetchJson({
    action: 'query',
    titles: `File:${fileName}`,
    prop: 'imageinfo',
    iiprop: 'url',
    format: 'json',
    origin: '*',
  });

  if (isWikiApiError(data)) {
    throw new Error(`Wikipedia API error: ${data.error.info}`);
  }
  if (!isImageInfoResponse(data)) {
    throw new Error(`No image available for "${fileName}"`);
  }

  const [page] = Object.values(data.query.pages);
  const info = page.imageinfo?.[0];

  if (info === undefined) {
    throw new Error(`No image available for "${fileName}"`);
  }

  return info.url;
}
