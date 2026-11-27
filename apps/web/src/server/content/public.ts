import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  inArray,
  lte,
  ne,
  notInArray,
  sql,
  type SQL,
} from 'drizzle-orm';
import { db } from '@/server/db';
import { articles, articleTags, authors, categories, media, tags } from '@/server/db/schema';

/**
 * Public read model. EVERY query in this module goes through `published()`, which is the single
 * definition of "visible to readers": status = 'published' AND published_at <= now().
 * Drafts, review copies and archived pieces cannot reach the homepage, archives, search, related
 * stories, RSS or the sitemap because none of those queries can be built without it.
 */
export function published(...extra: (SQL | undefined)[]): SQL {
  const condition = and(
    eq(articles.status, 'published'),
    lte(articles.publishedAt, sql`now()`),
    ...extra,
  );
  if (!condition) throw new Error('unreachable');
  return condition;
}

export const PAGE_SIZE = 12;

const cardFields = {
  id: articles.id,
  title: articles.title,
  slug: articles.slug,
  dek: articles.dek,
  excerpt: articles.excerpt,
  featured: articles.featured,
  readingTime: articles.readingTime,
  publishedAt: articles.publishedAt,
  revisedAt: articles.revisedAt,
  author: { name: authors.name, slug: authors.slug },
  category: { name: categories.name, slug: categories.slug },
  image: {
    storageKey: media.storageKey,
    altText: media.altText,
    width: media.width,
    height: media.height,
  },
};

function cards() {
  return db
    .select(cardFields)
    .from(articles)
    .innerJoin(authors, eq(authors.id, articles.authorId))
    .innerJoin(categories, eq(categories.id, articles.categoryId))
    .leftJoin(media, eq(media.id, articles.featuredImageId));
}

type RawCard = Awaited<ReturnType<ReturnType<typeof cards>['execute']>>[number];

export type ArticleCard = Omit<RawCard, 'image' | 'publishedAt'> & {
  publishedAt: Date;
  image: {
    storageKey: string;
    altText: string;
    width: number | null;
    height: number | null;
  } | null;
};

function toCard(row: RawCard): ArticleCard {
  return {
    ...row,
    // published() guarantees a date; the fallback only satisfies the type system.
    publishedAt: row.publishedAt ?? new Date(0),
    image: row.image?.storageKey ? (row.image as ArticleCard['image']) : null,
  };
}

const newestFirst = [desc(articles.publishedAt), desc(articles.id)];

export async function getLatest(limit: number, excludeIds: string[] = []): Promise<ArticleCard[]> {
  const rows = await cards()
    .where(published(excludeIds.length ? notInArray(articles.id, excludeIds) : undefined))
    .orderBy(...newestFirst)
    .limit(limit);
  return rows.map(toCard);
}

export async function getHomepage(sectionSlugs: { highlights: string[]; opinion: string }) {
  const featured = (
    await cards()
      .where(published(eq(articles.featured, true)))
      .orderBy(...newestFirst)
      .limit(4)
  ).map(toCard);
  const used = featured.map((a) => a.id);
  // Fill the front with the newest stories if fewer than four are marked featured.
  const fill = featured.length < 4 ? await getLatest(4 - featured.length, used) : [];
  const front = [...featured, ...fill];
  const [lead, ...secondary] = front;
  const frontIds = front.map((a) => a.id);

  const latest = await getLatest(8, frontIds);
  const highlightSections = await Promise.all(
    sectionSlugs.highlights.map(async (slug) => ({
      category: await getCategoryBySlug(slug),
      // Sections exclude only the lead, so a sparse archive still fills every band.
      articles: await getByCategorySlug(slug, 4, lead ? [lead.id] : []),
    })),
  );
  const opinion = {
    category: await getCategoryBySlug(sectionSlugs.opinion),
    articles: await getByCategorySlug(sectionSlugs.opinion, 4, lead ? [lead.id] : []),
  };
  return { lead: lead ?? null, secondary, latest, highlightSections, opinion };
}

async function getByCategorySlug(slug: string, limit: number, excludeIds: string[]) {
  const rows = await cards()
    .where(
      published(
        eq(categories.slug, slug),
        excludeIds.length ? notInArray(articles.id, excludeIds) : undefined,
      ),
    )
    .orderBy(...newestFirst)
    .limit(limit);
  return rows.map(toCard);
}

/** A published article with everything the article page needs, or null (→ 404). */
export async function getPublishedArticle(slug: string) {
  const article = await db.query.articles.findFirst({
    where: published(eq(articles.slug, slug), eq(articles.locale, 'en')),
    with: {
      author: { with: { avatar: true } },
      category: true,
      featuredImage: true,
      articleTags: { with: { tag: true } },
    },
  });
  if (!article) return null;
  return {
    ...article,
    publishedAt: article.publishedAt ?? new Date(0),
    tags: article.articleTags.map((t) => t.tag),
  };
}

