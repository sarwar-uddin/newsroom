import { loadRootEnv } from '../src/load-env';

loadRootEnv();

/** The disposable test database. Refuses to return the development database: tests truncate it. */
export function testDatabaseUrl(): string | null {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return null;
  const dev = process.env.DATABASE_URL_DEV ?? process.env.DATABASE_URL;
  if (dev && url === dev)
    throw new Error('TEST_DATABASE_URL must differ from DATABASE_URL: tests truncate every table.');
  return url;
}
