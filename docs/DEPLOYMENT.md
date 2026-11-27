# Deployment

**Status: not deployed.** Everything has been verified locally only (see README). This document
lists what a production deployment needs.

## Requirements

- Node.js ≥ 22 (developed on 26) and pnpm 12.
- PostgreSQL ≥ 16 (developed on 18), with automated backups.
- TLS-terminating reverse proxy or platform (Nginx, Caddy, a PaaS load balancer).
- Persistent media storage (see below).

## Environment

| Variable                 | Required           | Notes                                                                                                        |
| ------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`           | yes                | Use a least-privilege role; `sslmode=require` for managed databases.                                         |
| `SITE_URL`               | yes                | Public origin, e.g. `https://example.org`. Used for canonical URLs, feeds, OG tags and upload origin checks. |
| `UPLOAD_DIR`             | local storage only | Absolute path on a persistent volume.                                                                        |
| `MEDIA_MAX_BYTES`        | no                 | Default 8 MiB. Keep the proxy's body limit slightly above it.                                                |
| `NEXT_PUBLIC_SITE_NAME`  | no                 | Overrides the placeholder name at build time.                                                                |
| `NEXT_PUBLIC_SOURCE_URL` | no                 | Footer "Source code" link. Point it at your fork if you run a modified version (AGPL-3.0 §13).               |
| `NODE_ENV=production`    | yes                | Enables `Secure` / `__Host-` cookies.                                                                        |

## Release steps

```bash
pnpm install --frozen-lockfile
pnpm db:migrate          # before switching traffic; migrations are forward-only
pnpm build
pnpm start               # next start, port 3000 by default (use -p / PORT)
```

First deployment only: `pnpm user:create --email … --name "…" --role admin`. Do **not** run
`db:seed` in production.

## Media storage: important

`LocalDiskStorage` writes to `UPLOAD_DIR`. This works on a single VM/container **with a
persistent volume**. It does **not** work on serverless platforms (e.g. Vercel, Netlify,
Lambda), where the filesystem is ephemeral and not shared between instances, or on multiple app
instances without shared storage.

For those, implement `MediaStorage` (`apps/web/src/server/media/storage.ts`) with an
S3-compatible client (AWS S3, Cloudflare R2, Backblaze B2, MinIO) and select it in
`getStorage()`. The rest of the app only deals with storage keys. Consider serving media from a
CDN domain at that point and updating `mediaUrl()` and `images.remotePatterns`.

## Reverse proxy notes

- Forward `Host`, `X-Forwarded-For`, `X-Forwarded-Proto`; strip client-supplied `X-Forwarded-For`.
- Set HSTS at the proxy.
- `client_max_body_size` (Nginx) ≥ `MEDIA_MAX_BYTES` + ~100 KB.
- Pages are dynamic; do not add a full-page cache in front of `/admin` or without purging on publish.

## Images

Next.js image optimisation uses `sharp`. The workspace currently blocks sharp's install script
(`pnpm-workspace.yaml` → `allowBuilds.sharp: false`); prebuilt binaries normally still load. Verify
`/_next/image` works on the target platform, or allow the build.

## Operations checklist

- [ ] Database backups + tested restore
- [ ] Media volume/bucket backups
- [ ] Log shipping and uptime monitoring (no client-side analytics by design)
- [ ] Set `site.demoNotice = false`, replace demo content, set real name/contact/social links
- [ ] Complete the privacy policy and About/ownership pages
- [ ] Review `docs/SECURITY.md` → remaining hardening
