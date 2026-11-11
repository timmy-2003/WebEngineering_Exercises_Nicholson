// Bear domain model and the pure wikitext -> data extraction. Nothing in here touches the DOM or
// Angular; it only turns validated API data into typed bear records.

import { fetchImageUrl, fetchWikitext } from './wiki-api';

/** What wikitext parsing produces, before an image URL has been resolved. */
export interface BearEntry {
  /** Stable, URL-safe identifier derived from the Wikipedia article title (`giant-panda`). */
  id: string;
  name: string;
  binomial: string;
  fileName: string;
  range: string;
}

/** What actually gets rendered. */
export interface Bear {
  id: string;
  name: string;
  binomial: string;
  image: string;
  range: string;
}

export const PLACEHOLDER_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150">' +
    '<rect width="100%" height="100%" fill="#ccc"/>' +
    '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" ' +
    'font-family="sans-serif" font-size="14" fill="#555">No image available</text>' +
    '</svg>'
)}`;

/**
 * Wikipedia article titles are unique, so a slug of the title is a stable identifier: it does
 * not depend on list position and survives reordering, filtering, or a re-fetch.
 */
export function toBearId(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/gv, '-')
    .replace(/^-|-$/gv, '');
}

/** Removes simple wiki markup (`[[link|label]]`, `''italics''`) from a field value. */
function stripWikiMarkup(value: string): string {
  return value
    .replace(/\[\[(?:[^\]\|]*\|)?(?<label>[^\]]*)\]\]/gv, '$<label>')
    .replace(/'{2,}/gv, '')
    .trim();
}

/** Reads `|field=value` from a template row; a value ends at the next ` |field=` or line end. */
function readField(row: string, field: string): string | undefined {
  const pattern = new RegExp(
    `\\|${field}=(?<value>.*?)(?: \\|[\\w\\-]+=|\\n)`,
    'v'
  );
  return pattern.exec(row)?.groups?.['value'];
}

export function extractBearEntries(wikitext: string): BearEntry[] {
  const entries: BearEntry[] = [];
  const seen = new Set<string>();

  for (const row of wikitext.split('{{Species table/row').slice(1)) {
    const name = /\|name=\[\[(?<name>[^\]\|]*)/v.exec(row)?.groups?.['name'];
    const binomial = readField(row, 'binomial');
    const image = readField(row, 'image');

    if (name === undefined || binomial === undefined || image === undefined) {
      continue;
    }

    const id = toBearId(name);
    // Same order and number as the Wikipedia page: skip accidental duplicates.
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);

    entries.push({
      id,
      name: name.trim(),
      binomial: stripWikiMarkup(binomial),
      fileName: image.trim().replace('File:', ''),
      range: stripWikiMarkup(readField(row, 'range') ?? 'Unknown'),
    });
  }

  return entries;
}

async function resolveBearImage(
  fileName: string,
  signal: AbortSignal
): Promise<string> {
  try {
    return await fetchImageUrl(fileName, signal);
  } catch (err) {
    // A cancelled request is not a missing image - let the cancellation propagate instead of
    // quietly turning it into a placeholder.
    if (signal.aborted) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console -- Deliberate debug logging
    console.warn(`Using placeholder image for "${fileName}": ${message}`);
    return PLACEHOLDER_IMAGE;
  }
}

// The Wikipedia page's species table lives in this specific section of the article.
const BEAR_LIST_SECTION = 3;

/** Loads, validates and assembles the full bear list. Resolves to `[]` if there are none. */
export async function loadBears(signal: AbortSignal): Promise<Bear[]> {
  const wikitext = await fetchWikitext(
    'List_of_ursids',
    BEAR_LIST_SECTION,
    signal
  );

  return await Promise.all(
    extractBearEntries(wikitext).map(
      async ({ fileName, ...entry }): Promise<Bear> => ({
        ...entry,
        image: await resolveBearImage(fileName, signal),
      })
    )
  );
}
