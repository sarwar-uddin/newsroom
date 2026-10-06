# Architecture

## Current architecture

```text
Browser
   │
   ├── HTTP → Next.js web application
   │
   └── HTTP → Express API
                  │
                  ▼
             PostgreSQL
```

## Repository boundaries

### `apps/web`

Public-facing publication website.

Responsibilities:

- page rendering

- routing

- article presentation

- navigation

- localization UI

- SEO metadata

- reader interactions

### `apps/api`

Backend service.

Responsibilities:

- HTTP API

- validation

- authentication and authorization

- editorial business rules

- database access

- publication state

- media operations

### `packages`

Shared code that genuinely needs to be shared between applications.

Do not create shared packages before a real reuse boundary exists.

## Architectural principles

- PostgreSQL is authoritative for persistent content state.

- Authorization is enforced by the API.

- Business rules belong on the server.

- The public frontend should remain independently replaceable.

- Prefer simple, explicit modules.

- Avoid microservices until a real requirement exists.

## Production direction

```text
Internet
   │
   ▼
 Nginx
   ├── → Web
   └── → API
           │
           ▼
      PostgreSQL
```

Production infrastructure will be documented and implemented in the deployment milestones.
