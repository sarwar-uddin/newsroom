import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import postgres from 'postgres';
import { E2E_USERS } from './users';

/** Rebuilds the disposable e2e database: drop everything, migrate, seed, create accounts. */
export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL!;
  const uploadDir = process.env.E2E_UPLOAD_DIR!;
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  await sql.unsafe(
    'drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;',
  );
  await sql.end();
  rmSync(uploadDir, { recursive: true, force: true });

  const env = { ...process.env, DATABASE_URL: url, UPLOAD_DIR: uploadDir };
  const run = (args: string[], input?: string) => {
    const r = spawnSync('pnpm', ['exec', 'tsx', ...args], { env, input, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`${args.join(' ')} failed:\n${r.stdout}\n${r.stderr}`);
  };
  run(['scripts/migrate.ts']);
  run(['scripts/seed.ts']);
  for (const u of Object.values(E2E_USERS)) {
    const extra = u.byline ? ['--byline', u.byline] : [];
    run(
      ['scripts/create-user.ts', '--email', u.email, '--name', u.name, '--role', u.role, ...extra],
      `${u.password}\n`,
    );
  }
}
