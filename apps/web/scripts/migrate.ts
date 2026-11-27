import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { loadRootEnv } from '../src/load-env';

loadRootEnv();

const { createDb } = await import('../src/server/db/connect');
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env at the repository root.');
  process.exit(1);
}
const { db, client } = createDb(url, { max: 1 });
try {
  await migrate(db, { migrationsFolder: new URL('../drizzle', import.meta.url).pathname });
  console.log('Migrations applied.');
} catch (error) {
  console.error('Migration failed:', error);
  process.exitCode = 1;
} finally {
  await client.end();
}
