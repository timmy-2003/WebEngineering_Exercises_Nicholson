import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import type { Env } from '../schemas/env.js';

const POOL_MAX = 10;
const IDLE_TIMEOUT_MS = 10_000;
const CONNECTION_TIMEOUT_MS = 5000;
const PING_TIMEOUT_MS = 1000;

const MIGRATIONS_FOLDER = fileURLToPath(
  new URL('../../drizzle', import.meta.url)
);

export interface Database {
  db: NodePgDatabase;
  ping: () => Promise<void>;
  migrate: () => Promise<void>;
  close: () => Promise<void>;
  onIdleClientError: (listener: (err: Error) => void) => void;
}

async function withTimeout(work: Promise<unknown>, ms: number): Promise<void> {
  const cancel = new AbortController();
  const timeout = (async (): Promise<void> => {
    try {
      await delay(ms, undefined, { signal: cancel.signal });
    } catch {
      return;
    }
    throw new Error(`timed out after ${ms} ms`);
  })();
  try {
    await Promise.race([work, timeout]);
  } finally {
    cancel.abort();
  }
}

export function createDatabase(env: Env): Database {
  const pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
    max: POOL_MAX,
    idleTimeoutMillis: IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  });
  const db = drizzle(pool);

  return {
    db,
    ping: async () => {
      await withTimeout(pool.query('SELECT 1'), PING_TIMEOUT_MS);
    },
    migrate: async () => {
      await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    },
    close: async () => {
      await pool.end();
    },
    // An idle client whose server goes away emits 'error' on the pool;
    // without a listener Node treats it as unhandled and exits.
    onIdleClientError: (listener) => {
      pool.on('error', listener);
    },
  };
}
