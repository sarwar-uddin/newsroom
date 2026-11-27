import { env } from '@/server/env';
import { createDb, type Database } from './connect';

type Holder = { db: Database; close: () => Promise<void> };
const globalForDb = globalThis as unknown as { __newsroomDb?: Holder };

function getDb(): Database {
  if (!globalForDb.__newsroomDb) {
    const { db, client } = createDb(env().DATABASE_URL);
    globalForDb.__newsroomDb = { db, close: () => client.end({ timeout: 5 }) };
  }
  return globalForDb.__newsroomDb.db;
}

/**
 * Lazily-connected singleton. The proxy defers connection (and env validation) to first use so
 * that importing this module during `next build` has no side effects.
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop);
    return typeof value === 'function' ? value.bind(real) : value;
  },
});

/** Closes the pool. Only needed by CLI scripts and tests. */
export async function closeDb(): Promise<void> {
  const holder = globalForDb.__newsroomDb;
  globalForDb.__newsroomDb = undefined;
  await holder?.close();
}
