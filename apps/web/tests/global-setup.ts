import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDb } from '../src/server/db/connect';
import { testDatabaseUrl } from './test-db';

export default async function setup() {
  const url = testDatabaseUrl();
  if (!url) {
    console.warn(
      '\n[tests] TEST_DATABASE_URL is not set: database integration tests will be skipped.\n',
    );
    return;
  }
  const { db, client } = createDb(url, { max: 1 });
  await migrate(db, { migrationsFolder: new URL('../drizzle', import.meta.url).pathname });
  await client.end();
}
