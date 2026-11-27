import { relations, sql, type SQL } from 'drizzle-orm';
import {
  boolean,
  check,
  customType,
  index,
  type AnyPgColumn,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { RichTextDoc } from '@/lib/rich-text/schema';

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

/** All timestamps are `timestamptz` and stored in UTC. */
const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const userRole = pgEnum('user_role', ['admin', 'editor', 'author']);
export const articleStatus = pgEnum('article_status', ['draft', 'review', 'published', 'archived']);
export const contentLocale = pgEnum('content_locale', ['en', 'bn']);

export type UserRole = (typeof userRole.enumValues)[number];
export type ArticleStatus = (typeof articleStatus.enumValues)[number];
export type ContentLocale = (typeof contentLocale.enumValues)[number];

export type SocialLinks = Partial<
  Record<'website' | 'x' | 'instagram' | 'facebook' | 'mastodon', string>
>;

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export const media = pgTable(
  'media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storageKey: varchar('storage_key', { length: 200 }).notNull().unique(),
    originalFilename: varchar('original_filename', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    fileSize: integer('file_size').notNull(),
    width: integer('width'),
    height: integer('height'),
    altText: text('alt_text').notNull().default(''),
    credit: text('credit'),
    uploadedBy: uuid('uploaded_by').references((): AnyPgColumn => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('media_created_at_idx').on(t.createdAt.desc()),
    check('media_file_size_positive', sql`${t.fileSize} > 0`),
  ],
);

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

/** Public bylines. Decoupled from login accounts: contributors need not have a CMS account. */
export const authors = pgTable('authors', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 160 }).notNull(),
  slug: varchar('slug', { length: 160 }).notNull().unique(),
  biography: text('biography').notNull().default(''),
  avatarMediaId: uuid('avatar_media_id').references((): AnyPgColumn => media.id, {
    onDelete: 'set null',
  }),
  socialLinks: jsonb('social_links').$type<SocialLinks>().notNull().default({}),
  ...timestamps,
});

