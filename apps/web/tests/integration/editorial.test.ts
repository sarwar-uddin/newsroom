import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { closeDb, db } from '@/server/db';
import { articles, articleTags, tags } from '@/server/db/schema';
import {
  createArticle,
  deleteArticle,
  getArticleForEditor,
  listArticlesForAdmin,
  transitionArticle,
  updateArticle,
} from '@/server/content/editorial';
import { DomainError } from '@/server/content/errors';
import {
  getFeedArticles,
  getHomepage,
  getLatest,
  getPublishedArticle,
  getRelated,
  getSitemapEntries,
  listCategoryArticles,
  listTagArticles,
  getTagBySlug,
  listAuthorArticles,
  searchArticles,
} from '@/server/content/public';
import { articleForm, hasTestDb, makeFixtures, resetDb } from '../helpers';

type Fx = Awaited<ReturnType<typeof makeFixtures>>;

async function expectDomainError(p: Promise<unknown>, code: DomainError['code']) {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof DomainError && e.code === code);
}

describe.skipIf(!hasTestDb)('editorial workflow (database)', () => {
  let fx: Fx;
  const form = (o: Record<string, string> = {}) =>
    articleForm(o, { categoryId: fx.categories[0].id, authorId: fx.authors[0].id });

  beforeEach(async () => {
    await resetDb();
    fx = await makeFixtures();
  });
  afterAll(async () => {
    await closeDb();
  });

  it('creates a draft with derived fields and tags', async () => {
    const a = await createArticle(fx.editor, form());
    expect(a.status).toBe('draft');
    expect(a.slug).toBe('a-test-article');
    expect(a.bodyText).toContain('ownership');
    expect(a.readingTime).toBe(1);
    expect(a.publishedAt).toBeNull();
    expect(a.createdBy).toBe(fx.editor.id);
    const linked = await db
      .select({ slug: tags.slug })
      .from(articleTags)
      .innerJoin(tags, eq(tags.id, articleTags.tagId))
      .where(eq(articleTags.articleId, a.id));
    expect(linked.map((t) => t.slug).sort()).toEqual(['media', 'power']);
  });

  it('enforces slug uniqueness with a field error', async () => {
    await createArticle(fx.editor, form());
    await expect(createArticle(fx.editor, form())).rejects.toSatisfy(
      (e: unknown) => e instanceof DomainError && e.code === 'conflict' && 'slug' in e.fieldErrors,
    );
  });

  it('rejects invalid input with field errors', async () => {
    await expect(createArticle(fx.editor, form({ title: '' }))).rejects.toSatisfy(
      (e: unknown) => e instanceof DomainError && 'title' in e.fieldErrors,
    );
    await expectDomainError(createArticle(fx.editor, form({ slug: 'Bad Slug!' })), 'invalid');
    await expectDomainError(
      createArticle(fx.editor, form({ body: '{"type":"doc","content":[{"type":"html"}]}' })),
      'invalid',
    );
  });

  it('reuses and replaces tags on update', async () => {
    const a = await createArticle(fx.editor, form({ tags: 'Media' }));
    const b = await createArticle(fx.editor, form({ title: 'Second', tags: 'media, Culture' }));
    expect((await db.select().from(tags)).length).toBe(2);
    await updateArticle(fx.editor, a.id, form({ tags: '' }), a.revision);
    expect(await db.select().from(articleTags).where(eq(articleTags.articleId, a.id))).toHaveLength(
      0,
    );
    expect(await db.select().from(articleTags).where(eq(articleTags.articleId, b.id))).toHaveLength(
      2,
    );
  });

  it('moves through draft → review → published → draft → archived', async () => {
    const a = await createArticle(fx.author1, form(), 'submit');
    expect(a.status).toBe('review');
    const pub = await transitionArticle(fx.editor, a.id, 'publish');
    expect(pub.status).toBe('published');
    expect(pub.publishedAt).toBeInstanceOf(Date);
    const un = await transitionArticle(fx.editor, a.id, 'unpublish');
    expect(un.status).toBe('draft');
    expect(un.publishedAt?.getTime()).toBe(pub.publishedAt?.getTime()); // first publication time preserved
    expect((await transitionArticle(fx.editor, a.id, 'archive')).status).toBe('archived');
    await expectDomainError(transitionArticle(fx.editor, a.id, 'publish'), 'forbidden');
  });

  it('refuses to publish an empty article', async () => {
    const a = await createArticle(
      fx.editor,
      form({ body: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] }) }),
    );
    await expectDomainError(transitionArticle(fx.editor, a.id, 'publish'), 'invalid');
  });

  it('does not let authors publish, even by crafting intents', async () => {
    const a = await createArticle(fx.author1, form());
    await expectDomainError(transitionArticle(fx.author1, a.id, 'publish'), 'forbidden');
    await expectDomainError(
      updateArticle(fx.author1, a.id, form(), a.revision, 'publish'),
      'forbidden',
    );
    await expectDomainError(
      createArticle(fx.author1, form({ title: 'Sneaky' }), 'publish'),
      'forbidden',
    );
    expect(await db.select().from(articles).where(eq(articles.status, 'published'))).toHaveLength(
      0,
    );
  });

  it('forces an author’s own byline and ignores the featured flag', async () => {
    const a = await createArticle(fx.author1, form({ authorId: fx.authors[1].id, featured: 'on' }));
    expect(a.authorId).toBe(fx.authors[0].id);
    expect(a.featured).toBe(false);
  });

  it('prevents authors from reading or modifying other people’s drafts', async () => {
    const a = await createArticle(fx.author2, form());
    await expectDomainError(getArticleForEditor(fx.author1, a.id), 'not_found');
    await expectDomainError(
      updateArticle(fx.author1, a.id, form({ title: 'Hijacked' }), a.revision),
      'not_found',
    );
    await expectDomainError(transitionArticle(fx.author1, a.id, 'submit'), 'not_found');
    await expectDomainError(deleteArticle(fx.author1, a.id), 'not_found');
    const list = await listArticlesForAdmin(fx.author1);
    expect(list.rows.map((r) => r.id)).not.toContain(a.id);
  });

  it('locks an author’s article once it is in review', async () => {
    const a = await createArticle(fx.author1, form(), 'submit');
    await expectDomainError(
      updateArticle(fx.author1, a.id, form({ title: 'Changed' }), a.revision),
      'forbidden',
    );
    const back = await transitionArticle(fx.author1, a.id, 'withdraw');
    expect(back.status).toBe('draft');
    const edited = await updateArticle(fx.author1, a.id, form({ title: 'Changed' }), back.revision);
    expect(edited.title).toBe('Changed');
  });

  it('rejects stale saves (optimistic concurrency)', async () => {
    const a = await createArticle(fx.editor, form());
    await updateArticle(fx.editor, a.id, form({ title: 'Edit one' }), a.revision);
    await expectDomainError(
      updateArticle(fx.admin, a.id, form({ title: 'Edit two' }), a.revision),
      'stale',
    );
  });

  it('records a revision date when a published article is edited', async () => {
    const a = await createArticle(fx.editor, form(), 'publish');
    expect(a.revisedAt).toBeNull();
    const b = await updateArticle(fx.editor, a.id, form({ dek: 'Corrected dek' }), a.revision);
    expect(b.revisedAt).toBeInstanceOf(Date);
  });

  it('refuses to delete published articles', async () => {
    const a = await createArticle(fx.editor, form(), 'publish');
    await expectDomainError(deleteArticle(fx.admin, a.id), 'forbidden');
    await transitionArticle(fx.editor, a.id, 'unpublish');
    await deleteArticle(fx.admin, a.id);
    expect(await db.select().from(articles)).toHaveLength(0);
  });
});

