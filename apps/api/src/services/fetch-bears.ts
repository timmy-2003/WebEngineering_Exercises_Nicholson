import type { FastifyBaseLogger } from 'fastify';
import { UpstreamError } from '../errors.js';
import type { BearDetail } from '../schemas/bear.js';
import type { WikipediaClient } from '../upstream/wikipedia.js';
import { parseBearEntries } from './parse-bears.js';

export async function fetchBearsFromWikipedia(
  wiki: WikipediaClient,
  log: Pick<FastifyBaseLogger, 'warn'>
): Promise<BearDetail[]> {
  const entries = parseBearEntries(await wiki.fetchUrsidsWikitext());
  if (entries.length === 0) {
    throw new UpstreamError('No bears could be parsed from Wikipedia');
  }

  let images = new Map<string, string>();
  try {
    images = await wiki.fetchImageUrls(entries.map((entry) => entry.fileName));
  } catch (err) {
    log.warn({ err }, 'image lookup failed, storing bears without images');
  }

  return await Promise.all(
    entries.map(async ({ fileName, ...entry }) => {
      let intro = '';
      try {
        intro = await wiki.fetchIntro(entry.name);
      } catch (err) {
        log.warn({ err, bear: entry.id }, 'intro lookup failed');
      }
      return { ...entry, imageUrl: images.get(fileName) ?? null, intro };
    })
  );
}
