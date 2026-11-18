import type { FastifyInstance } from 'fastify';
import { buildApp, type BuildAppOptions } from '../src/app.js';
import { createMemoryRepos } from '../src/repositories/memory.js';
import type { BearDetail } from '../src/schemas/bear.js';
import { loadEnv } from '../src/schemas/env.js';

export const testEnv = loadEnv({ USER_AGENT: 'BearApp/0.1 (test)' });

export const testBears: BearDetail[] = [
  {
    id: 'ailuropoda-melanoleuca',
    name: 'Giant panda',
    binomial: 'Ailuropoda melanoleuca',
    imageUrl: 'https://upload.wikimedia.org/panda.jpg',
    range: 'Central China',
    intro: 'The giant panda is a bear species endemic to China.',
  },
  {
    id: 'ursus-arctos',
    name: 'Brown bear',
    binomial: 'Ursus arctos',
    imageUrl: null,
    range: 'Eurasia and North America',
    intro: 'The brown bear is big.',
  },
];

export async function testApp(
  options: Partial<BuildAppOptions> & { bears?: BearDetail[] } = {}
): Promise<FastifyInstance> {
  const { bears = testBears, ...rest } = options;
  return await buildApp({
    env: testEnv,
    repos: createMemoryRepos({ bears }),
    ping: async () => {
      await Promise.resolve();
    },
    ...rest,
  });
}
