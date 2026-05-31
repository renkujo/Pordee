# Pordee Deploy Notes

Phase 1 deploy target: **Dokploy** running the app as a single Node service,
backed by **Postgres**.

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
  pordee-app
```

The image no longer mounts a data volume — all state lives in Postgres.
PWA service worker is only emitted in production builds.

## Dokploy

1. Point the Dokploy app at this repo's `app/` directory.
2. Build with the included `Dockerfile`.
3. Expose port `3000`.
4. Add a domain to the app and route it to container port `3000`.
5. Add a **Postgres service** in Dokploy with its own persistent volume; note
   its connection string.
6. Set env vars from `.env.example`:

```bash
NODE_ENV=production
PORT=3000
BETTER_AUTH_URL=https://your-pordee-domain.example
BETTER_AUTH_SECRET=<generate-a-long-random-secret>
DATABASE_URL=postgres://<user>:<pass>@<postgres-host>:5432/<db>
```

7. Run `pnpm db:migrate` as a **pre-start / release step** so finance migrations
   are applied before the app boots. Better Auth tables migrate automatically at
   first request.

Useful secret generation:

```bash
openssl rand -base64 32
```

## Deploy Readiness Notes

- Use Dockerfile build type, not static build.
- If this repo is configured as a monorepo in Dokploy, set the app/root
  directory to `app/` so Dokploy sees `package.json`, `pnpm-lock.yaml`, and
  `Dockerfile`.
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
