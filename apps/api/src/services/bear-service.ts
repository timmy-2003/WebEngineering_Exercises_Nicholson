import type { FastifyBaseLogger } from 'fastify';
import { NotFoundError, UpstreamError } from '../errors.js';
import type { Bear, BearDetail } from '../schemas/bear.js';
import type { WikipediaClient } from '../upstream/wikipedia.js';
import { parseBearEntries } from './parse-bears.js';

export interface BearService {
  list: () => Promise<Bear[]>;
  get: (id: string) => Promise<BearDetail>;
}

declare module 'fastify' {
  interface FastifyInstance {
    bearService: BearService;
  }
}

export function createBearService(
  wiki: WikipediaClient,
  log: FastifyBaseLogger
): BearService {
  async function lookUpImages(
    fileNames: readonly string[]
  ): Promise<Map<string, string>> {
    try {
      return await wiki.fetchImageUrls(fileNames);
    } catch (err) {
      log.warn({ err }, 'image lookup failed, serving bears without images');
      return new Map();
    }
  }

  async function list(): Promise<Bear[]> {
    const entries = parseBearEntries(await wiki.fetchUrsidsWikitext());
    if (entries.length === 0) {
      throw new UpstreamError('No bears could be parsed from Wikipedia');
    }

    const images = await lookUpImages(entries.map((entry) => entry.fileName));
    return entries.map(({ fileName, ...entry }) => ({
      ...entry,
      imageUrl: images.get(fileName) ?? null,
    }));
  }

  async function get(id: string): Promise<BearDetail> {
    const bear = (await list()).find((candidate) => candidate.id === id);
    if (bear === undefined) {
      throw new NotFoundError('bear', id);
    }
    return { ...bear, intro: await wiki.fetchIntro(bear.name) };
  }

  return { list, get };
}
