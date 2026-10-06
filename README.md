# Newsroom

A serious, multilingual local news and media platform built as a production-oriented
portfolio project.

The initial target is a Bangla-first publication with English support, designed around
real editorial workflows rather than a generic blog.

## Project goals

- Publish and present journalism
- Support Bangla and English content
- Provide a real editorial backend
- Support authors, categories, tags, media, search, revisions, and corrections
- Provide strong SEO and accessibility
- Use PostgreSQL as the authoritative content store
- Build toward a deployable production system

## Stack

### Web

- Next.js
- React
- TypeScript

### API

- Node.js
- Express
- TypeScript
- Zod

### Database

- PostgreSQL
- Drizzle ORM

### Testing

- Vitest
- Supertest
- Playwright

### Infrastructure

- Docker Compose
- Nginx
- GitHub Actions

## Architecture

```text
Browser
   │
   ▼
Next.js web application
   │
   │ HTTP
   ▼
Express API
   │
   ▼
PostgreSQL
```

Development infrastructure currently provides PostgreSQL through Docker Compose.

## Repository structure

```text
newsroom/
├── apps/
│   ├── web/
│   └── api/
├── packages/
├── docs/
├── docker-compose.yml
├── .env.example
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## Local setup

Requirements:

- Node.js

- pnpm

- Docker

- Docker Compose

Install dependencies:

```bash
pnpm install
```

Copy the environment template:

```bash
cp .env.example .env
```

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Start the web application and API:

```bash
pnpm dev
```

The development services are:

- Web: [http://localhost:3000](http://localhost:3000)

- API: [http://localhost:4000](http://localhost:4000)

- PostgreSQL: localhost:5433

Check the API:

```bash
curl http://localhost:4000/api/health
```

## Quality checks

```bash
pnpm format:check
pnpm typecheck
pnpm lint
pnpm build
```

## Project status

The project is currently in M0 — Product framing + repository bootstrap.

The next milestone is M1 — PostgreSQL schema and content model.

See the project specification for the complete roadmap.

## Documentation

- `docs/architecture.md`

- `docs/database.md`

- `docs/api.md`

- `docs/editorial-model.md`

- `docs/deployment.md`

- `docs/git-workflow.md`

## Status

Planning and active development.
