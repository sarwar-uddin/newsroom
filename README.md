# Newsroom

A self-hosted publishing platform for small independent newsrooms: a fast, readable public site and
an editorial CMS with a real draft → review → publish workflow, built as one Next.js application on
PostgreSQL.

## About

Small publications usually pick between a heavyweight CMS they can't fully control and a static
blog with no editorial process. Newsroom sits in between. It models how a newsroom actually works
(writers, editors, review, bylines) and keeps the moving parts few: one app, one
database, no third-party scripts.

The design priorities:

- **Editorial rules are enforced on the server.** Roles, ownership and status transitions are pure
  functions checked on every mutation, not hidden buttons.
- **Unpublishing is immediate.** Public pages render on request, so a withdrawn article disappears
  from every surface (pages, search, RSS, sitemap) on the next load.
- **Content is safe by construction.** Article bodies are stored as an allow-listed JSON document
  and rendered node by node, never as raw HTML.
- **Readers aren't tracked.** No analytics, trackers or embedded third-party scripts.

## Features

**Public site**

- Newspaper-style front page with featured stories, article pages, and section, author and tag
  archives
- Full-text search on PostgreSQL
- RSS feed, sitemap, `robots.txt`, and Open Graph, Twitter and Schema.org metadata
- About, Contact and Privacy pages

**Editorial CMS (`/admin`)**

- Rich-text editor (Tiptap) with preview and image uploads
- Draft → review → published → archived workflow, with publish, unpublish, withdraw and restore
- Three roles (admin, editor, author) with object-level permissions: authors only ever see their
  own work
- Sections, bylines and tags; an "Updated" date on edits to published articles
- Accounts created from the command line only: no public sign-up

**Engineering**

- Domain layer (`src/server/`) independent of the framework: pages and server actions call it and
  never touch the database directly
- Argon2id passwords, hashed session tokens, login throttling, CSRF origin checks
- Uploads typed by magic bytes, served with `nosniff` and a sandboxing CSP
- Content model has a per-article `locale` with slugs unique per locale, so a second language can
  be added without reworking the schema
- Vitest unit and integration tests against a disposable PostgreSQL, plus Playwright end-to-end
  tests

## Stack

Next.js 16 (App Router, React 19, TypeScript strict) · Tailwind CSS 4 · PostgreSQL 18 · Drizzle
ORM · Zod · Tiptap · Argon2id (`@node-rs/argon2`) · Vitest · Playwright · pnpm workspace · Docker
Compose

```text
Browser ──► Next.js (apps/web)
              ├── public pages        server components, published content only
              ├── /admin              authenticated CMS
              ├── server actions      every CMS mutation
              ├── route handlers      /media/*, /rss.xml, /sitemap.xml, /robots.txt
              └── src/server/*        domain layer ──► PostgreSQL (Drizzle)
                                                   └► media storage (local disk)
```

[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) explains the design and the reasons behind it.

## Repository layout

```text
apps/web/
  src/app/(public)/     reader-facing routes
  src/app/admin/        CMS routes and server actions
  src/server/           domain layer: db, auth, content, media
  src/lib/              shared helpers (rich-text format, slugs, dates, SEO)
  src/config/site.ts    publication identity
  drizzle/              SQL migrations
  scripts/              migrate, seed, create-user
  tests/                Vitest unit and integration tests
  e2e/                  Playwright tests
docs/                   architecture, database, workflow, security, deployment
docker-compose.yml      PostgreSQL (dev) and an optional disposable test database
```

## Getting started

**Prerequisites:** Node.js ≥ 22, pnpm 12 (`corepack enable`), and Docker with Compose (or any
PostgreSQL ≥ 16 that `DATABASE_URL` points at).

```bash
pnpm install
cp .env.example .env              # set real passwords; keep DATABASE_URL in sync with POSTGRES_*
docker compose up -d postgres     # PostgreSQL on 127.0.0.1:5433
pnpm db:migrate                   # create the schema
pnpm db:seed                      # optional: demonstration content (empty database only)
pnpm dev                          # http://localhost:3000, CMS at /admin
```

The single `.env` at the repository root is read by Docker Compose, the app and all scripts.

### Create the first administrator

```bash
pnpm user:create --email you@example.org --name "Your Name" --role admin
```

You're prompted for the password (at least 12 characters, hidden input). For automation, pipe it
on stdin. Other roles:

```bash
pnpm user:create --email ed@example.org --name "An Editor" --role editor
pnpm user:create --email w@example.org --name "A Writer" --role author        # creates their byline
pnpm user:create --email w@example.org --name "A Writer" --role author --byline existing-slug
```

### Configure the publication

The publication's name, description, social links and timezone live in
[`apps/web/src/config/site.ts`](apps/web/src/config/site.ts). The name defaults to the placeholder
"Working Title" and can be set with `NEXT_PUBLIC_SITE_NAME`.

## Tests

```bash
pnpm typecheck
pnpm lint
pnpm test                         # unit tests; integration tests skip without TEST_DATABASE_URL
```

Integration and end-to-end tests need a **separate, disposable** database. They truncate or drop
everything in it, and refuse to run if it equals `DATABASE_URL`.

```bash
docker compose --profile test up -d postgres-test     # 127.0.0.1:5434, in-memory (tmpfs)
pnpm test                         # unit + integration (TEST_DATABASE_URL from .env)
pnpm build && pnpm test:e2e       # Playwright against the production build on port 3100
```

Playwright needs Chromium: run `pnpm --filter web exec playwright install chromium` once, or set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium` to use a system browser.

## Production

```bash
pnpm build
pnpm start
```

Read [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) first. Local-disk media storage doesn't work on
serverless hosts.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [Editorial workflow & roles](docs/EDITORIAL_WORKFLOW.md)
- [Security](docs/SECURITY.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Git workflow](docs/git-workflow.md)

## Status

The MVP is complete and tested locally but not deployed yet. The seed content is fictional
demonstration material, labelled as such on every page; remove it before launch. Known gaps are
listed under "Remaining production hardening" in [`docs/SECURITY.md`](docs/SECURITY.md).

## License

Copyright © 2026 Sarwar Uddin

Newsroom is free software: you can redistribute it and/or modify it under the terms of the
[GNU Affero General Public License](LICENSE) as published by the Free Software Foundation, either
version 3 of the License, or (at your option) any later version. If you run a modified version on
a server, the AGPL requires you to offer its source code to the users who interact with it.
