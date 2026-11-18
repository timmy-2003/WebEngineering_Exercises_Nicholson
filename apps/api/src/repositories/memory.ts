import type { BearDetail } from '../schemas/bear.js';
import type { Repos } from './types.js';

export function createMemoryRepos(
  seed: { bears?: readonly BearDetail[] } = {}
): Repos {
  const bears = new Map((seed.bears ?? []).map((bear) => [bear.id, bear]));

  return {
    bears: {
      async list() {
        return await Promise.resolve(
          [...bears.values()]
            .sort((a, b) => a.binomial.localeCompare(b.binomial))
            .map(({ intro: _intro, ...bear }) => bear)
        );
      },
      async get(id) {
        return await Promise.resolve(bears.get(id) ?? null);
      },
      async upsertMany(records) {
        for (const record of records) {
          bears.set(record.id, record);
        }
        await Promise.resolve();
      },
    },
  };
}
