import { and, count, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { docToPlainText, readingTimeMinutes } from '@/lib/rich-text/text';
import { slugify } from '@/lib/slug';
import { db } from '@/server/db';
import type { Transaction } from '@/server/db/connect';
import {
  articles,
  articleTags,
  authors,
  categories,
  media,
  tags,
  users,
  type Article,
  type ArticleStatus,
} from '@/server/db/schema';
import { DomainError, isUniqueViolation } from './errors';
import { articleInputSchema, fieldErrors, type ArticleInput } from './validation';
import {
  canDeleteArticle,
  canEditArticle,
  canSetFeatured,
  canChooseAnyByline,
  canTransition,
  canViewArticle,
  INTENT_TARGET,
  type Actor,
  type Intent,
} from './workflow';

export function parseArticleInput(raw: Record<string, unknown>): ArticleInput {
  const parsed = articleInputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new DomainError(
      'invalid',
      'Please correct the highlighted fields.',
      fieldErrors(parsed.error),
    );
  }
  return parsed.data;
}

async function loadArticle(
  tx: Transaction | typeof db,
  id: string,
  lock = false,
): Promise<Article> {
  const q = tx.select().from(articles).where(eq(articles.id, id)).limit(1);
  const [row] = lock ? await q.for('update') : await q;
  if (!row) throw new DomainError('not_found', 'Article not found.');
  return row;
}

/** Applies role rules to the submitted byline/featured values. */
async function resolveInput(
  tx: Transaction,
  actor: Actor,
  input: ArticleInput,
  existing?: Article,
) {
  let authorId = input.authorId;
  if (!canChooseAnyByline(actor)) {
    if (!actor.authorId) {
      throw new DomainError('forbidden', 'Your account has no byline. Ask an editor to link one.');
    }
    authorId = actor.authorId;
  }
  const featured = canSetFeatured(actor) ? input.featured : (existing?.featured ?? false);

  const [author] = await tx
    .select({ id: authors.id })
    .from(authors)
    .where(eq(authors.id, authorId));
  if (!author)
    throw new DomainError('invalid', 'Unknown byline.', { authorId: 'Choose a byline.' });
  const [category] = await tx
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, input.categoryId));
  if (!category)
    throw new DomainError('invalid', 'Unknown section.', { categoryId: 'Choose a section.' });
  if (input.featuredImageId) {
    const [image] = await tx
      .select({ id: media.id })
      .from(media)
      .where(eq(media.id, input.featuredImageId));
    if (!image)
      throw new DomainError('invalid', 'Unknown image.', { featuredImageId: 'Image not found.' });
  }

  const bodyText = docToPlainText(input.body);
  return {
    title: input.title,
    slug: input.slug,
    dek: input.dek,
    excerpt: input.excerpt,
    body: input.body,
    bodyText,
    readingTime: readingTimeMinutes(bodyText),
    authorId,
    categoryId: input.categoryId,
    featuredImageId: input.featuredImageId,
    imageCaption: input.imageCaption,
    imageCredit: input.imageCredit,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    featured,
  };
}

async function setArticleTags(tx: Transaction, articleId: string, names: string[]): Promise<void> {
  await tx.delete(articleTags).where(eq(articleTags.articleId, articleId));
  const wanted = names
    .map((name) => ({ name, slug: slugify(name) }))
    .filter((t, i, all) => t.slug && all.findIndex((o) => o.slug === t.slug) === i);
  if (wanted.length === 0) return;
  await tx.insert(tags).values(wanted).onConflictDoNothing({ target: tags.slug });
  const rows = await tx
    .select({ id: tags.id })
    .from(tags)
    .where(
      inArray(
        tags.slug,
        wanted.map((t) => t.slug),
      ),
    );
  await tx.insert(articleTags).values(rows.map((r) => ({ articleId, tagId: r.id })));
}

function assertPublishable(article: Pick<Article, 'bodyText' | 'title'>): void {
  if (article.bodyText.trim().length < 1) {
    throw new DomainError('invalid', 'An article needs body text before it can be published.', {
      body: 'Write the article before publishing.',
    });
  }
}