/** CMS accounts. There is no public registration; accounts are created via `pnpm user:create`. */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 160 }).notNull(),
    email: varchar('email', { length: 320 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    role: userRole('role').notNull(),
    /** The byline this account writes under. Required for authors, optional for editors. */
    authorId: uuid('author_id').references((): AnyPgColumn => authors.id, { onDelete: 'set null' }),
    disabledAt: timestamp('disabled_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('users_email_lower_idx').on(sql`lower(${t.email})`),
    check('users_email_is_lowercase', sql`${t.email} = lower(${t.email})`),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    /** SHA-256 of the session token. The raw token only ever exists in the user's cookie. */
    id: varchar('id', { length: 64 }).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sessions_user_idx').on(t.userId), index('sessions_expires_idx').on(t.expiresAt)],
);

export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 320 }).notNull(),
    ip: varchar('ip', { length: 64 }).notNull(),
    success: boolean('success').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('login_attempts_email_idx').on(t.email, t.createdAt),
    index('login_attempts_ip_idx').on(t.ip, t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 120 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    description: text('description').notNull().default(''),
    displayOrder: integer('display_order').notNull().default(0),
    ...timestamps,
  },
  (t) => [index('categories_display_order_idx').on(t.displayOrder)],
);

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 80 }).notNull(),
  slug: varchar('slug', { length: 80 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

export const articles = pgTable(
  'articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Content language. Slugs are unique per locale so translations can share a slug later. */
    locale: contentLocale('locale').notNull().default('en'),
    title: varchar('title', { length: 300 }).notNull(),
    slug: varchar('slug', { length: 200 }).notNull(),
    dek: text('dek').notNull().default(''),
    excerpt: text('excerpt').notNull().default(''),
    /** Validated ProseMirror/Tiptap JSON document. Never raw HTML. */
    body: jsonb('body').$type<RichTextDoc>().notNull(),
    /** Plain-text projection of `body`, derived on save. Used for search and reading time. */
    bodyText: text('body_text').notNull().default(''),
    featuredImageId: uuid('featured_image_id').references(() => media.id, { onDelete: 'set null' }),
    imageCaption: text('image_caption').notNull().default(''),
    imageCredit: text('image_credit').notNull().default(''),
    authorId: uuid('author_id')
      .notNull()
      .references(() => authors.id, { onDelete: 'restrict' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    /** The CMS account that created the article. Drives author-role ownership checks. */
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    status: articleStatus('status').notNull().default('draft'),
    featured: boolean('featured').notNull().default(false),
    readingTime: integer('reading_time').notNull().default(1),
    seoTitle: varchar('seo_title', { length: 300 }).notNull().default(''),
    seoDescription: text('seo_description').notNull().default(''),
    /** First publication time. Preserved across unpublish/republish. */
    publishedAt: timestamp('published_at', { withTimezone: true }),
    /** Set when a published article's content is edited; drives the public "Updated" line. */
    revisedAt: timestamp('revised_at', { withTimezone: true }),
    /** Optimistic-concurrency counter: a save must name the revision it was based on. */
    revision: integer('revision').notNull().default(1),
    search: tsvector('search').generatedAlwaysAs(
      (): SQL => sql`
        setweight(to_tsvector('english'::regconfig, coalesce(${articles.title}, '')), 'A') ||
        setweight(to_tsvector('english'::regconfig, coalesce(${articles.dek}, '') || ' ' || coalesce(${articles.excerpt}, '')), 'B') ||
        setweight(to_tsvector('english'::regconfig, coalesce(${articles.bodyText}, '')), 'C')`,
    ),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('articles_locale_slug_idx').on(t.locale, t.slug),
    index('articles_status_published_idx').on(t.status, t.publishedAt.desc()),
    index('articles_category_published_idx').on(t.categoryId, t.publishedAt.desc()),
    index('articles_author_published_idx').on(t.authorId, t.publishedAt.desc()),
    index('articles_created_by_idx').on(t.createdBy),
    index('articles_updated_at_idx').on(t.updatedAt.desc()),
    index('articles_search_idx').using('gin', t.search),
    check(
      'articles_published_has_date',
      sql`${t.status} <> 'published' OR ${t.publishedAt} IS NOT NULL`,
    ),
    check('articles_slug_format', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check('articles_reading_time_positive', sql`${t.readingTime} > 0`),
  ],
);

export const articleTags = pgTable(
  'article_tags',
  {
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.articleId, t.tagId] }),
    index('article_tags_tag_idx').on(t.tagId),
  ],
);

// ---------------------------------------------------------------------------
// Relations (for the relational query API)
// ---------------------------------------------------------------------------

export const articlesRelations = relations(articles, ({ one, many }) => ({
  author: one(authors, { fields: [articles.authorId], references: [authors.id] }),
  category: one(categories, { fields: [articles.categoryId], references: [categories.id] }),
  featuredImage: one(media, { fields: [articles.featuredImageId], references: [media.id] }),
  creator: one(users, { fields: [articles.createdBy], references: [users.id] }),
  articleTags: many(articleTags),
}));

export const articleTagsRelations = relations(articleTags, ({ one }) => ({
  article: one(articles, { fields: [articleTags.articleId], references: [articles.id] }),
  tag: one(tags, { fields: [articleTags.tagId], references: [tags.id] }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({ articleTags: many(articleTags) }));

export const authorsRelations = relations(authors, ({ one, many }) => ({
  avatar: one(media, { fields: [authors.avatarMediaId], references: [media.id] }),
  articles: many(articles),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  articles: many(articles),
}));

export const usersRelations = relations(users, ({ one }) => ({
  author: one(authors, { fields: [users.authorId], references: [authors.id] }),
}));

export type User = typeof users.$inferSelect;
export type Author = typeof authors.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type Media = typeof media.$inferSelect;
