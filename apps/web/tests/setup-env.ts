import os from 'node:os';
import path from 'node:path';
import { testDatabaseUrl } from './test-db';

const url = testDatabaseUrl();
process.env.SITE_URL ??= 'http://localhost:3000';
if (url) {
  process.env.DATABASE_URL_DEV ??= process.env.DATABASE_URL ?? '';
  process.env.DATABASE_URL = url;
  process.env.VITEST_DB_CONFIRMED = '1';
}
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `newsroom-test-uploads-${process.pid}`);
process.env.MEDIA_MAX_BYTES = String(1024 * 1024);
