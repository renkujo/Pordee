# Data Layer (Phase 0)

Phase 0 uses an in-memory `mockRepo` so the UI shell, loaders, and actions can be
built without provisioning Postgres yet.

## Contract

Everything imports from `~/lib/db`:

- `repo` — the `PordeeRepo` implementation (mock today, Drizzle later)
- `types` — `Transaction`, `Category`, `Goal`, `GoalContribution`, `TransactionKind`

Route loaders/actions must depend on `PordeeRepo`, never on the mock directly.
That way Phase 1 only needs to swap the export in `index.ts`.

## Phase 1 swap plan

1. Add `postgres`, `drizzle-orm`, `drizzle-kit`, `DATABASE_URL`.
2. Create `app/lib/db/schema.ts` mirroring the types here.
3. Implement `drizzleRepo: PordeeRepo` in `app/lib/db/drizzle.ts`.
4. Switch `index.ts` to export `drizzleRepo`.
5. Add `db:generate` / `db:migrate` scripts and Dokploy migration step.

No route file should need to change.

## Notes

- `globalThis.__pordeeStore` persists across HMR but resets on full restart —
  fine for Phase 0 since data is throwaway.
- All Zod input validation lives in `app/lib/validators/`. The repo trusts its
  inputs and the validator layer is the boundary.
