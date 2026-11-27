/**
 * Creates a CMS account. There is no public registration; this is the only way to add users.
 *
 *   pnpm user:create --email you@example.org --name "Your Name" --role admin
 *   pnpm user:create --email writer@example.org --name "A Writer" --role author   # also creates a byline
 *   pnpm user:create ... --byline existing-author-slug                              # link an existing byline
 *
 * The password is read from a hidden prompt (or from stdin when not a TTY, for automation).
 * It is never accepted as a command-line argument, which would leak into shell history.
 */
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { loadRootEnv } from '../src/load-env';

loadRootEnv();

const { db, closeDb } = await import('../src/server/db');
const { authors, users } = await import('../src/server/db/schema');
const { hashPassword, passwordPolicyError } = await import('../src/server/auth/password');
const { slugify } = await import('../src/lib/slug');
const { eq } = await import('drizzle-orm');
const { z } = await import('zod');

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    name: { type: 'string' },
    role: { type: 'string', default: 'admin' },
    byline: { type: 'string' },
  },
});

const args = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    name: z.string().trim().min(1).max(160),
    role: z.enum(['admin', 'editor', 'author']),
    byline: z.string().optional(),
  })
  .safeParse(values);

if (!args.success) {
  console.error(
    'Usage: pnpm user:create --email <email> --name "<name>" [--role admin|editor|author] [--byline <author-slug>]',
  );
  console.error(args.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n'));
  process.exit(1);
}

async function readPassword(prompt: string): Promise<string> {
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks).toString('utf8').split('\n')[0] ?? '';
  }
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const out = rl as unknown as { _writeToOutput: (s: string) => void };
    let muted = false;
    out._writeToOutput = (s: string) => {
      if (!muted || s.includes('\n')) process.stdout.write(muted ? '\n' : s);
    };
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
    muted = true;
  });
}

try {
  const { email, name, role, byline } = args.data;
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) throw new Error(`A user with email ${email} already exists.`);

  const password = await readPassword('Password (min 12 characters): ');
  if (!process.stdin.isTTY && password === '') {
    throw new Error(
      'No interactive terminal and no password on stdin. Run this command in a regular terminal to get a hidden password prompt.',
    );
  }
  const policy = passwordPolicyError(password);
  if (policy) throw new Error(policy);
  if (process.stdin.isTTY) {
    const confirm = await readPassword('Confirm password: ');
    if (confirm !== password) throw new Error('Passwords do not match.');
  }

  let authorId: string | null = null;
  if (byline) {
    const [a] = await db.select({ id: authors.id }).from(authors).where(eq(authors.slug, byline));
    if (!a) throw new Error(`No byline with slug "${byline}".`);
    authorId = a.id;
  } else if (role === 'author') {
    const [a] = await db
      .insert(authors)
      .values({ name, slug: slugify(name) || `author-${Date.now()}` })
      .onConflictDoNothing()
      .returning({ id: authors.id });
    if (!a)
      throw new Error(
        `A byline with slug "${slugify(name)}" exists. Pass --byline ${slugify(name)} to link it.`,
      );
    authorId = a.id;
  }

  const passwordHash = await hashPassword(password);
  await db.insert(users).values({ email, name, role, passwordHash, authorId });
  console.log(`Created ${role} account for ${email}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await closeDb();
}
