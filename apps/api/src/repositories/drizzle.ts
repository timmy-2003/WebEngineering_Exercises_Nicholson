import { eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { bears } from '../db/schema.js';
import type { Repos } from './types.js';

const bearColumns = {
  id: bears.id,
  name: bears.name,
  binomial: bears.binomial,
  imageUrl: bears.imageUrl,
  range: bears.range,
};

export function createDrizzleRepos(db: NodePgDatabase): Repos {
  return {
    bears: {
      async list() {
        return await db.select(bearColumns).from(bears).orderBy(bears.binomial);
      },
      async get(id) {
        const [bear] = await db
          .select({ ...bearColumns, intro: bears.intro })
          .from(bears)
          .where(eq(bears.id, id));
        return bear ?? null;
      },
      async upsertMany(records) {
        if (records.length === 0) {
          return;
        }
        await db
          .insert(bears)
          .values([...records])
          .onConflictDoUpdate({
            target: bears.id,
            set: {
              name: sql`excluded.name`,
              binomial: sql`excluded.binomial`,
              imageUrl: sql`excluded.image_url`,
              range: sql`excluded.range`,
              intro: sql`excluded.intro`,
              fetchedAt: sql`now()`,
            },
          });
      },
    },
  };
}
