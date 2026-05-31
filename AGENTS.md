# Pordee

Thai-first personal finance PWA. The app is currently a single React Router
package under `app/`; root-level `docs/` holds product, brand, and engineering
notes.

## Purpose

- Build the Pordee finance app as a mobile-first PWA with a responsive desktop
  dashboard shell.
- Keep finance workflows practical: dashboard, wallet, add transaction,
  history, goals, categories, settings, and authentication.
- Current finance data is Phase 0 mock persistence behind a repository
  contract. Auth is real Better Auth persistence backed by local SQLite.

## Stack Snapshot

- Package manager: pnpm 10.33.0, run from `app/`
- Framework: React Router v7 framework mode with Vite
- Language: TypeScript, strict mode
- Styling: Tailwind CSS v4 tokens in `app/app/app.css`
- UI primitives: local shadcn-style primitives in `app/app/components/ui/`
- Auth: Better Auth with email/password and SQLite via `node:sqlite`
- Data access: React Router loaders/actions calling `~/lib/db` repository
- State: local React state only; no shared client-state store yet
- i18n: Thai-first copy, no i18n library yet
- Tests: Vitest unit tests and Playwright e2e tests

## Commands At A Glance

Run commands from `app/`.

- Install: `pnpm install`
- Dev: `pnpm dev`
- Build: `pnpm build`
- Start built app: `pnpm start`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`
- Format check: `pnpm format:check`
- Unit tests: `pnpm test`
- E2E tests: `pnpm e2e`
- Icons: `pnpm icons:build`

## Core Directories

### Current Reality

- `app/app/routes.ts` - React Router route config.
- `app/app/routes/` - route modules, loaders, actions, and page UI.
- `app/app/components/brand/` - Pordee logo and mascot presentation helpers.
- `app/app/components/shell/` - desktop sidebar, mobile header, bottom nav.
- `app/app/components/ui/` - reusable local UI primitives.
- `app/app/lib/auth.server.ts` - Better Auth server helpers and route guards.
- `app/app/lib/db/` - `PordeeRepo` contract and current `mockRepo`.
- `app/app/lib/validators/` - Zod schemas for route action inputs.
- `app/app/lib/date/`, `format/`, `parse/` - small domain utilities.
- `app/public/brand/` - runtime logo, icon, and mascot assets.
- `app/tests/unit/` - Vitest specs.
- `app/tests/e2e/` - Playwright specs.
- `docs/` - repo docs, product direction, brand direction, and generated rules.

### Not Established Yet

- Postgres-backed finance persistence.
- Drizzle schema and migration scripts.
- Shared server-state or client-state library.
- A general service layer outside the existing db repository boundary.
- i18n extraction/compile workflow.

### If Introduced Later

- Add Postgres and Drizzle behind the existing `PordeeRepo` interface before
  changing route modules.
- Add shared services only after transport logic repeats across multiple real
  owners.
- Add shared state only for state that genuinely crosses route/component
  ownership.

## Boundary Map

### Route Ownership

React Router route modules own URL wiring, loaders, actions, form handling, and
route-level UI. The shell route gates authenticated app routes through
`requireUser()`.

### Data Ownership

Route loaders/actions import `repo` from `~/lib/db`. They should not import
`mockRepo` directly. `app/app/lib/db/README.md` is the source of truth for the
Phase 1 swap plan.

### Auth Ownership

Auth endpoints live under `routes/api.auth.$.ts`. Login, logout, and route
guards use helpers from `~/lib/auth.server`. Do not duplicate Better Auth
cookie or migration handling inside page routes.

### State Ownership

Keep UI state local with `useState` unless multiple owners need the same state.
No global store pattern is established.

### Styling Ownership

Use Tailwind v4 tokens and local UI primitives. Product-specific layout and
copy should stay with its route/component owner until real reuse appears.

## Working Rules

### Current Reality

- Follow route loaders/actions plus `PordeeRepo` for finance reads/writes.
- Validate form inputs with Zod before calling the repo.
- Keep Thai user-facing copy consistent with the current Thai-first product.
- Use `~/` imports for app-internal modules.
- Keep reusable primitives in `components/ui`; keep route-specific UI local
  until reuse is proven.

### Preferred Direction

- Keep route files readable. Extract owner-local helpers or partials when a
  route starts mixing several responsibilities.
- Add section comments only when they make a long file easier to scan.
- Prefer semantic Tailwind tokens like `bg-sky`, `bg-surface`, `text-ink`,
  `text-muted`, `border-line`, `text-coral`, and `text-teal`.
- Treat Postgres/Drizzle as the next DB direction, not as current behavior until
  the code proves it.

### Adoption Triggers

- Introduce Drizzle when `DATABASE_URL`, schema, migrations, and a real repo
  implementation land together.
- Introduce services when repeated transport/API logic appears across multiple
  owners.
- Introduce shared state when state must coordinate across unrelated route or
  shell owners.
- Extract shared components when the same neutral UI contract appears in more
  than one route area.

## How To Change This Repo Safely

- Match the current route + loader/action pattern before adding a new boundary.
- Keep finance persistence behind `PordeeRepo`.
- Do not bypass auth guards for app-shell routes.
- Do not commit secrets or generated local auth DB files.
- Run verification from `app/`, not the repo root.
- Respect dirty worktree files that are unrelated to your task.

## Naming and Structure

### Current Reality

- Route files are lower-case route names, including dotted dynamic routes such
  as `history.$id.tsx`.
- Components use PascalCase exports.
- Shared UI primitive files are lower-case names such as `button.tsx`.
- Domain types live in `app/app/lib/db/types.ts`; validator types live beside
  their Zod schemas.
- Interfaces currently use plain names like `PordeeRepo`, `AuthUser`, and
  `ActionResult`, not an `I` prefix.

### Preferred Direction

- Keep names specific enough to search outside their folder.
- Keep single-owner constants and helpers with the owner.
- Use barrel files only where the repo already has an entry boundary, such as
  `app/app/lib/db/index.ts`.

## Docs Map

- `docs/onboarding.md` - setup and first working path.
- `docs/project-overview.md` - stack and runtime shape.
- `docs/development-commands.md` - verified local commands.
- `docs/file-organization.md` - placement rules.
- `docs/best-practices.md` - practical coding guidance.
- `docs/commit-guide.md` - conservative commit guidance.
- `docs/styling.md` - Tailwind/token/UI styling rules.
- `docs/i18n-guidelines.md` - Thai-first copy and future i18n posture.
- `docs/api-data-fetching.md` - loaders/actions, repo boundary, and DB path.
- `docs/code-style/typescript.md` - TypeScript posture.
- `docs/code-style/imports.md` - import and alias rules.
- `docs/code-style/formatting.md` - Prettier and lint formatting rules.
- `docs/patterns/component-conventions.md` - component ownership guidance.
- `docs/patterns/state-management.md` - local state and future store triggers.

## Precedence

When rules conflict, use this order:

1. this `AGENTS.md`
2. other repo-local instruction files
3. established repeated repo patterns
4. generated docs and preferred-direction guidance

Explicit local evidence beats imported preference.

## Safety

- Do not commit secrets.
- Do not force destructive git operations.
- Verify commands against `app/package.json` before documenting them.
- Do not describe planned Postgres/Drizzle architecture as current behavior.
- Do not invent folders such as `services/`, `hooks/`, or `stores/` before the
  repo earns them.
