import { asc, count, eq, sql } from 'drizzle-orm';
import { slugify } from '@/lib/slug';
import { db } from '@/server/db';
import { articles, articleTags, authors, categories, media, tags } from '@/server/db/schema';
import { DomainError, isUniqueViolation } from './errors';
import { authorInputSchema, categoryInputSchema, fieldErrors } from './validation';
import { canManageTaxonomy, type Actor } from './workflow';

function assertEditorial(actor: Actor) {
  if (!canManageTaxonomy(actor))
    throw new DomainError('forbidden', 'Only editors can manage this.');
}

export async function listCategoriesWithCounts() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      displayOrder: categories.displayOrder,
      articleCount:
        sql<number>`(select count(*) from ${articles} where ${articles.categoryId} = ${categories.id})`.mapWith(
          Number,
        ),
    })
    .from(categories)
    .orderBy(asc(categories.displayOrder), asc(categories.name));
}

export async function saveCategory(actor: Actor, id: string | null, raw: Record<string, unknown>) {
  assertEditorial(actor);
  const parsed = categoryInputSchema.safeParse(raw);
  if (!parsed.success)
    throw new DomainError('invalid', 'Please correct the fields.', fieldErrors(parsed.error));
  const values = { ...parsed.data, slug: parsed.data.slug || slugify(parsed.data.name) };
  if (!values.slug) throw new DomainError('invalid', 'A slug is required.', { slug: 'Required.' });
  try {
    if (id) {
      const [row] = await db
        .update(categories)
        .set(values)
        .where(eq(categories.id, id))
        .returning();
      if (!row) throw new DomainError('not_found', 'Section not found.');
      return row;
    }
    const [row] = await db.insert(categories).values(values).returning();
    return row;
  } catch (error) {
    if (isUniqueViolation(error))
      throw new DomainError('conflict', 'That slug is taken.', { slug: 'Taken.' });
    throw error;
  }
}

export async function deleteCategory(actor: Actor, id: string) {
  assertEditorial(actor);
  const [used] = await db.select({ n: count() }).from(articles).where(eq(articles.categoryId, id));
  if ((used?.n ?? 0) > 0)
    throw new DomainError('conflict', 'Move this section’s articles before deleting it.');
  await db.delete(categories).where(eq(categories.id, id));
}

export async function listTagsWithCounts() {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      articleCount: count(articleTags.articleId),
    })
    .from(tags)
    .leftJoin(articleTags, eq(articleTags.tagId, tags.id))
    .groupBy(tags.id)
    .orderBy(asc(tags.name));
}

export async function deleteTag(actor: Actor, id: string) {
  assertEditorial(actor);
  await db.delete(tags).where(eq(tags.id, id));
}

export async function listAuthors() {
  return db
    .select({
      id: authors.id,
      name: authors.name,
      slug: authors.slug,
      biography: authors.biography,
      socialLinks: authors.socialLinks,
      avatarMediaId: authors.avatarMediaId,
      avatarKey: media.storageKey,
      articleCount:
        sql<number>`(select count(*) from ${articles} where ${articles.authorId} = ${authors.id})`.mapWith(
          Number,
        ),
    })
    .from(authors)
    .leftJoin(media, eq(media.id, authors.avatarMediaId))
    .orderBy(asc(authors.name));
}

export async function saveAuthor(actor: Actor, id: string | null, raw: Record<string, unknown>) {
  assertEditorial(actor);
  const parsed = authorInputSchema.safeParse(raw);
  if (!parsed.success)
    throw new DomainError('invalid', 'Please correct the fields.', fieldErrors(parsed.error));
  const { website, x, instagram, ...rest } = parsed.data;
  const socialLinks = Object.fromEntries(
    Object.entries({ website, x, instagram }).filter(([, v]) => v !== ''),
  );
  const values = { ...rest, slug: rest.slug || slugify(rest.name), socialLinks };
  if (!values.slug) throw new DomainError('invalid', 'A slug is required.', { slug: 'Required.' });
  try {
    if (id) {
      const [row] = await db.update(authors).set(values).where(eq(authors.id, id)).returning();
      if (!row) throw new DomainError('not_found', 'Byline not found.');
      return row;
    }
    const [row] = await db.insert(authors).values(values).returning();
    return row;
  } catch (error) {
    if (isUniqueViolation(error))
      throw new DomainError('conflict', 'That slug is taken.', { slug: 'Taken.' });
    throw error;
  }
}
