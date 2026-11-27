# Database

PostgreSQL (developed on 18). Schema is defined in `apps/web/src/server/db/schema.ts` and
versioned as SQL migrations in `apps/web/drizzle/`. All timestamps are `timestamptz` (UTC);
display uses `Asia/Dhaka` (`src/config/site.ts`).

## Commands

```bash
pnpm db:migrate     # apply migrations (safe to re-run)
pnpm db:generate    # after editing schema.ts: write a new migration; review the SQL, commit it
pnpm db:seed        # demo content, empty database only
```

Never change the database by hand; every change goes through a reviewed migration.

## Tables

| Table            | Purpose         | Notes                                                                                                                                                                 |
| ---------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`          | CMS accounts    | `role` enum `admin/editor/author`; unique `lower(email)`; email must be stored lowercase (CHECK); `author_id` → byline; `disabled_at` blocks login and kills sessions |
| `sessions`       | Login sessions  | PK is SHA-256 of the cookie token; cascades on user delete                                                                                                            |
| `login_attempts` | Throttling log  | indexed by email/time and IP/time; pruned after 24 h                                                                                                                  |
| `authors`        | Public bylines  | unique slug; `social_links` JSONB; avatar → `media` (set null)                                                                                                        |
| `categories`     | Sections        | unique slug; `display_order` drives navigation                                                                                                                        |
| `tags`           | Topics          | unique slug; created on demand from the editor                                                                                                                        |
| `articles`       | Content         | see below                                                                                                                                                             |
| `article_tags`   | M:N             | composite PK; cascades from both sides; index on `tag_id`                                                                                                             |
| `media`          | Uploaded images | unique `storage_key`; sniffed `mime_type`; dimensions; alt text; credit                                                                                               |

### `articles`

- `status` enum `draft | review | published | archived`.
- `body` JSONB: validated rich-text document (never HTML). `body_text` is its plain-text
  projection, derived on save, feeding search and `reading_time`.
- `search` is a **generated** `tsvector` (title weight A, dek+excerpt B, body C) with a GIN index.
- `published_at`: first publication; kept when unpublished so republishing keeps the date.
- `revised_at`: set when a published article's content is edited ("Updated" line).
- `revision`: optimistic-concurrency counter; a save must quote the revision it was based on.
- `created_by` → `users` (set null): drives author-role ownership.
- `locale` enum `en | bn`, unique `(locale, slug)`.

Constraints: `published ⇒ published_at IS NOT NULL`; slug format CHECK; reading time > 0.
Deleting an author or category that still has articles is **restricted**; images referenced by
articles are set to null if deleted.

Indexes: `(status, published_at desc)`, `(category_id, published_at desc)`,
`(author_id, published_at desc)`, `created_by`, `updated_at desc`, GIN on `search`.

## Visibility rule

"Public" means `status = 'published' AND published_at <= now()`. This is defined once, in
`published()` in `src/server/content/public.ts`, and every public query is built on it.
Integration tests assert drafts, review copies, archived and future-dated pieces never appear on
any public surface.