function transitionValues(article: Article, to: ArticleStatus): Partial<Article> {
  if (to === 'published') {
    assertPublishable(article);
    return { status: to, publishedAt: article.publishedAt ?? new Date() };
  }
  return { status: to };
}

function mapSlugConflict(error: unknown): never {
  if (isUniqueViolation(error, 'articles_locale_slug_idx')) {
    throw new DomainError('conflict', 'Another article already uses this slug.', {
      slug: 'This slug is taken. Choose another.',
    });
  }
  throw error;
}

/** Creates an article, optionally moving it straight into review or publication. */
export async function createArticle(
  actor: Actor,
  raw: Record<string, unknown>,
  intent: Intent = 'save',
) {
  const input = parseArticleInput(raw);
  try {
    return await db.transaction(async (tx) => {
      const values = await resolveInput(tx, actor, input);
      const [created] = await tx
        .insert(articles)
        .values({ ...values, status: 'draft', createdBy: actor.id })
        .returning();
      if (!created) throw new Error('Insert returned no row');
      await setArticleTags(tx, created.id, input.tags);
      if (intent === 'save') return created;
      return applyTransition(tx, actor, created, INTENT_TARGET[intent]);
    });
  } catch (error) {
    mapSlugConflict(error);
  }
}

/**
 * Saves content changes and an optional status change atomically. `expectedRevision` is the
 * revision the editor loaded; if someone else saved in between, the save is refused.
 */
export async function updateArticle(
  actor: Actor,
  id: string,
  raw: Record<string, unknown>,
  expectedRevision: number,
  intent: Intent = 'save',
) {
  const input = parseArticleInput(raw);
  try {
    return await db.transaction(async (tx) => {
      const existing = await loadArticle(tx, id, true);
      if (!canViewArticle(actor, existing))
        throw new DomainError('not_found', 'Article not found.');
      if (!canEditArticle(actor, existing)) {
        throw new DomainError('forbidden', 'You do not have permission to edit this article.');
      }
      if (existing.revision !== expectedRevision) {
        throw new DomainError(
          'stale',
          'This article was changed by someone else after you opened it. Reload to see the latest version; your edits were not saved.',
        );
      }
      const values = await resolveInput(tx, actor, input, existing);
      const [updated] = await tx
        .update(articles)
        .set({
          ...values,
          revision: existing.revision + 1,
          revisedAt: existing.status === 'published' ? new Date() : existing.revisedAt,
        })
        .where(eq(articles.id, id))
        .returning();
      if (!updated) throw new Error('Update returned no row');
      await setArticleTags(tx, id, input.tags);
      if (intent === 'save') return updated;
      return applyTransition(tx, actor, updated, INTENT_TARGET[intent]);
    });
  } catch (error) {
    mapSlugConflict(error);
  }
}

async function applyTransition(tx: Transaction, actor: Actor, article: Article, to: ArticleStatus) {
  if (!canTransition(actor, article, to)) {
    throw new DomainError(
      'forbidden',
      `You cannot move this article from ${article.status} to ${to}.`,
    );
  }
  const [updated] = await tx
    .update(articles)
    .set({ ...transitionValues(article, to), revision: article.revision + 1 })
    .where(eq(articles.id, article.id))
    .returning();
  if (!updated) throw new Error('Transition returned no row');
  return updated;
}

/** Status change without content edits (e.g. unpublish from the list, author withdrawing review). */
export async function transitionArticle(actor: Actor, id: string, intent: Exclude<Intent, 'save'>) {
  return db.transaction(async (tx) => {
    const article = await loadArticle(tx, id, true);
    if (!canViewArticle(actor, article)) throw new DomainError('not_found', 'Article not found.');
    return applyTransition(tx, actor, article, INTENT_TARGET[intent]);
  });
}

export async function deleteArticle(actor: Actor, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    const article = await loadArticle(tx, id, true);
    if (!canViewArticle(actor, article)) throw new DomainError('not_found', 'Article not found.');
    if (!canDeleteArticle(actor, article)) {
      throw new DomainError('forbidden', 'Published articles must be unpublished before deletion.');
    }
    await tx.delete(articles).where(eq(articles.id, id));
  });
}