/** Same category or shared tags, ranked by overlap. Only published articles are candidates. */
export async function getRelated(
  article: { id: string; categoryId: string },
  limit = 3,
): Promise<ArticleCard[]> {
  const sharedTags = sql<number>`(
    select count(*) from ${articleTags} t
    join ${articleTags} m on m.tag_id = t.tag_id and m.article_id = ${article.id}
    where t.article_id = ${articles.id}
  )`;
  const score = sql`(${sharedTags} * 2 + case when ${articles.categoryId} = ${article.categoryId} then 1 else 0 end)`;
  const rows = await cards()
    .where(published(ne(articles.id, article.id), sql`${score} > 0`))
    .orderBy(desc(score), ...newestFirst)
    .limit(limit);
  return rows.map(toCard);
}

export type Page<T> = { items: T[]; page: number; pageCount: number; total: number };

async function paginate(where: SQL, page: number): Promise<Page<ArticleCard>> {
  const current = Math.max(1, page);
  const [rows, [total]] = await Promise.all([
    cards()
      .where(where)
      .orderBy(...newestFirst)
      .limit(PAGE_SIZE)
      .offset((current - 1) * PAGE_SIZE),
    db
      .select({ n: count() })
      .from(articles)
      .innerJoin(categories, eq(categories.id, articles.categoryId))
      .where(where),
  ]);
  const n = total?.n ?? 0;
  return {
    items: rows.map(toCard),
    page: current,
    pageCount: Math.max(1, Math.ceil(n / PAGE_SIZE)),
    total: n,
  };
}

export async function getCategoryBySlug(slug: string) {
  const [row] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return row ?? null;
}

export async function listCategoryArticles(categoryId: string, page: number) {
  return paginate(published(eq(articles.categoryId, categoryId)), page);
}

export async function getAuthorBySlug(slug: string) {
  const author = await db.query.authors.findFirst({
    where: eq(authors.slug, slug),
    with: { avatar: true },
  });
  return author ?? null;
}

export async function listAuthorArticles(authorId: string, page: number) {
  return paginate(published(eq(articles.authorId, authorId)), page);
}

export async function getTagBySlug(slug: string) {
  const [row] = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1);
  return row ?? null;
}

export async function listTagArticles(tagId: string, page: number) {
  const tagged = exists(
    db
      .select({ one: sql`1` })
      .from(articleTags)
      .where(and(eq(articleTags.articleId, articles.id), eq(articleTags.tagId, tagId))),
  );
  return paginate(published(tagged), page);
}

export const MAX_QUERY_LENGTH = 200;

/** Full-text search over published titles, deks, excerpts and body text. */
export async function searchArticles(rawQuery: string, page: number): Promise<Page<ArticleCard>> {
  const q = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);
  const current = Math.max(1, page);
  if (!q) return { items: [], page: 1, pageCount: 1, total: 0 };
  const tsquery = sql`websearch_to_tsquery('english', ${q})`;
  const where = published(sql`${articles.search} @@ ${tsquery}`);
  const [rows, [total]] = await Promise.all([
    cards()
      .where(where)
      .orderBy(desc(sql`ts_rank_cd(${articles.search}, ${tsquery})`), ...newestFirst)
      .limit(PAGE_SIZE)
      .offset((current - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(articles).where(where),
  ]);
  const n = total?.n ?? 0;
  return {
    items: rows.map(toCard),
    page: current,
    pageCount: Math.max(1, Math.ceil(n / PAGE_SIZE)),
    total: n,
  };
}

export async function listNavCategories() {
  return db
    .select({ name: categories.name, slug: categories.slug })
    .from(categories)
    .orderBy(asc(categories.displayOrder), asc(categories.name));
}

export async function getFeedArticles(limit = 30) {
  return db
    .select({
      title: articles.title,
      slug: articles.slug,
      dek: articles.dek,
      excerpt: articles.excerpt,
      publishedAt: articles.publishedAt,
      authorName: authors.name,
      categoryName: categories.name,
    })
    .from(articles)
    .innerJoin(authors, eq(authors.id, articles.authorId))
    .innerJoin(categories, eq(categories.id, articles.categoryId))
    .where(published())
    .orderBy(...newestFirst)
    .limit(limit);
}

export async function getSitemapEntries() {
  const [articleRows, categoryRows, authorRows] = await Promise.all([
    db
      .select({ slug: articles.slug, updatedAt: articles.updatedAt })
      .from(articles)
      .where(published())
      .orderBy(...newestFirst),
    db.select({ slug: categories.slug }).from(categories),
    db
      .selectDistinct({ slug: authors.slug })
      .from(authors)
      .innerJoin(articles, eq(articles.authorId, authors.id))
      .where(published()),
  ]);
  return { articles: articleRows, categories: categoryRows, authors: authorRows };
}

export async function getTagsForArticles(ids: string[]) {
  if (!ids.length) return [];
  return db
    .select({ articleId: articleTags.articleId, name: tags.name, slug: tags.slug })
    .from(articleTags)
    .innerJoin(tags, eq(tags.id, articleTags.tagId))
    .where(inArray(articleTags.articleId, ids));
}
