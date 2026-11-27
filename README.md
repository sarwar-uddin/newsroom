# Newsroom

The publishing platform for an independent, Bangladesh-focused digital publication covering
investigations, politics and power, society, counterculture, arts and long-form opinion. English
first, with the content model ready for Bengali.

The publication name is a placeholder ("Working Title"). Change it in
`apps/web/src/config/site.ts`.

It provides:

- **Public site:** newspaper-style homepage, article pages, section/author/tag archives, full-text
  search, About/Contact/Privacy, RSS, sitemap, robots.txt, Open Graph/Twitter/Schema.org metadata.
- **Editorial CMS (`/admin`):** login, dashboard, rich-text editor, draft → review → publish
  workflow with role-based permissions, preview, image uploads, sections, bylines, tags.

## Stack

Next.js 16 (App Router, React 19, TypeScript strict) · Tailwind CSS 4 · PostgreSQL 18 ·
Drizzle ORM · Zod · Tiptap · Argon2id (`@node-rs/argon2`) · Vitest · Playwright · pnpm workspace ·
Docker Compose.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the design and the reasons behind it.

## Repository layout

```text
apps/web/
  src/app/(public)/     reader-facing routes
  src/app/admin/        CMS routes + server actions
  src/server/           domain layer: db, auth, content, media
  src/lib/              shared helpers (rich-text format, slugs, dates, SEO)
  src/config/site.ts    publication identity
  drizzle/              SQL migrations
  scripts/              migrate, seed, create-user
  tests/                Vitest unit + integration tests
  e2e/                  Playwright tests
docs/                   architecture, database, workflow, security, deployment
docker-compose.yml      PostgreSQL (dev) + optional disposable test database
```

## Prerequisites

- Node.js ≥ 22 (developed on 26)
- pnpm 12 (`corepack enable` or install pnpm directly)
- Docker with Docker Compose (or any PostgreSQL ≥ 16 you point `DATABASE_URL` at)

## Setup

```bash
pnpm install
cp .env.example .env              # then edit: set real passwords; keep DATABASE_URL in sync with POSTGRES_*
docker compose up -d postgres     # PostgreSQL on 127.0.0.1:5433
pnpm db:migrate                   # create the schema
pnpm db:seed                      # optional: demonstration content (empty database only)
```

The single `.env` at the repository root is read by Docker Compose, the Next.js app and all
scripts.

### Create the first administrator

```bash
pnpm user:create --email you@example.org --name "Your Name" --role admin
```

You will be prompted for a password (min. 12 characters, hidden input). Other roles:

```bash
pnpm user:create --email ed@example.org --name "An Editor" --role editor
pnpm user:create --email w@example.org --name "A Writer" --role author        # creates their byline
pnpm user:create --email w@example.org --name "A Writer" --role author --byline existing-slug
```

There is no public sign-up. For automation, the password can be piped on stdin.

### Run

```bash
pnpm dev                          # http://localhost:3000, CMS at http://localhost:3000/admin
```

## Tests

```bash
pnpm typecheck
pnpm lint
pnpm test                         # unit tests; integration tests are skipped without TEST_DATABASE_URL
```

Integration and end-to-end tests need a **separate, disposable** database: they truncate or drop
everything in it, and refuse to run if it equals `DATABASE_URL`.

```bash
docker compose --profile test up -d postgres-test     # 127.0.0.1:5434, in-memory (tmpfs)
# TEST_DATABASE_URL in .env points at it (see .env.example)
pnpm test                         # unit + integration
pnpm build && pnpm test:e2e       # Playwright against the production build on port 3100
```

Playwright needs a Chromium: run `pnpm --filter web exec playwright install chromium` once, or
set `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium` to use a system browser.

## Production build

```bash
pnpm build
pnpm start
```

Read [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) first. In particular, local-disk media storage
does not work on serverless hosts.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [Editorial workflow & roles](docs/EDITORIAL_WORKFLOW.md)
- [Security](docs/SECURITY.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Git workflow](docs/git-workflow.md)

## Status

MVP verified locally; not yet deployed. Seeded content is fictional demonstration material and is
labelled as such on every page. Remove it before launch.
