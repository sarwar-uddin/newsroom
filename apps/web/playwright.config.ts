import os from 'node:os';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { loadRootEnv } from './src/load-env';

loadRootEnv();

const PORT = Number(process.env.E2E_PORT ?? 3100);
const testDb = process.env.TEST_DATABASE_URL;
if (!testDb)
  throw new Error('Set TEST_DATABASE_URL to a disposable database before running e2e tests.');
if (testDb === process.env.DATABASE_URL)
  throw new Error('TEST_DATABASE_URL must differ from DATABASE_URL.');

/** Environment shared by the seed (global setup) and the server under test. */
export const e2eEnv = {
  DATABASE_URL: testDb,
  SITE_URL: `http://localhost:${PORT}`,
  UPLOAD_DIR: path.join(os.tmpdir(), 'newsroom-e2e-uploads'),
};
Object.assign(process.env, { E2E_DATABASE_URL: testDb, E2E_UPLOAD_DIR: e2eEnv.UPLOAD_DIR });

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
          : {},
      },
    },
  ],
  webServer: {
    // Run `pnpm build` first; e2e tests exercise the production server.
    command: `pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}/robots.txt`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: e2eEnv,
  },
});