/** Full article for the editor or preview, enforcing visibility. */
export async function getArticleForEditor(actor: Actor, id: string) {
  const article = await db.query.articles.findFirst({
    where: eq(articles.id, id),
    with: {
      author: true,
      category: true,
      featuredImage: true,
      articleTags: { with: { tag: true } },
    },
  });
  if (!article || !canViewArticle(actor, article))
    throw new DomainError('not_found', 'Article not found.');
  return { ...article, tags: article.articleTags.map((at) => at.tag) };
}

export type AdminArticleFilter = { status?: ArticleStatus; q?: string; page?: number };
export const ADMIN_PAGE_SIZE = 25;

export async function listArticlesForAdmin(actor: Actor, filter: AdminArticleFilter = {}) {
  const conditions: SQL[] = [];
  if (actor.role === 'author') conditions.push(eq(articles.createdBy, actor.id));
  if (filter.status) conditions.push(eq(articles.status, filter.status));
  if (filter.q) {
    const pattern = `%${filter.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    const match = or(ilike(articles.title, pattern), ilike(articles.slug, pattern));
    if (match) conditions.push(match);
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const page = Math.max(1, filter.page ?? 1);

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        status: articles.status,
        featured: articles.featured,
        updatedAt: articles.updatedAt,
        publishedAt: articles.publishedAt,
        createdBy: articles.createdBy,
        authorName: authors.name,
        categoryName: categories.name,
      })
      .from(articles)
      .innerJoin(authors, eq(authors.id, articles.authorId))
      .innerJoin(categories, eq(categories.id, articles.categoryId))
      .where(where)
      .orderBy(desc(articles.updatedAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((page - 1) * ADMIN_PAGE_SIZE),
    db.select({ n: count() }).from(articles).where(where),
  ]);
  return {
    rows,
    total: total?.n ?? 0,
    page,
    pageCount: Math.max(1, Math.ceil((total?.n ?? 0) / ADMIN_PAGE_SIZE)),
  };
}

export async function getDashboardStats(actor: Actor) {
  const scope = actor.role === 'author' ? eq(articles.createdBy, actor.id) : undefined;
  const [counts] = await db
    .select({
      total: count(),
      published: sql<number>`count(*) filter (where ${articles.status} = 'published')`.mapWith(
        Number,
      ),
      drafts: sql<number>`count(*) filter (where ${articles.status} = 'draft')`.mapWith(Number),
      review: sql<number>`count(*) filter (where ${articles.status} = 'review')`.mapWith(Number),
      archived: sql<number>`count(*) filter (where ${articles.status} = 'archived')`.mapWith(
        Number,
      ),
    })
    .from(articles)
    .where(scope);
  const recent = await db
    .select({
      id: articles.id,
      title: articles.title,
      status: articles.status,
      updatedAt: articles.updatedAt,
      authorName: authors.name,
      createdBy: articles.createdBy,
    })
    .from(articles)
    .innerJoin(authors, eq(authors.id, articles.authorId))
    .where(scope)
    .orderBy(desc(articles.updatedAt))
    .limit(8);
  return {
    counts: counts ?? { total: 0, published: 0, drafts: 0, review: 0, archived: 0 },
    recent,
  };
}

/** Options for the editor's selects. */
export async function getEditorOptions() {
  const [authorRows, categoryRows, recentMedia] = await Promise.all([
    db.select({ id: authors.id, name: authors.name }).from(authors).orderBy(authors.name),
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .orderBy(categories.displayOrder),
    db
      .select({
        id: media.id,
        storageKey: media.storageKey,
        altText: media.altText,
        originalFilename: media.originalFilename,
      })
      .from(media)
      .orderBy(desc(media.createdAt))
      .limit(24),
  ]);
  return { authors: authorRows, categories: categoryRows, recentMedia };
}

export async function getUserName(id: string | null): Promise<string | null> {
  if (!id) return null;
  const [row] = await db.select({ name: users.name }).from(users).where(eq(users.id, id));
  return row?.name ?? null;
}
