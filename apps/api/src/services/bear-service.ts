import { NotFoundError } from '../errors.js';
import type { BearRepository } from '../repositories/types.js';
import type { Bear, BearDetail } from '../schemas/bear.js';

export interface BearService {
  list: (q?: string) => Promise<Bear[]>;
  get: (id: string) => Promise<BearDetail>;
}

declare module 'fastify' {
  interface FastifyInstance {
    bearService: BearService;
  }
}

export function createBearService(bears: BearRepository): BearService {
  return {
    list: async (q) => await bears.list(q),
    async get(id) {
      const bear = await bears.get(id);
      if (bear === null) {
        throw new NotFoundError('bear', id);
      }
      return bear;
    },
  };
}
