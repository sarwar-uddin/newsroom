# Security

## Implemented

**Authentication**

- No public registration. Accounts are created via `pnpm user:create`; the password is read from
  a hidden prompt or stdin, never from argv. Minimum length 12.
- Argon2id hashing (`@node-rs/argon2`, OWASP baseline parameters, encoded per hash).
- Login runs one Argon2 verification even for unknown emails (no user enumeration via timing)
  and returns a single generic error.
- Throttling in PostgreSQL: 5 failures per email or 25 per IP in 15 minutes.

**Sessions**

- 256-bit random token in an `HttpOnly`, `SameSite=Lax` cookie; `Secure` and the `__Host-`
  prefix in production. Only the SHA-256 of the token is stored.
- 14-day sliding expiry; logout deletes the row; disabling a user invalidates all sessions.

**Authorization**

- Every admin page calls `requireUser()`; every server action authenticates itself; the domain
  layer checks role, ownership and status on every mutation (`workflow.ts`). Hidden buttons are a
  convenience only.
- Object-level checks: authors receive 404 for others' articles (read, edit, preview, transition,
  delete). IDs are validated as UUIDs before use.
- `proxy.ts` redirects cookie-less `/admin` requests early and adds `noindex` and `no-store`;
  it is **not** relied on for security.

**CSRF**

- Server actions are POST-only and Next.js rejects those whose `Origin` doesn't match the host.
- The upload route handler checks `Origin` explicitly.
- Session cookies are `SameSite=Lax`.

**Content safety / XSS**

- Article bodies are stored as an allow-listed JSON document (Zod), never HTML. Unknown nodes,
  marks and attributes are rejected or stripped; links must be http(s), mailto or site-relative.
- Rendering builds React elements per node type; there is no `dangerouslySetInnerHTML` in the
  content path. The only use is JSON-LD, serialised with `<`, `>`, `&`, U+2028/2029 escaped.
- RSS output is XML-escaped and invalid XML characters are stripped.

**Uploads**

- Type determined from magic bytes (JPEG, PNG, WebP, GIF). SVG, HTML and executables are
  refused regardless of name or declared MIME type.
- Size limit (`MEDIA_MAX_BYTES`, default 8 MiB) is checked on the declared length and the actual bytes.
- Storage keys are server-generated (`yyyy/mm/<128-bit hex>.<ext>`); keys are pattern-validated
  and path-containment-checked before any filesystem access. Original filenames are sanitised
  and used for display only.
- Media is served with the stored MIME type, `nosniff`, and `CSP: default-src 'none'; sandbox`.

**Data & errors**

- All SQL through Drizzle's parameterised builder; raw fragments use bound parameters.
- Environment validated with Zod; misconfiguration fails loudly.
- Error pages never show internal messages; domain errors shown in the CMS are curated strings.
- Global headers: `nosniff`, `X-Frame-Options: DENY`, strict referrer policy, restrictive
  Permissions-Policy, no `X-Powered-By`.
- No analytics or third-party scripts. Share links are plain links.

## Assumptions

- The app runs behind a reverse proxy/platform that terminates TLS and sets `X-Forwarded-For`
  correctly. If clients can reach Node directly, they can spoof the IP used for per-IP throttling
  (per-email throttling still applies).
- `SITE_URL` is set to the real public origin.
- `.env` is never committed (`.gitignore` covers it).

## Remaining production hardening (not yet done)

- Content-Security-Policy for pages (needs nonces for Next.js inline scripts) and HSTS (set at the proxy).
- Two-factor authentication for editors/admins; password reset flow (today: CLI only).
- User management UI (disable/role change) and an audit log of publish/unpublish actions.
- Rate limiting for uploads and other authenticated actions (login is covered).
- Malware scanning / re-encoding of uploaded images (e.g. via `sharp`) to strip metadata (EXIF GPS!).
- Drafts' images are reachable by URL if the random key is known (unguessable, but not access-controlled).
- Dependency scanning in CI (`pnpm audit`, Dependabot/Renovate), automated backups and restore drills.
- A secure channel for sources (e.g. SecureDrop) before soliciting tips.
