# Pordee (พอดี)

Pordee is a Thai-first personal finance PWA for day-to-day money tracking. The
app is built as a single React Router package under `app/`, with product,
brand, engineering, and deployment notes under `docs/` and `app/DEPLOY.md`.

## Current Status

- Mobile-first finance app with a responsive desktop shell.
- Core routes exist for dashboard, wallet, add transaction, history, goals,
  settings, login, and logout.
- Finance data is persisted through `PordeeRepo`, currently backed by Postgres
  via Drizzle ORM.
- Better Auth uses the same Postgres connection pool for email/password auth
  and optional Google login.
- Unit tests use the in-memory `mockRepo`; app routes import `repo` from
  `~/lib/db`.

## Stack

- React 19 and React Router v7 framework mode
- TypeScript strict mode
- Vite
- Tailwind CSS v4 tokens in `app/app/app.css`
- Local shadcn-style UI primitives in `app/app/components/ui/`
- Better Auth
- Postgres, Drizzle ORM, and `pg`
- Vitest and Playwright
- pnpm 10.33.0

## Quick Start

Run commands from `app/`.

```bash
cd app
pnpm install
cp .env.example .env
```

Edit `.env` so `DATABASE_URL` points to a reachable Postgres database.

```bash
pnpm db:migrate
pnpm dev
```

The Vite dev server runs at `http://localhost:5173`.

## Environment

`app/.env.example` documents the expected variables:

- `DATABASE_URL` - required Postgres connection string.
- `BETTER_AUTH_URL` - public app URL used by Better Auth.
- `BETTER_AUTH_SECRET` - production secret; replace the development value.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` - optional Google login.

Finance tables are migrated with `pnpm db:migrate`. Better Auth migrates its own
tables on first authenticated request.

## Common Commands

```bash
pnpm dev              # start local dev server
pnpm build            # production React Router build
pnpm start            # serve build/server/index.js
pnpm typecheck        # route typegen + TypeScript
pnpm lint             # ESLint
pnpm format:check     # Prettier check
pnpm test             # Vitest unit tests
pnpm test:integration # Drizzle repo tests, needs DATABASE_URL
pnpm e2e              # Playwright tests
pnpm icons:build      # regenerate app icons
```

First-time Playwright setup:

```bash
pnpm e2e:install
```

## Project Layout

```text
Pordee/
├── app/
│   ├── app/
│   │   ├── components/      # brand, shell, and UI primitives
│   │   ├── lib/             # auth, db, validators, date/format helpers
│   │   ├── routes/          # React Router route modules
│   │   ├── routes.ts        # route config
│   │   └── app.css          # Tailwind v4 tokens and globals
│   ├── public/              # runtime brand assets and PWA icons
│   ├── scripts/             # icon pipeline
│   ├── tests/               # unit, integration, and e2e tests
│   ├── DEPLOY.md            # Dokploy and production notes
│   └── package.json
├── docs/                    # product, brand, and engineering docs
├── assets/                  # brand/reference assets
└── source/                  # rebrand exploration archive
```

## App Boundaries

- Route modules own URL wiring, loaders, actions, form handling, and route UI.
- Authenticated app routes are gated by `routes/_shell.tsx` through
  `requireUser()`.
- Data reads and writes go through `repo` from `~/lib/db`.
- Form inputs are validated with Zod schemas in `app/app/lib/validators/`.
- Keep state local unless a route or component boundary genuinely needs shared
  ownership.
- Keep Thai copy consistent with the Thai-first product direction.

## Docs

- `docs/onboarding.md` - practical onboarding path.
- `docs/project-overview.md` - runtime and architecture snapshot.
- `docs/development-commands.md` - verified local commands.
- `docs/file-organization.md` - placement rules.
- `docs/styling.md` - Tailwind token and UI guidance.
- `docs/api-data-fetching.md` - loaders/actions and repo boundary.
- `app/app/lib/db/README.md` - database contract and migration notes.
- `app/DEPLOY.md` - Dokploy deployment notes.

## Deployment

The production target is a Node service, not a static site. See `app/DEPLOY.md`
for Docker, Dokploy, required environment variables, migration notes, and CI
coverage.
