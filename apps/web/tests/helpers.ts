import { sql } from 'drizzle-orm';
import { docFromMarkup } from '../src/lib/rich-text/text';
import { db } from '../src/server/db';
import { authors, categories, users, type UserRole } from '../src/server/db/schema';
import type { Actor } from '../src/server/content/workflow';

export const hasTestDb = Boolean(process.env.VITEST_DB_CONFIRMED);

export async function resetDb() {
  await db.execute(
    sql`truncate table article_tags, articles, tags, sessions, login_attempts, users, authors, categories, media restart identity cascade`,
  );
}

export async function makeFixtures() {
  const [cat1, cat2] = await db
    .insert(categories)
    .values([
      { name: 'Investigations', slug: 'investigations' },
      { name: 'Culture', slug: 'culture' },
    ])
    .returning();
  const [a1, a2] = await db
    .insert(authors)
    .values([
      { name: 'Writer One', slug: 'writer-one' },
      { name: 'Writer Two', slug: 'writer-two' },
    ])
    .returning();
  const mk = async (role: UserRole, email: string, authorId: string | null): Promise<Actor> => {
    const [u] = await db
      .insert(users)
      .values({ name: email, email, role, passwordHash: 'x', authorId })
      .returning();
    return { id: u!.id, role, authorId };
  };
  return {
    categories: [cat1!, cat2!],
    authors: [a1!, a2!],
    admin: await mk('admin', 'admin@test.local', null),
    editor: await mk('editor', 'editor@test.local', null),
    author1: await mk('author', 'author1@test.local', a1!.id),
    author2: await mk('author', 'author2@test.local', a2!.id),
  };
}

export function articleForm(
  overrides: Record<string, string> = {},
  fx?: { categoryId: string; authorId: string },
) {
  return {
    title: 'A Test Article',
    dek: 'A dek',
    excerpt: '',
    body: JSON.stringify(
      docFromMarkup('First paragraph about **ownership** and power.\n\nSecond paragraph.'),
    ),
    authorId: fx?.authorId ?? '',
    categoryId: fx?.categoryId ?? '',
    tags: 'Media, Power',
    ...overrides,
  };
}
