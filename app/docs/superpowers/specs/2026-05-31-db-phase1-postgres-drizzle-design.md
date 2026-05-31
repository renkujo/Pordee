# DB Phase 1 — Postgres + Drizzle, User-Scoped

**Date:** 2026-05-31
**Status:** Approved design, pre-implementation
**Scope:** Migrate the finance data layer from the in-memory mock to Postgres via
Drizzle, add per-user data scoping, and move Better Auth onto the same Postgres
instance. First implementation lands a full **Transactions** vertical slice; the
remaining entities follow the same pattern.

---

## 1. Context & Current State

The codebase was explicitly staged for this migration.

- **Repo seam exists.** `app/lib/db/types.ts` defines `PordeeRepo` (14 methods).
  Every route imports only from `~/lib/db` (`app/lib/db/index.ts:4` is the single
  swap point). Verified across 8 route files: `settings`, `goals`, `add`,
  `wallet`, `dashboard`, `history`, `history.$id`, plus `_shell`.
- **No user scoping today.** Every `repo.*` call site passes no user identity —
  finance data is global. The only auth gate is `_shell.tsx:9` (`requireUser`).
- **Auth is live, on separate SQLite.** `app/lib/auth.server.ts:9-15` runs Better
  Auth against `.data/auth.sqlite` (tables: `user`, `session`, `account`,
  `verification`). Better Auth uses **kysely** internally (`package.json:36`).
- **Stack:** React Router v7 SSR (loaders/actions), Zod validators in
  `app/lib/validators/`, Vitest unit + Playwright e2e. Deploy: Dokploy single
  Node service, replicas pinned to 1.
- **Existing Phase-1 notes:** `app/lib/db/README.md:16-24` and `DEPLOY.md:87-98`
  already sketch the swap. This spec supersedes them and corrects one promise
  (see §3).

## 2. Locked Decisions

| Area | Choice |
|---|---|
| DB / ORM (finance) | Postgres + `drizzle-orm` + `drizzle-kit` |
| Migration seam | Keep `PordeeRepo` interface; swap impl in `index.ts` |
| User scoping | `userId: string` as **first arg** of every repo method; all finance tables carry `user_id` |
| Auth store | Move Better Auth SQLite → **Postgres** (same `DATABASE_URL`) |
| First slice | **Transactions** (schema → migration → drizzleRepo → routes → tests) |
| `Goal.saved` | **Derived** `SUM(goal_contributions.amount)`, not a stored column; returned as `number` |
| `amount` representation | **Postgres `numeric(12,2)`**; mapped at the repo boundary so the app keeps `Money = number` (see §4.4) |
| Drizzle test infra | **CI Postgres service** (GitHub Actions `services:`) |

## 3. Scope Correction (explicit)

`README.md` / `DEPLOY.md` claim "no route file needs to change." **That breaks**
the moment `userId` becomes the first method arg: all 8 route call sites and the
mock unit tests must change. This is inherent to "add user scoping" and is folded
into the plan rather than hidden.

Two concerns change, sequenced so each step is independently verifiable:

- **Phase A — interface-first, on the mock.** Add `userId` to every `PordeeRepo`
  method. Update `mock.ts` + `mock-repo.test.ts` (still in-memory, still fast).
  Update all route loaders/actions to source `userId` from `requireUser` and pass
  it through. CI stays green with **no database required**.
- **Phase B — Drizzle swap.** Implement `drizzleRepo` against Postgres, switch
  `index.ts` to export it, move auth to Postgres, add migrations + CI Postgres +
  Dokploy wiring.

## 4. Architecture & Components

### 4.1 Schema — `app/lib/db/schema.ts`

Four finance tables. Each carries `user_id text not null` referencing Better
Auth's `user.id`. Money columns are `numeric(12,2)` (see §4.4 for the
JS-`number` boundary).

```
categories
  id text pk
  user_id text not null  -> user.id
  name text not null
  kind text not null      -- 'expense' | 'income'
  index (user_id)

transactions
  id text pk
  user_id text not null  -> user.id
  kind text not null
  title text not null
  amount numeric(12,2) not null
  category_id text null   -> categories.id
  note text null
  occurred_at timestamptz not null
  created_at timestamptz not null
  index (user_id, occurred_at desc, created_at desc)   -- mirrors mock.ts:93 sort

goals
  id text pk
  user_id text not null  -> user.id
  name text not null
  target numeric(12,2) not null
  created_at timestamptz not null
  -- `saved` is NOT stored; it is SUM(goal_contributions.amount)

goal_contributions
  id text pk
  goal_id text not null   -> goals.id
  user_id text not null   -> user.id    -- denormalized for direct user filtering
  amount numeric(12,2) not null
  note text null
  occurred_at timestamptz not null
  index (goal_id)
```

