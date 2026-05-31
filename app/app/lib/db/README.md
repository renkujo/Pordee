# Data Layer (Phase 1)

Phase 1: `repo` is `drizzleRepo`, backed by Postgres via Drizzle ORM. The
in-memory `mockRepo` is retained for unit tests only (it is imported directly by
`tests/unit/mock-repo.test.ts`, not through the export).

## Contract

Everything imports from `~/lib/db`:

- `repo` — the active `PordeeRepo` implementation (`drizzleRepo`)
- `types` — `Transaction`, `Category`, `Goal`, `GoalContribution`, `TransactionKind`

Every method takes `userId` as its first argument; all finance data is
user-scoped. Route loaders/actions source `userId` from `requireUser(request)`
and pass it through. Single-row reads/writes filter by `(id AND user_id)`, so a
guessed id belonging to another user returns `null` / `false`.

## Files

- `index.ts` — the single swap point; exports `repo` (currently `drizzleRepo`).
- `types.ts` — domain types + the `PordeeRepo` interface.
- `schema.ts` — Drizzle table definitions (`numeric(12,2)` money columns).
- `client.ts` — pooled `pg` client + `drizzle()` instance, cached on `globalThis`.
- `drizzle.ts` — `drizzleRepo`. The `numeric` ↔ `number` boundary lives here:
  parse on read (`Number(...)`), pass numbers as `String(...)` on write. `saved`
  is derived as `SUM(goal_contributions.amount)`, never stored.
- `mock.ts` — in-memory repo for unit tests.
- `migrations/` — generated SQL migrations.

## Working with the database

- Requires `DATABASE_URL` (Postgres). See `.env.example`.
- After changing `schema.ts`: `pnpm db:generate` to create a migration, then
  `pnpm db:migrate` to apply it.
- Integration tests (`pnpm test:integration`) need a live `DATABASE_URL`
  pointing at a disposable Postgres; unit tests do not touch the database.
- Better Auth shares the same pool (`client.ts`); its tables (`user`, `session`,
  `account`, `verification`) are migrated by Better Auth itself at boot via
  `ensureAuthDatabase()`.

## Notes

- All Zod input validation lives in `app/lib/validators/`. The repo trusts its
  inputs and the validator layer is the boundary.
- Both `mockRepo` and `drizzleRepo` seed the same five default categories per
  user on first access; keep the two `DEFAULT_CATEGORIES` lists identical.
