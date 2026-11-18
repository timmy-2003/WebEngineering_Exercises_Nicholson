import type { Bear, BearDetail } from '../schemas/bear.js';

export interface BearRepository {
  list: () => Promise<Bear[]>;
  get: (id: string) => Promise<BearDetail | null>;
  upsertMany: (bears: readonly BearDetail[]) => Promise<void>;
}

export interface Repos {
  bears: BearRepository;
}