The Better Auth tables (`user`, `session`, `account`, `verification`) are owned
and migrated by Better Auth; the Drizzle schema only *references* `user.id`. We
do not redefine them in `schema.ts`.

### 4.2 Interface change — `app/lib/db/types.ts`

`userId` becomes the first parameter on every method. Inputs that previously
carried no user field still omit it (the repo sets `user_id` from the arg).
Scoped single-row reads/writes filter by `(id AND user_id)` so a guessed id
belonging to another user returns `null` / `false`.

```ts
interface PordeeRepo {
  listCategories(userId: string): Promise<Category[]>;
  createCategory(userId: string, input: Omit<Category, "id" | "userId">): Promise<Category>;
  updateCategory(userId: string, id: string, input: Pick<Category, "name">): Promise<Category | null>;
  deleteCategory(userId: string, id: string): Promise<boolean>;
  countTransactionsByCategory(userId: string, categoryId: string): Promise<number>;

  listTransactions(userId: string, opts?: {
    from?: string; to?: string; kind?: TransactionKind; categoryId?: string;
  }): Promise<Transaction[]>;
  getTransaction(userId: string, id: string): Promise<Transaction | null>;
  createTransaction(userId: string, input: Omit<Transaction, "id" | "createdAt" | "userId">): Promise<Transaction>;
  updateTransaction(userId: string, id: string, input: Omit<Transaction, "id" | "createdAt" | "userId">): Promise<Transaction | null>;
  deleteTransaction(userId: string, id: string): Promise<boolean>;

  listGoals(userId: string): Promise<Goal[]>;
  createGoal(userId: string, input: Omit<Goal, "id" | "createdAt" | "saved" | "userId">): Promise<Goal>;
  addContribution(userId: string, input: Omit<GoalContribution, "id" | "userId">): Promise<GoalContribution>;
}
```

Domain types gain `userId: string` (e.g. `Transaction.userId`). `Goal.saved`
stays on the `Goal` type as a computed value returned by `listGoals`.

### 4.3 Drizzle impl — `app/lib/db/drizzle.ts`

- A single `pg` `Pool` built from `DATABASE_URL`, wrapped with `drizzle()`,
  cached on `globalThis` (same HMR-survival trick as `mock.ts:36`).
- Every query filters `where user_id = $userId`.
- `listGoals` joins `goal_contributions` and groups to compute `saved`.
- `addContribution` runs inside a DB transaction (insert contribution; goal total
  is derived, so no counter update needed — the transaction guards the
  ownership check + insert atomically).
- `getTransaction` / `updateTransaction` / `deleteTransaction` scope by
  `(id AND user_id)`.

### 4.4 Money boundary (`numeric` ↔ `number`)

Drizzle maps `numeric` to a JS **`string`** by default (to avoid float
precision loss). The app contract is `Money = number` (`types.ts:1`) and all
downstream code — `fmtSignedBaht` (`app/lib/format/baht.ts`), the Zod
validators, and the sum/aggregate arithmetic in `dashboard`/`wallet` — assumes
`number`. To avoid a wide blast radius, the conversion is **contained entirely
in `drizzleRepo`**:

- **On read:** parse the `numeric` string to `number` (`Number(row.amount)`)
  before returning typed domain objects. `numeric(12,2)` with baht-scale values
  is well within `number`'s safe-integer-ish range, so no precision concern at
  this app's scale.
- **On write:** pass the `number` through Drizzle's `numeric` column (it accepts
  number/string input and stores exact decimal).
- `Money = number` and every consumer stay **unchanged**. The string↔number
  seam lives only in `drizzle.ts`.

This is the deliberate cost of choosing `numeric` over an integer column; it
buys exact decimal storage (future-proof for satang/fractional baht) without
forcing a `Money = string` refactor across the app.

### 4.5 Auth on Postgres — `app/lib/auth.server.ts`

