# Pordee Deploy Notes

Phase 0 deploy target: **Dokploy** running the app as a single Node service.

No Postgres yet. Finance data still uses the in-memory mock store until Phase
1, but Better Auth now stores users/sessions in a local SQLite file. Treat this
as a preview deploy, not durable production finance storage.

## Local

```bash
pnpm install
pnpm dev            # http://localhost:5173 (Vite)
pnpm build && pnpm start   # SSR runtime check on port 3000
```

## Docker (local sanity check)

```bash
docker build -t pordee-app .
docker run --rm -p 3000:3000 \
  -e BETTER_AUTH_URL=http://localhost:3000 \
  -e BETTER_AUTH_SECRET=replace-with-a-random-secret \
  -e PORDEE_AUTH_DB_PATH=/app/.data/auth.sqlite \
  -v pordee-auth-data:/app/.data \
  pordee-app
```

PWA service worker is only emitted in production builds.

## Dokploy

1. Point the Dokploy app at this repo's `app/` directory.
2. Build with the included `Dockerfile`.
3. Expose port `3000`.
4. Add a domain to the app and route it to container port `3000`.
5. Set env vars from `.env.example`:

```bash
NODE_ENV=production
PORT=3000
BETTER_AUTH_URL=https://your-pordee-domain.example
BETTER_AUTH_SECRET=<generate-a-long-random-secret>
PORDEE_AUTH_DB_PATH=/app/.data/auth.sqlite
```

6. Add a Dokploy **Volume Mount**:

```text
Mount path: /app/.data
```

This keeps the Better Auth SQLite file across redeploys. Without the volume,
users will be removed whenever the container is rebuilt. Finance records are
still in-memory and will reset on restart until Phase 1.

7. No Postgres service yet. Skip migrations until Phase 1.

Useful secret generation:

```bash
openssl rand -base64 32
```

## Deploy Readiness Notes

- Use Dockerfile build type, not static build.
- If this repo is configured as a monorepo in Dokploy, set the app/root
  directory to `app/` so Dokploy sees `package.json`, `pnpm-lock.yaml`, and
  `Dockerfile`.
- Keep replicas at `1` while using the local SQLite auth file and in-memory
  finance store.
- After changing env vars, domain, or volume settings, redeploy the app.

## CI

GitHub Actions config lives at `.github/workflows/ci.yml` (repo root, not
inside `app/`). It runs from the `app/` working directory on every PR/push
to `main`:

- typecheck, lint, `format:check`, vitest, build
- Playwright smoke (chromium) in a separate job, with browser cache

CI activates as soon as the repo is pushed to GitHub. Dokploy deploy is
independent — it pulls from the same repo but does not require CI to pass.

## Phase 1 (preview)

When Postgres lands:

- Add a Postgres service in Dokploy with a persistent volume.
- Add `DATABASE_URL` to the app's env.
- Run `pnpm db:migrate` as a pre-start step.
- Move Better Auth from local SQLite to the same Postgres/Drizzle-backed
  persistence layer.
- Swap `app/lib/db/index.ts` to export the Drizzle repo (see
  `app/lib/db/README.md`).
