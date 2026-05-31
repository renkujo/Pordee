# Pordee Onboarding

This is the practical onboarding guide for day-to-day work. Use `AGENTS.md` as
the policy source and this file as the quick map.

## 1) Start Here

Run from `app/`.

```bash
pnpm install
pnpm dev
```

The dev server runs at `http://localhost:5173`.

Task checks:

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
```

Build before release, routing/build changes, or production-facing deploy work:

```bash
pnpm build
```

Preview the built app locally:

```bash
pnpm start
```

## 2) Architecture Snapshot

- Routing: React Router v7 framework mode via `app/app/routes.ts`
- Data access: route loaders/actions call `repo` from `~/lib/db`
- Finance persistence: Phase 0 in-memory `mockRepo`
- Auth persistence: Better Auth with SQLite at `PORDEE_AUTH_DB_PATH`
- State: local React state only; no global store
- Styling: Tailwind v4 tokens in `app/app/app.css`
- i18n: Thai-first copy, no i18n library
- UI primitives: `app/app/components/ui/`

## 3) Where to Work

- New route: `app/app/routes.ts` plus `app/app/routes/`
- Global tokens/styles: `app/app/app.css`
- Reusable UI primitives: `app/app/components/ui/`
- Shell UI: `app/app/components/shell/`
- Brand UI: `app/app/components/brand/`
- Data contract and repo implementation: `app/app/lib/db/`
- Validation: `app/app/lib/validators/`
- Auth helpers and guards: `app/app/lib/auth.server.ts`
- Unit tests: `app/tests/unit/`
- E2E tests: `app/tests/e2e/`

## 4) Docs Map

### Core

- `AGENTS.md`
- `docs/project-overview.md`
- `docs/development-commands.md`
- `docs/file-organization.md`
- `docs/best-practices.md`
- `docs/commit-guide.md`

### Patterns and Code Style

- `docs/code-style/typescript.md`
- `docs/code-style/imports.md`
- `docs/code-style/formatting.md`
- `docs/patterns/component-conventions.md`
- `docs/patterns/state-management.md`

### Specialized Topics

- `docs/styling.md`
- `docs/i18n-guidelines.md`
- `docs/api-data-fetching.md`
- `app/DEPLOY.md`
- `app/app/lib/db/README.md`

## 5) Repo-Specific Rules

- Keep finance reads/writes behind `PordeeRepo`.
- Keep route loaders/actions as the current server boundary.
- Validate form data with Zod before repo writes.
- Keep route-specific copy, filters, and helpers local until reuse is real.
- Use mascots in supportive moments, not as primary dashboard chrome.
- Treat Postgres/Drizzle as Phase 1 preferred direction until implemented.

## 6) Suggested Reading Paths

### New engineer

Read `AGENTS.md`, then `docs/project-overview.md`,
`docs/development-commands.md`, and `docs/file-organization.md`.

### DB work

Read `docs/api-data-fetching.md`, `app/app/lib/db/README.md`, and
`app/DEPLOY.md`.

### UI work

Read `docs/styling.md`, `docs/patterns/component-conventions.md`, and
`docs/ui-direction.md`.

### Review work

Read `AGENTS.md`, `docs/best-practices.md`, and any topic page touched by the
change.
