# Pordee Deploy Notes

Phase 0 deploy target: **Dokploy** running the app as a single Node service.
No Postgres yet (the data layer is in-memory until Phase 1).

## Local

```bash
pnpm install
pnpm dev            # http://localhost:5173 (Vite)
pnpm build && pnpm start   # SSR runtime check on port 3000
```

## Docker (local sanity check)

```bash
docker build -t pordee-app .
docker run --rm -p 3000:3000 pordee-app
```

PWA service worker is only emitted in production builds.

## Dokploy

1. Point the Dokploy app at this repo's `app/` directory.
2. Build with the included `Dockerfile`.
3. Expose port `3000`.
4. Set env vars from `.env.example` (only `NODE_ENV`, `PORT` are needed in Phase 0).
5. No DB service yet. Skip migrations until Phase 1.

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
- Swap `app/lib/db/index.ts` to export the Drizzle repo (see
  `app/lib/db/README.md`).
