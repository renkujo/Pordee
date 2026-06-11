# Pordee (พอดี) — App

Thai-first personal finance PWA. React Router v7 (framework mode), Vite,
Tailwind v4, IBM Plex Sans Thai, Postgres data layer via Drizzle ORM.

> Brand and product direction live under `/docs` at the repo root. This README
> is for running the app.

## Requirements

- Node 22 (see `.nvmrc`)
- pnpm 10
- Postgres — set `DATABASE_URL` (see `.env.example`). Finance data and Better
  Auth both live in Postgres.
- Cloudflare Turnstile keys for production email/password login and signup.
  Local development can keep `CLOUDFLARE_TURNSTILE_ENABLED=false`; production
  enables Turnstile automatically when both keys are configured.

## Common scripts

```bash
pnpm install
pnpm db:migrate        # apply finance migrations (needs DATABASE_URL)
pnpm dev               # http://localhost:5173

# Quality gates (mirror CI)
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test              # vitest unit (no DB)
pnpm test:integration  # vitest integration (needs DATABASE_URL)
pnpm e2e               # playwright (chromium)
pnpm build

# Auto-fix
pnpm lint:fix
pnpm format
```

First-time Playwright setup: `pnpm e2e:install`.

To run e2e with Turnstile enabled, use Cloudflare's always-pass test keys:

```bash
CLOUDFLARE_TURNSTILE_ENABLED=true \
CLOUDFLARE_TURNSTILE_SITE_KEY=1x00000000000000000000AA \
CLOUDFLARE_TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA \
pnpm e2e
```

## Layout

```
app/                React Router routes + UI
  components/       brand, shell, ui (shadcn-style, hand-rolled)
  lib/
    db/             PordeeRepo interface, drizzleRepo (active), mockRepo (tests)
    validators/     Zod schemas
scripts/            icon pipeline, codex prompts
tests/
  unit/             vitest specs
  e2e/              playwright specs
public/brand/       generated icons (run `pnpm icons:build`)
```

## CI

`.github/workflows/ci.yml` runs typecheck, lint, format:check, vitest, build,
and Playwright smoke on every PR/push to `main`.

## Deploy

See `DEPLOY.md` (Dokploy target).