describe.skipIf(!hasTestDb)('draft confidentiality on every public surface', () => {
  let fx: Fx;
  beforeEach(async () => {
    await resetDb();
    fx = await makeFixtures();
  });

  it('only ever returns published articles', async () => {
    const base = { categoryId: fx.categories[0].id, authorId: fx.authors[0].id };
    const pub = await createArticle(
      fx.editor,
      articleForm({ title: 'Public ownership story', tags: 'Secret' }, base),
      'publish',
    );
    const draft = await createArticle(
      fx.editor,
      articleForm({ title: 'Secret ownership draft', tags: 'Secret', featured: 'on' }, base),
    );
    const review = await createArticle(
      fx.editor,
      articleForm({ title: 'Secret ownership review', tags: 'Secret' }, base),
      'submit',
    );
    const archived = await createArticle(
      fx.editor,
      articleForm({ title: 'Secret ownership archived', tags: 'Secret' }, base),
      'publish',
    );
    await transitionArticle(fx.editor, archived.id, 'archive');
    const secretIds = [draft.id, review.id, archived.id];
    const secretSlugs = [draft.slug, review.slug, archived.slug];

    for (const slug of secretSlugs) expect(await getPublishedArticle(slug)).toBeNull();
    expect(await getPublishedArticle(pub.slug)).not.toBeNull();

    const ids = (rows: { id: string }[]) => rows.map((r) => r.id);
    const noSecrets = (got: string[]) => {
      expect(got).toContain(pub.id);
      for (const id of secretIds) expect(got).not.toContain(id);
    };
    noSecrets(ids(await getLatest(50)));
    noSecrets(ids((await searchArticles('ownership', 1)).items));
    noSecrets(ids((await listCategoryArticles(fx.categories[0].id, 1)).items));
    noSecrets(ids((await listAuthorArticles(fx.authors[0].id, 1)).items));
    const tag = await getTagBySlug('secret');
    noSecrets(ids((await listTagArticles(tag!.id, 1)).items));

    const home = await getHomepage({ highlights: ['investigations'], opinion: 'culture' });
    const homeIds = [
      home.lead,
      ...home.secondary,
      ...home.latest,
      ...home.highlightSections.flatMap((s) => s.articles),
    ]
      .filter((a): a is NonNullable<typeof a> => Boolean(a))
      .map((a) => a.id);
    noSecrets(homeIds);

    const feedSlugs = (await getFeedArticles()).map((a) => a.slug);
    const sitemapSlugs = (await getSitemapEntries()).articles.map((a) => a.slug);
    for (const s of secretSlugs) {
      expect(feedSlugs).not.toContain(s);
      expect(sitemapSlugs).not.toContain(s);
    }

    const other = await createArticle(
      fx.editor,
      articleForm({ title: 'Another public piece', tags: 'Secret' }, base),
      'publish',
    );
    const related = ids(await getRelated(other));
    expect(related).toContain(pub.id);
    for (const id of secretIds) expect(related).not.toContain(id);
  });

  it('excludes articles scheduled in the future', async () => {
    const base = { categoryId: fx.categories[0].id, authorId: fx.authors[0].id };
    const a = await createArticle(fx.editor, articleForm({}, base), 'publish');
    await db
      .update(articles)
      .set({ publishedAt: new Date(Date.now() + 86_400_000) })
      .where(eq(articles.id, a.id));
    expect(await getPublishedArticle(a.slug)).toBeNull();
    expect(await getLatest(10)).toHaveLength(0);
  });
});
