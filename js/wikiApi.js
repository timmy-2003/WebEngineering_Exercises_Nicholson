// Wikipedia API access - pure network calls, no DOM knowledge

const baseUrl = 'https://en.wikipedia.org/w/api.php';

export async function fetchBearListWikitext(title, section) {
  const params = {
    action: 'parse',
    page: title,
    prop: 'wikitext',
    section: section,
    format: 'json',
    origin: '*'
  };

  const url = baseUrl + '?' + new URLSearchParams(params).toString();
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error('Wikipedia API request failed with status ' + res.status);
  }

  const data = await res.json();

  if (data.error) {
    throw new Error('Wikipedia API error: ' + data.error.info);
  }

  const wikitext = data.parse && data.parse.wikitext && data.parse.wikitext['*'];
  if (!wikitext) {
    throw new Error('Unexpected Wikipedia API response: missing wikitext.');
  }

  return wikitext;
}

export async function fetchImageUrl(fileName) {
  const imageParams = {
    action: 'query',
    titles: 'File:' + fileName,
    prop: 'imageinfo',
    iiprop: 'url',
    format: 'json',
    origin: '*'
  };

  const url = baseUrl + '?' + new URLSearchParams(imageParams).toString();
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error('Wikipedia API request failed with status ' + res.status);
  }

  const data = await res.json();
  const pages = data.query && data.query.pages;
  const page = pages && Object.values(pages)[0];
  const info = page && page.imageinfo && page.imageinfo[0];

  if (!info || !info.url) {
    throw new Error('No image available for "' + fileName + '"');
  }

  return info.url;
}
