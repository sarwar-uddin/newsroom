import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Loads the repository-root `.env` (shared with docker-compose) for local development, CLI
 * scripts and tests. Existing environment variables always win, so production platforms that
 * inject variables directly are unaffected.
 */
export function loadRootEnv(): void {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../../.env'),
  ];
  for (const file of candidates) {
    if (existsSync(file)) {
      process.loadEnvFile(file);
      return;
    }
  }
}
