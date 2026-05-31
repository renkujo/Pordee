# Project Overview

## Tech Stack

- **App / Runtime**: React Router v7 framework mode served through
  `@react-router/serve`
- **UI**: React 19, TypeScript, local route modules and component primitives
- **Styling**: Tailwind CSS v4 with tokens in `app/app/app.css`
- **Data access**: route loaders/actions call `~/lib/db`
- **Finance persistence**: Phase 0 in-memory repository
- **Auth**: Better Auth email/password with SQLite
- **State**: local React state only
- **i18n**: no i18n library; Thai-first copy and Thai locale formatting
- **Tooling**: Vite, ESLint, Prettier, Vitest, Playwright, PWA plugin

## Runtime

- **Package Manager**: pnpm 10.33.0
- **Node**: 22, recorded in `app/.nvmrc`
- **TypeScript**: 5.9.3
- **React**: 19.2.6
- **React Router**: 7.15.1

## Key Libraries

- **UI primitives**: local shadcn-style components plus Radix primitives
- **Icons**: `lucide-react`
- **Class utilities**: `clsx`, `tailwind-merge`, and `cn()`
- **Forms and validation**: React Router `<Form>` plus Zod
- **Auth**: `better-auth`
- **Date controls**: `react-day-picker`
- **Build plugins**: `@react-router/dev`, `@tailwindcss/vite`,
  `vite-plugin-pwa`
- **Database direction**: `kysely` is installed, but finance persistence is
  still the mock repo and the docs currently name Postgres/Drizzle as Phase 1
  direction.

## Project Structure

```text
Pordee/
├── app/                         # App package and Docker build root
│   ├── app/                     # React Router source
│   ├── public/                  # Runtime brand assets and icons
│   ├── scripts/                 # Icon pipeline and prompts
│   └── tests/                   # Vitest and Playwright tests
├── docs/                        # Brand, product, and engineering docs
├── assets/                      # Brand/reference assets
├── source/                      # Rebrand exploration archive
├── .github/workflows/ci.yml     # CI from app/ working directory
└── AGENTS.md                    # Repo policy and engineering rules
```

## Package Dependencies

- `app/package.json` defines one app package. Commands run from `app/`.
- `~/*` maps to `app/app/*`.
- `app/app/routes.ts` is the route registry.
- `app/app/root.tsx` owns document shell, fonts, icons, and global app layout
  wiring.
- `app/app/lib/db/index.ts` exports the current repo implementation. Routes
  import this boundary instead of `mockRepo`.
- `app/app/lib/auth.server.ts` owns Better Auth setup, auth DB migrations,
  cookie forwarding, and route guards.

## Current Status

- App shell, dashboard, wallet, add transaction, history, goals, settings, and
  login/logout flows exist.
- Auth works through Better Auth with a persistent SQLite file when deployed
  with a volume.
- Finance data is not durable yet; it resets with the mock store.
- CI runs typecheck, lint, format check, unit tests, build, and Playwright.
- Dokploy deployment is documented in `app/DEPLOY.md`.

## Not Established Yet

- Postgres service and `DATABASE_URL`.
- Drizzle schema, migrations, and generated DB client.
- Finance data scoped by authenticated user.
- Dedicated API/service layer beyond the repo contract.
- Global client-state or server-state query library.
- i18n extraction or locale switching.
