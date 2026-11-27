# Architecture

## Overview

One Next.js (App Router) application serves both the public publication and the editorial CMS,
backed by PostgreSQL.

```text
Browser ──► Next.js (apps/web)
              ├── public pages        server components, read-only, published content only
              ├── /admin               authenticated CMS (server components + a few client islands)
              ├── server actions       every CMS mutation
              ├── route handlers       /media/*, /rss.xml, /sitemap.xml, /robots.txt, /admin/api/media
              └── src/server/*         domain layer ──► PostgreSQL (Drizzle ORM)
                                                    └► MediaStorage (local disk; S3-compatible later)
```

### Why one application (and not the previous Next.js + Express split)

The bootstrap repository had an Express service with a single health endpoint. Keeping two
deployables would have meant two auth surfaces, cross-origin session handling and duplicated
validation before any feature existed. The domain logic lives in framework-independent modules
under `src/server/`, so extracting an API later (for a mobile app, partners, etc.) means adding
route handlers on top of the same functions, not rewriting them.

No Redis, queues, search engine or GraphQL: PostgreSQL covers sessions, rate limiting and
full-text search at MVP scale.

## Code layout (`apps/web/src`)

| Path                                    | Responsibility                                                                               |
| --------------------------------------- | -------------------------------------------------------------------------------------------- |
| `config/site.ts`                        | Publication identity (name, description, social links, timezone). Change branding here only. |
| `lib/`                                  | Pure helpers safe for client and server: slugs, dates, SEO escaping, the rich-text format.   |
| `lib/rich-text/`                        | Article body format: Zod allow-list schema, plain-text projection, safe React renderer.      |
| `server/env.ts`                         | Zod-validated environment, parsed lazily.                                                    |
| `server/db/`                            | Drizzle schema, connection. Migrations live in `apps/web/drizzle/`.                          |
| `server/auth/`                          | Password hashing, sessions, login throttling, request helpers (`requireUser`).               |
| `server/content/workflow.ts`            | Pure permission and status-transition rules.                                                 |
| `server/content/editorial.ts`           | Article mutations and CMS reads (authorization enforced here).                               |
| `server/content/public.ts`              | Public read model. Every query is built on `published()`.                                    |
| `server/content/taxonomy.ts`            | Sections, tags, bylines.                                                                     |
| `server/media/`                         | Upload validation (magic-byte sniffing), storage abstraction.                                |
| `app/(public)/`                         | Reader-facing routes. `(front)` uses the full masthead, `(pages)` a compact header.          |
| `app/admin/`                            | CMS. `actions.ts` holds every server action; `(cms)/layout.tsx` requires a session.          |
| `components/public`, `components/admin` | Presentation only. No database access.                                                       |
| `proxy.ts`                              | Optimistic redirect for `/admin` without a cookie (not the security boundary).               |

Rules of thumb:

- Pages never touch the database directly; they call `server/content/*`.
- Mutations go through server actions that authenticate, validate, then call the domain layer,
  which authorizes. Authorization never lives only in the UI.
- Client components exist only where interaction requires it: the article editor, image picker,
  login form and small form wrappers.

## Rendering & caching

Public and admin pages are dynamically rendered (`force-dynamic`), so publishing and
unpublishing take effect on the next request and there is no cache that could keep a withdrawn
article alive. Uploaded media is served with immutable caching because storage keys are never
reused. Adding a CDN/ISR layer later is an optimisation that must preserve the "unpublish is
immediate" guarantee (e.g. tag-based revalidation on every status change).

## Localisation readiness

Articles carry a `locale` (`en` | `bn`) and slugs are unique per locale, so Bengali editions can
be added without schema rework. Search uses the `english` text-search configuration today; Bengali
content will need a `simple` (or custom) configuration keyed on locale. UI strings are not yet
externalised.