- Replace `betterAuth({ database: new DatabaseSync(...) })` with Better Auth's
  Postgres adapter pointed at the same pool / `DATABASE_URL`. Better Auth's
  kysely layer handles its own table DDL via the existing
  `ensureAuthDatabase()` / `getMigrations` flow — now targeting Postgres.
- The existing `.data/auth.sqlite` is throwaway preview data: **dropped, not
  migrated.**
- Remove `PORDEE_AUTH_DB_PATH`; `DATABASE_URL` replaces it.

### 4.6 Routes

Each loader/action calls `requireUser(request)` (already imported in `_shell`;
add where missing) and passes `user.id` as the first arg to every `repo.*` call.
Loaders that currently run in `_shell` for the gate stay; data-loading routes get
their own `requireUser` so they have the id locally.

## 5. Data Flow

```
request → loader/action
  → requireUser(request) → { id }
  → repo.method(user.id, ...args)
  → drizzleRepo: SELECT/INSERT ... WHERE user_id = $1
  → typed rows back to loader → component
```

## 6. Migrations & Deploy

- `drizzle.config.ts` at app root; scripts `db:generate` (drizzle-kit generate)
  and `db:migrate` (apply).
- Better Auth tables migrate at boot via existing `ensureAuthDatabase()`.
- Drizzle finance migrations apply via `db:migrate` as a Dokploy **pre-start
  step** (anticipated at `DEPLOY.md:93`).
- Dokploy: add a Postgres service + persistent volume; set `DATABASE_URL`; remove
  the `.data` volume mount and `PORDEE_AUTH_DB_PATH`.
- Update `DEPLOY.md`, `.env.example`, `README.md`, and `app/lib/db/README.md`
  Phase markers to reflect Phase 1.

## 7. Error Handling

- Missing/invalid `DATABASE_URL` → fail fast at startup with a clear message.
- Scoped single-row ops return `null` / `false` for not-found **or** not-owned
  (no information leak distinguishing the two).
- Zod validators in `app/lib/validators/` remain the input boundary; the repo
  trusts validated inputs (unchanged contract).
- FK violations (e.g. `category_id` from another user) are prevented by scoping
  category lookups to `user_id` before insert.

## 8. Testing

- **Phase A:** `mock.ts` + `mock-repo.test.ts` updated to new `userId`
  signatures, still in-memory. Add a cross-user isolation case (user B cannot
  read/update/delete user A's row). No DB needed — CI green throughout Phase A.
- **Phase B:** A Drizzle integration test suite runs against a **real Postgres**
  provided by a GitHub Actions `services: postgres` block with `DATABASE_URL`.
  It re-asserts the repo contract (the same behaviors the mock tests cover) plus
  SQL-specific concerns: scoping, `saved` aggregation, the `(user_id,
  occurred_at, created_at)` ordering, `addContribution` atomicity, and the
  `numeric`→`number` boundary (a written `12.50` reads back as `12.5`, not
  `"12.50"`).
- Existing Playwright e2e (`tests/e2e/`) continues to exercise the real stack.

## 9. Build Sequence

**Phase A (mock, no DB):**
1. Add `userId` to `PordeeRepo` + domain types (`types.ts`).
2. Update `mock.ts` to scope all operations by `userId`.
3. Update `mock-repo.test.ts`; add cross-user isolation test. Green.
4. Update all 8 route call sites to thread `user.id` from `requireUser`. Green
   (typecheck + vitest + e2e).

**Phase B (Drizzle + Postgres):**
5. Add deps: `drizzle-orm`, `drizzle-kit`, `pg` (+ types). `drizzle.config.ts`.
6. Write `schema.ts`; `db:generate` initial migration.
7. Implement `drizzleRepo` in `drizzle.ts`.
8. Add CI Postgres service + Drizzle integration tests. Green.
9. Switch `index.ts` to export `drizzleRepo`.
10. Move Better Auth to Postgres; drop SQLite path + env.
11. Update DEPLOY.md / .env.example / READMEs; wire Dokploy Postgres + pre-start
    migrate.

## 10. Out of Scope (YAGNI)

- Changing `Money` to `string` app-wide (the `numeric`↔`number` seam is
  contained in `drizzle.ts` instead — see §4.4).
- Multi-instance / connection-pool tuning beyond a single pool.
- Data migration from the throwaway SQLite auth file.
- Categories/goals as *separate* slices beyond reusing the established pattern —
  they ship after the Transactions slice proves the pattern.
