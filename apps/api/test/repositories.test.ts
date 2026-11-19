import { readdirSync, readFileSync } from 'node:fs';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabase, type Database } from '../src/db/database.js';
import { comments } from '../src/db/schema.js';
import { createDrizzleRepos } from '../src/repositories/drizzle.js';
import { createMemoryRepos } from '../src/repositories/memory.js';
import { loadEnv } from '../src/schemas/env.js';
import { testBears } from './helpers.js';
import { describeRepos } from './repositories.contract.js';

describeRepos(
  'memory',
  async (options = {}) =>
    await Promise.resolve(createMemoryRepos({ bears: testBears, ...options }))
);

// Needs a throwaway database, e.g.
// TEST_DATABASE_URL=postgres://bears:bears@localhost:5432/bears_test
describe.skipIf(process.env.TEST_DATABASE_URL === undefined)('postgres', () => {
  let database: Database;

  beforeAll(async () => {
    database = createDatabase(
      loadEnv({ DATABASE_URL: process.env.TEST_DATABASE_URL })
    );
    await database.migrate();
  });

  afterAll(async () => {
    await database.close();
  });

  describeRepos('drizzle', async ({ now } = {}) => {
    await database.db.execute(sql`TRUNCATE bears, comments CASCADE`);
    const repos = createDrizzleRepos(database.db);
    await repos.bears.upsertMany(testBears);
    if (now === undefined) {
      return repos;
    }
    // The database sets created_at itself; pin it to test same-instant ties.
    return {
      ...repos,
      comments: {
        ...repos.comments,
        async create(input) {
          const [row] = await database.db
            .insert(comments)
            .values({ ...input, createdAt: now() })
            .returning();
          if (row === undefined) {
            throw new Error('insert returned no row');
          }
          return {
            ...row,
            createdAt: row.createdAt.toISOString(),
            hiddenAt: null,
          };
        },
      },
    };
  });
});

describe('routes', () => {
  it('never import the database layer directly', () => {
    const dir = new URL('../src/routes/', import.meta.url);
    for (const file of readdirSync(dir)) {
      const source = readFileSync(new URL(file, dir), 'utf8');
      expect(source, file).not.toMatch(/from '(?:drizzle-orm|pg|\.\.\/db\/)/v);
    }
  });
});
