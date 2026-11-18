import type { FastifyInstance } from 'fastify';
import { buildApp, type BuildAppOptions } from '../src/app.js';
import { loadEnv } from '../src/schemas/env.js';
import { fakeWikipedia } from './fake-wikipedia.js';

export const testEnv = loadEnv({ USER_AGENT: 'BearApp/0.1 (test)' });

export async function testApp(
  options: Partial<BuildAppOptions> = {}
): Promise<FastifyInstance> {
  return await buildApp({
    env: testEnv,
    fetch: fakeWikipedia().fetch,
    ping: async () => {
      await Promise.resolve();
    },
    ...options,
  });
}
