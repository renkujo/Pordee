# Pordee Deploy Notes

Phase 1 deploy target: **Dokploy** running the app as one Docker Compose
deployment, backed by **Postgres** in the same compose file.

Finance data and Better Auth both persist in Postgres. The app requires
`DATABASE_URL` to run; there is no SQLite file and no in-memory fallback.

## Local

```bash
pnpm install
# Postgres must be reachable at DATABASE_URL (see .env.example).
pnpm db:migrate            # apply finance migrations
pnpm dev                   # http://localhost:5173 (Vite)
pnpm build && pnpm start   # SSR runtime check on port 3000
```

Better Auth migrates its own tables (`user`, `session`, `account`,
`verification`) into the same Postgres on first request.

## Docker (local sanity check)

```bash
docker build -t pordee-app .
docker run --rm -p 3000:3000 \
  -e BETTER_AUTH_URL=http://localhost:3000 \
  -e BETTER_AUTH_SECRET=replace-with-a-random-secret \
  -e DATABASE_URL=postgres://pordee:pordee@host.docker.internal:5432/pordee \
  -e CLOUDFLARE_TURNSTILE_ENABLED=false \
  pordee-app
```

The image no longer mounts a data volume — all state lives in Postgres.
PWA service worker is only emitted in production builds.

## Dokploy Docker Compose

Use one Dokploy **Compose** service for the whole stack. The compose file lives
at the repo root and builds the web image from `./app/Dockerfile`.

1. In Dokploy, create a Docker Compose service.
2. Point it at this repo and set **Compose Path** to `./docker-compose.yml`.
3. Add a domain in the Dokploy Domains tab and route it to service `web`, port
   `3000`.
4. Set these environment variables in the Compose service:

```bash
BETTER_AUTH_URL=https://your-pordee-domain.example
BETTER_AUTH_SECRET=<generate-a-long-random-secret>
POSTGRES_PASSWORD=<generate-a-long-random-db-password>

# Cloudflare Turnstile protects email/password login and signup.
# Production defaults to enabled unless explicitly set to false.
CLOUDFLARE_TURNSTILE_ENABLED=true
CLOUDFLARE_TURNSTILE_SITE_KEY=<cloudflare-turnstile-site-key>
CLOUDFLARE_TURNSTILE_SECRET_KEY=<cloudflare-turnstile-secret-key>

# Optional Google OAuth:
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

The compose file derives `DATABASE_URL` internally as
`postgres://pordee:${POSTGRES_PASSWORD}@postgres:5432/pordee`, so do not point
the web app at a separate Dokploy Postgres service.

Finance migrations are applied by the app through `ensureFinanceDatabase()` on
first finance repository access. Better Auth tables migrate automatically on
auth requests through `ensureAuthDatabase()`.

Useful secret generation:

```bash
openssl rand -base64 32
```

## Cloudflare Turnstile

Turnstile is enforced on email/password login and signup before Better Auth is
called. Social login still goes through the provider redirect flow.

For local development, keep `CLOUDFLARE_TURNSTILE_ENABLED=false`, or use
Cloudflare's test credentials:

```bash
CLOUDFLARE_TURNSTILE_ENABLED=true
CLOUDFLARE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
CLOUDFLARE_TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

If a Content Security Policy is added later, allow
`https://challenges.cloudflare.com` for Turnstile scripts, frames, and
connections.

## Deploy Readiness Notes

- Use Docker Compose type, not static build.
- Keep the Compose Path at `./docker-compose.yml`; the compose file handles the
  `./app` build context.
- Keep replicas at `1` (a single connection pool per instance; multi-instance
  pool tuning is out of scope for Phase 1).
- After changing env vars or domain settings, redeploy the app.

## CI

GitHub Actions config lives at `.github/workflows/ci.yml` (repo root, not
inside `app/`). It runs from the `app/` working directory on every PR/push
to `main`:

- typecheck, lint, `format:check`, vitest (unit)
- `db:migrate` + integration tests against a `postgres:16` service
- build
- Playwright smoke (chromium) in a separate job, also against Postgres

CI activates as soon as the repo is pushed to GitHub. Dokploy deploy is
independent — it pulls from the same repo but does not require CI to pass.
