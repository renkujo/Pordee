# Pordee (พอดี) — App

Thai-first personal finance PWA. React Router v7 (framework mode), Vite,
Tailwind v4, IBM Plex Sans Thai, in-memory mock data layer.

> Brand and product direction live in `/docs` and `/brief.md` at the repo
> root. This README is for running the app.

## Requirements

- Node 22 (see `.nvmrc`)
- pnpm 10

## Common scripts

```bash
pnpm install
pnpm dev               # http://localhost:5173

# Quality gates (mirror CI)
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test              # vitest (jsdom)
pnpm e2e               # playwright (chromium)
pnpm build

# Auto-fix
pnpm lint:fix
pnpm format
```

First-time Playwright setup: `pnpm e2e:install`.

## Layout

```
app/                React Router routes + UI
  components/       brand, shell, ui (shadcn-style, hand-rolled)
  lib/
    db/             PordeeRepo interface + mockRepo (Drizzle swap-point)
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
