# DB Phase 1 (Postgres + Drizzle, User-Scoped) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the finance data layer from the in-memory mock to Postgres via Drizzle with per-user data scoping, moving Better Auth onto the same Postgres, landing a complete Transactions vertical slice and the supporting Categories/Goals migrations.

**Architecture:** Keep `PordeeRepo` as the single seam (`app/lib/db/index.ts`). **Phase A** changes only the *interface* (adds `userId` as first arg) against the still-in-memory mock so every route + unit test goes green with no database. **Phase B** implements `drizzleRepo` against Postgres, swaps the export, moves auth to Postgres, and wires migrations + CI Postgres + Dokploy.

**Tech Stack:** React Router v7 (SSR loaders/actions), Drizzle ORM + drizzle-kit, `pg` (node-postgres), Postgres `numeric(12,2)` money mapped to JS `number` at the repo boundary, Better Auth (Postgres dialect via kysely), Vitest, Playwright, Dokploy.

Spec: `app/docs/superpowers/specs/2026-05-31-db-phase1-postgres-drizzle-design.md`

---

## File Structure

**Phase A (interface-first, on mock):**
- Modify `app/lib/db/types.ts` — add `userId` to domain types + every `PordeeRepo` method signature.
- Modify `app/lib/db/mock.ts` — scope all store operations by `userId`; seed categories per-user.
- Modify `tests/unit/mock-repo.test.ts` — pass `userId`; add cross-user isolation tests.
- Modify 8 route files — thread `user.id` from `requireUser` into every `repo.*` call:
  `app/routes/add.tsx`, `dashboard.tsx`, `wallet.tsx`, `history.tsx`, `history.$id.tsx`, `goals.tsx`, `settings.tsx`. (`_shell.tsx` already calls `requireUser`.)

**Phase B (Drizzle + Postgres):**
- Create `app/lib/db/schema.ts` — Drizzle table definitions.
- Create `app/lib/db/client.ts` — `pg` Pool + `drizzle()` instance, cached on `globalThis`.
- Create `app/lib/db/drizzle.ts` — `drizzleRepo: PordeeRepo`.
- Create `drizzle.config.ts` (app root).
- Create `app/lib/db/migrations/` — generated SQL migrations.
- Create `tests/integration/drizzle-repo.test.ts` — integration suite against real Postgres.
- Create `vitest.integration.config.ts` — separate config for integration tests.
- Modify `app/lib/db/index.ts` — export `drizzleRepo`.
- Modify `app/lib/auth.server.ts` — Postgres dialect, drop SQLite.
- Modify `package.json` — deps + `db:generate`/`db:migrate`/`test:integration` scripts.
- Modify `.env.example`, `DEPLOY.md`, `README.md`, `app/lib/db/README.md`, `Dockerfile`, `.github/workflows/ci.yml`.

---

# PHASE A — Interface-first on the mock (no database)

## Task A1: Add `userId` to domain types and the repo interface

**Files:**
- Modify: `app/lib/db/types.ts`

- [ ] **Step 1: Add `userId` to domain entities and `userId`-first method signatures**

Replace the entire contents of `app/lib/db/types.ts` with:

```ts
export type Money = number;

export type TransactionKind = "expense" | "income";

export interface Category {
  id: string;
  userId: string;
  name: string;
  kind: TransactionKind;
}

export interface Transaction {
  id: string;
  userId: string;
  kind: TransactionKind;
  title: string;
  amount: Money;
  categoryId: string | null;
  note: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  target: Money;
  saved: Money;
  createdAt: string;
}

export interface GoalContribution {
  id: string;
  userId: string;
  goalId: string;
  amount: Money;
  note: string | null;
  occurredAt: string;
}

export interface PordeeRepo {
  listCategories(userId: string): Promise<Category[]>;
  createCategory(
    userId: string,
    input: Omit<Category, "id" | "userId">
  ): Promise<Category>;
  updateCategory(
    userId: string,
    id: string,
    input: Pick<Category, "name">
  ): Promise<Category | null>;
  deleteCategory(userId: string, id: string): Promise<boolean>;
  countTransactionsByCategory(
    userId: string,
    categoryId: string
  ): Promise<number>;
  listTransactions(
    userId: string,
    opts?: {
      from?: string;
      to?: string;
      kind?: TransactionKind;
      categoryId?: string;
    }
  ): Promise<Transaction[]>;
  getTransaction(userId: string, id: string): Promise<Transaction | null>;
  createTransaction(
    userId: string,
    input: Omit<Transaction, "id" | "userId" | "createdAt">
  ): Promise<Transaction>;
  updateTransaction(
    userId: string,
    id: string,
    input: Omit<Transaction, "id" | "userId" | "createdAt">
  ): Promise<Transaction | null>;
  deleteTransaction(userId: string, id: string): Promise<boolean>;
  listGoals(userId: string): Promise<Goal[]>;
  createGoal(
    userId: string,
    input: Omit<Goal, "id" | "userId" | "createdAt" | "saved">
  ): Promise<Goal>;
  addContribution(
    userId: string,
    input: Omit<GoalContribution, "id" | "userId">
  ): Promise<GoalContribution>;
}
```

- [ ] **Step 2: Verify it fails to compile (mock no longer satisfies the interface)**

Run: `pnpm typecheck`
Expected: FAIL — `app/lib/db/mock.ts` errors (`mockRepo` no longer assignable to `PordeeRepo`) and route call sites error (too few arguments). This proves the seam changed.

- [ ] **Step 3: Commit the interface change**

Compilation is expected to be red until A2–A4; commit the interface as a checkpoint.

```bash
git add app/lib/db/types.ts
git commit -m "feat(db): add userId to PordeeRepo interface and domain types"
```

---

## Task A2: Scope the mock store by userId (per-user category seeding)

**Files:**
- Modify: `app/lib/db/mock.ts`

- [ ] **Step 1: Rewrite the mock to scope every operation by userId**

The current mock seeds 5 global categories. With scoping, categories must be seeded **per user on first access** (each new user gets the default category set). Replace the entire contents of `app/lib/db/mock.ts` with:

```ts
import { randomUUID } from "node:crypto";
import type {
  Category,
  Goal,
  GoalContribution,
  PordeeRepo,
  Transaction,
} from "./types";

interface Store {
  seededUsers: Set<string>;
  categories: Category[];
  transactions: Transaction[];
  goals: Goal[];
  contributions: GoalContribution[];
}

declare global {
  var __pordeeStore: Store | undefined;
}

const DEFAULT_CATEGORIES: Array<Pick<Category, "name" | "kind">> = [
  { name: "อาหาร", kind: "expense" },
  { name: "เดินทาง", kind: "expense" },
  { name: "บิล", kind: "expense" },
  { name: "เงินเดือน", kind: "income" },
  { name: "งานเสริม", kind: "income" },
];

function emptyStore(): Store {
  return {
    seededUsers: new Set<string>(),
    categories: [],
    transactions: [],
    goals: [],
    contributions: [],
  };
}

const store: Store = (globalThis.__pordeeStore ??= emptyStore());

function nowIso() {
  return new Date().toISOString();
}

function inRange(occurredAt: string, from?: string, to?: string) {
  if (from && occurredAt < from) return false;
  if (to && occurredAt > to) return false;
  return true;
}

// Seed the default category set the first time we see a user.
function ensureSeeded(userId: string) {
  if (store.seededUsers.has(userId)) return;
  store.seededUsers.add(userId);
  for (const def of DEFAULT_CATEGORIES) {
    store.categories.push({ id: randomUUID(), userId, ...def });
  }
}

export const mockRepo: PordeeRepo = {
  async listCategories(userId) {
    ensureSeeded(userId);
    return store.categories.filter((c) => c.userId === userId);
  },

  async createCategory(userId, input) {
    ensureSeeded(userId);
    const category: Category = { id: randomUUID(), userId, ...input };
    store.categories.push(category);
    return category;
  },

  async updateCategory(userId, id, input) {
    const idx = store.categories.findIndex(
      (c) => c.id === id && c.userId === userId
    );
    if (idx === -1) return null;
    const next: Category = { ...store.categories[idx], name: input.name };
    store.categories[idx] = next;
    return next;
  },

  async deleteCategory(userId, id) {
    if (
      store.transactions.some(
        (t) => t.categoryId === id && t.userId === userId
      )
    ) {
      return false;
    }
    const idx = store.categories.findIndex(
      (c) => c.id === id && c.userId === userId
    );
    if (idx === -1) return false;
    store.categories.splice(idx, 1);
    return true;
  },

  async countTransactionsByCategory(userId, categoryId) {
    return store.transactions.filter(
      (t) => t.categoryId === categoryId && t.userId === userId
    ).length;
  },

  async listTransactions(userId, opts = {}) {
    return store.transactions
      .filter((t) => t.userId === userId)
      .filter((t) => inRange(t.occurredAt, opts.from, opts.to))
      .filter((t) => (opts.kind ? t.kind === opts.kind : true))
      .filter((t) =>
        opts.categoryId ? t.categoryId === opts.categoryId : true
      )
      .sort((a, b) => {
        if (a.occurredAt !== b.occurredAt) {
          return a.occurredAt < b.occurredAt ? 1 : -1;
        }
        if (a.createdAt !== b.createdAt) {
          return a.createdAt < b.createdAt ? 1 : -1;
        }
        return 0;
      });
  },

  async getTransaction(userId, id) {
    return (
      store.transactions.find((t) => t.id === id && t.userId === userId) ?? null
    );
  },

  async createTransaction(userId, input) {
    const tx: Transaction = {
      id: randomUUID(),
      userId,
      createdAt: nowIso(),
      ...input,
    };
    store.transactions.unshift(tx);
    return tx;
  },

  async updateTransaction(userId, id, input) {
    const idx = store.transactions.findIndex(
      (t) => t.id === id && t.userId === userId
    );
    if (idx === -1) return null;
    const existing = store.transactions[idx];
    const next: Transaction = {
      ...existing,
      ...input,
      id: existing.id,
      userId: existing.userId,
      createdAt: existing.createdAt,
    };
    store.transactions[idx] = next;
    return next;
  },

  async deleteTransaction(userId, id) {
    const idx = store.transactions.findIndex(
      (t) => t.id === id && t.userId === userId
    );
    if (idx === -1) return false;
    store.transactions.splice(idx, 1);
    return true;
  },

  async listGoals(userId) {
    return store.goals.filter((g) => g.userId === userId);
  },

  async createGoal(userId, input) {
    const goal: Goal = {
      id: randomUUID(),
      userId,
      createdAt: nowIso(),
      saved: 0,
      ...input,
    };
    store.goals.unshift(goal);
    return goal;
  },

  async addContribution(userId, input) {
    const contribution: GoalContribution = {
      id: randomUUID(),
      userId,
      ...input,
    };
    store.contributions.push(contribution);
    const goal = store.goals.find(
      (g) => g.id === input.goalId && g.userId === userId
    );
    if (goal) {
      goal.saved += input.amount;
    }
    return contribution;
  },
};
```

- [ ] **Step 2: Verify the mock compiles against the interface**

Run: `pnpm typecheck`
Expected: `app/lib/db/mock.ts` no longer errors. Route files STILL error (fixed in A4). That is acceptable here.

- [ ] **Step 3: Commit**

```bash
git add app/lib/db/mock.ts
git commit -m "feat(db): scope mock store by userId with per-user category seeding"
```

---

## Task A3: Update mock unit tests + add cross-user isolation tests

**Files:**
- Modify: `tests/unit/mock-repo.test.ts`

The old test reached into `globalThis.__pordeeStore` and pushed 5 fixed-id categories. The new seeding is per-user with random ids, so the seed test changes to assert the default *names* for a user, and every call passes a `userId`.

- [ ] **Step 1: Rewrite the test file**

Replace the entire contents of `tests/unit/mock-repo.test.ts` with:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockRepo } from "~/lib/db/mock";

interface PordeeStore {
  seededUsers: Set<string>;
  categories: unknown[];
  transactions: unknown[];
  goals: unknown[];
  contributions: unknown[];
}

const USER_A = "user-a";
const USER_B = "user-b";

beforeEach(() => {
  vi.useRealTimers();
  const store = (globalThis as unknown as { __pordeeStore: PordeeStore })
    .__pordeeStore;
  store.seededUsers.clear();
  store.categories.length = 0;
  store.transactions.length = 0;
  store.goals.length = 0;
  store.contributions.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("mockRepo seed", () => {
  it("seeds the default category set on first access per user", async () => {
    const cats = await mockRepo.listCategories(USER_A);
    const names = cats.map((c) => c.name).sort();
    expect(names).toEqual(["งานเสริม", "บิล", "อาหาร", "เดินทาง", "เงินเดือน"]);
    expect(cats.find((c) => c.name === "เงินเดือน")?.kind).toBe("income");
    expect(cats.every((c) => c.userId === USER_A)).toBe(true);
  });

  it("does not re-seed on subsequent access", async () => {
    const first = await mockRepo.listCategories(USER_A);
    const second = await mockRepo.listCategories(USER_A);
    expect(second).toHaveLength(first.length);
  });
});

describe("mockRepo categories", () => {
  it("creates, updates, and deletes an unused category", async () => {
    const created = await mockRepo.createCategory(USER_A, {
      name: "ของใช้บ้าน",
      kind: "expense",
    });
    expect(created.id).toBeTruthy();
    expect(created.userId).toBe(USER_A);

    const updated = await mockRepo.updateCategory(USER_A, created.id, {
      name: "ของใช้ในบ้าน",
    });
    expect(updated?.name).toBe("ของใช้ในบ้าน");

    expect(await mockRepo.deleteCategory(USER_A, created.id)).toBe(true);
    expect(
      (await mockRepo.listCategories(USER_A)).some((c) => c.id === created.id)
    ).toBe(false);
  });

  it("does not delete a category used by transactions", async () => {
    const cat = await mockRepo.createCategory(USER_A, {
      name: "อาหาร",
      kind: "expense",
    });
    await mockRepo.createTransaction(USER_A, {
      kind: "expense",
      title: "กาแฟ",
      amount: 55,
      categoryId: cat.id,
      note: null,
      occurredAt: "2026-05-01T03:00:00.000Z",
    });

    expect(await mockRepo.countTransactionsByCategory(USER_A, cat.id)).toBe(1);
    expect(await mockRepo.deleteCategory(USER_A, cat.id)).toBe(false);
    expect(
      (await mockRepo.listCategories(USER_A)).some((c) => c.id === cat.id)
    ).toBe(true);
  });
});

describe("mockRepo transactions", () => {
  it("creates and lists in reverse chronological order", async () => {
    const earlier = await mockRepo.createTransaction(USER_A, {
      kind: "expense",
      title: "กาแฟ",
      amount: 55,
      categoryId: null,
      note: null,
      occurredAt: "2026-05-01T03:00:00.000Z",
    });
    const later = await mockRepo.createTransaction(USER_A, {
      kind: "expense",
      title: "ข้าวเย็น",
      amount: 120,
      categoryId: null,
      note: null,
      occurredAt: "2026-05-10T12:00:00.000Z",
    });

    const all = await mockRepo.listTransactions(USER_A);
    expect(all.map((t) => t.id)).toEqual([later.id, earlier.id]);
  });

  it("uses createdAt as a stable tie-breaker for same-day transactions", async () => {
    vi.useFakeTimers();
    const occurredAt = "2026-05-10T12:00:00.000Z";

    vi.setSystemTime(new Date("2026-05-10T01:00:00.000Z"));
    const first = await mockRepo.createTransaction(USER_A, {
      kind: "expense",
      title: "กาแฟ",
      amount: 55,
      categoryId: null,
      note: null,
      occurredAt,
    });

    vi.setSystemTime(new Date("2026-05-10T01:01:00.000Z"));
    const second = await mockRepo.createTransaction(USER_A, {
      kind: "expense",
      title: "ข้าวเย็น",
      amount: 120,
      categoryId: null,
      note: null,
      occurredAt,
    });

    const all = await mockRepo.listTransactions(USER_A);
    expect(all.map((t) => t.id)).toEqual([second.id, first.id]);
  });

  it("filters by kind and category", async () => {
    const bills = await mockRepo.createCategory(USER_A, {
      name: "บิล",
      kind: "expense",
    });
    const salary = await mockRepo.createCategory(USER_A, {
      name: "เงินเดือน",
      kind: "income",
    });
    await mockRepo.createTransaction(USER_A, {
      kind: "expense",
      title: "บิลน้ำ",
      amount: 200,
      categoryId: bills.id,
      note: null,
      occurredAt: "2026-05-05T00:00:00.000Z",
    });
    await mockRepo.createTransaction(USER_A, {
      kind: "income",
      title: "เงินเดือน",
      amount: 30000,
      categoryId: salary.id,
      note: null,
      occurredAt: "2026-05-25T00:00:00.000Z",
    });

    const income = await mockRepo.listTransactions(USER_A, { kind: "income" });
    expect(income).toHaveLength(1);
    expect(income[0].categoryId).toBe(salary.id);

    const billsOnly = await mockRepo.listTransactions(USER_A, {
      categoryId: bills.id,
    });
    expect(billsOnly).toHaveLength(1);
    expect(billsOnly[0].title).toBe("บิลน้ำ");
  });
});

describe("mockRepo transactions: get/update/delete", () => {
  it("getTransaction returns the row or null", async () => {
    const tx = await mockRepo.createTransaction(USER_A, {
      kind: "expense",
      title: "กาแฟ",
      amount: 65,
      categoryId: null,
      note: null,
      occurredAt: "2026-05-10T00:00:00.000Z",
    });
    expect((await mockRepo.getTransaction(USER_A, tx.id))?.title).toBe("กาแฟ");
    expect(await mockRepo.getTransaction(USER_A, "no-such-id")).toBeNull();
  });

  it("updateTransaction overwrites fields but preserves id + createdAt", async () => {
    const tx = await mockRepo.createTransaction(USER_A, {
      kind: "expense",
      title: "ข้าวเที่ยง",
      amount: 60,
      categoryId: null,
      note: null,
      occurredAt: "2026-05-10T00:00:00.000Z",
    });
    const originalCreatedAt = tx.createdAt;

    const updated = await mockRepo.updateTransaction(USER_A, tx.id, {
      kind: "expense",
      title: "ข้าวเที่ยง (แก้)",
      amount: 80,
      categoryId: null,
      note: "ซื้อเพิ่มชา",
      occurredAt: tx.occurredAt,
    });

    expect(updated).not.toBeNull();
    expect(updated!.id).toBe(tx.id);
    expect(updated!.createdAt).toBe(originalCreatedAt);
    expect(updated!.title).toBe("ข้าวเที่ยง (แก้)");
    expect(updated!.amount).toBe(80);
    expect(updated!.note).toBe("ซื้อเพิ่มชา");

    const reread = await mockRepo.getTransaction(USER_A, tx.id);
    expect(reread?.amount).toBe(80);
  });

  it("updateTransaction returns null for unknown id", async () => {
    const res = await mockRepo.updateTransaction(USER_A, "nope", {
      kind: "expense",
      title: "x",
      amount: 1,
      categoryId: null,
      note: null,
      occurredAt: "2026-05-10T00:00:00.000Z",
    });
    expect(res).toBeNull();
  });

  it("deleteTransaction removes the row and returns true; false for unknown id", async () => {
    const tx = await mockRepo.createTransaction(USER_A, {
      kind: "expense",
      title: "ขนม",
      amount: 30,
      categoryId: null,
      note: null,
      occurredAt: "2026-05-10T00:00:00.000Z",
    });
    expect(await mockRepo.deleteTransaction(USER_A, tx.id)).toBe(true);
    expect(await mockRepo.getTransaction(USER_A, tx.id)).toBeNull();
    expect(await mockRepo.deleteTransaction(USER_A, tx.id)).toBe(false);
  });
});

describe("mockRepo goals", () => {
  it("creates a goal with saved=0 and tracks contributions", async () => {
    const goal = await mockRepo.createGoal(USER_A, {
      name: "ทริปเชียงใหม่",
      target: 8000,
    });
    expect(goal.saved).toBe(0);
    expect(goal.userId).toBe(USER_A);

    await mockRepo.addContribution(USER_A, {
      goalId: goal.id,
      amount: 1500,
      note: null,
      occurredAt: "2026-05-15T00:00:00.000Z",
    });
    await mockRepo.addContribution(USER_A, {
      goalId: goal.id,
      amount: 500,
      note: "เก็บเพิ่ม",
      occurredAt: "2026-05-20T00:00:00.000Z",
    });

    const goals = await mockRepo.listGoals(USER_A);
    expect(goals).toHaveLength(1);
    expect(goals[0].saved).toBe(2000);
  });
});

describe("mockRepo user isolation", () => {
  it("user B cannot see, read, update, or delete user A's transaction", async () => {
    const tx = await mockRepo.createTransaction(USER_A, {
      kind: "expense",
      title: "ส่วนตัว A",
      amount: 99,
      categoryId: null,
      note: null,
      occurredAt: "2026-05-10T00:00:00.000Z",
    });

    expect(await mockRepo.listTransactions(USER_B)).toHaveLength(0);
    expect(await mockRepo.getTransaction(USER_B, tx.id)).toBeNull();
    expect(
      await mockRepo.updateTransaction(USER_B, tx.id, {
        kind: "expense",
        title: "hijack",
        amount: 1,
        categoryId: null,
        note: null,
        occurredAt: tx.occurredAt,
      })
    ).toBeNull();
    expect(await mockRepo.deleteTransaction(USER_B, tx.id)).toBe(false);

    // A's row is untouched.
    expect((await mockRepo.getTransaction(USER_A, tx.id))?.title).toBe(
      "ส่วนตัว A"
    );
  });

  it("each user gets an independent default category set", async () => {
    const a = await mockRepo.listCategories(USER_A);
    const b = await mockRepo.listCategories(USER_B);
    expect(a).toHaveLength(5);
    expect(b).toHaveLength(5);
    expect(a.every((c) => c.userId === USER_A)).toBe(true);
    expect(b.every((c) => c.userId === USER_B)).toBe(true);
    // disjoint ids
    const aIds = new Set(a.map((c) => c.id));
    expect(b.some((c) => aIds.has(c.id))).toBe(false);
  });
});
```

- [ ] **Step 2: Run the mock tests**

Run: `pnpm vitest run tests/unit/mock-repo.test.ts`
Expected: PASS (all describe blocks green, including `mockRepo user isolation`).

- [ ] **Step 3: Commit**

```bash
git add tests/unit/mock-repo.test.ts
git commit -m "test(db): scope mock-repo tests by userId and add isolation tests"
```

---

## Task A4: Thread `user.id` into every route call site

Each route loader/action must obtain the user id and pass it as the first arg.
`requireUser` is already exported from `app/lib/auth.server.ts`. Loaders/actions
that don't yet receive `request` must add it to their args.

**Files:**
- Modify: `app/routes/add.tsx`
- Modify: `app/routes/dashboard.tsx`
- Modify: `app/routes/wallet.tsx`
- Modify: `app/routes/history.tsx`
- Modify: `app/routes/history.$id.tsx`
- Modify: `app/routes/goals.tsx`
- Modify: `app/routes/settings.tsx`

- [ ] **Step 1: `add.tsx`** — add the import, get the user in loader + action.

At the top with the other `~/lib` imports add:
```ts
import { requireUser } from "~/lib/auth.server";
```
Replace the loader (`app/routes/add.tsx:41-44`):
```ts
export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const categories = await repo.listCategories(user.id);
  return { categories };
}
```
In the action signature change `{ request }` stays, and at the top of the action body (after `const form = await request.formData();` is fine, but get the user first) add right after the `action({ request }: ...)` opening:
```ts
  const user = await requireUser(request);
```
Replace the `repo.createTransaction({...})` call (`app/routes/add.tsx:131-138`) with:
```ts
  await repo.createTransaction(user.id, {
    kind: parsed.data.kind,
    title: parsed.data.title,
    amount: parsed.data.amount,
    categoryId: parsed.data.categoryId,
    note: parsed.data.note,
    occurredAt: parsed.data.occurredAt,
  });
```

- [ ] **Step 2: `dashboard.tsx`** — loader already takes `{ request }`.

Add import:
```ts
import { requireUser } from "~/lib/auth.server";
```
In the loader, immediately after `export async function loader({ request }: Route.LoaderArgs) {` add:
```ts
  const user = await requireUser(request);
```
Replace the `Promise.all` block (`app/routes/dashboard.tsx:27-31`):
```ts
  const [monthTx, categories, goals] = await Promise.all([
    repo.listTransactions(user.id, { from, to }),
    repo.listCategories(user.id),
    repo.listGoals(user.id),
  ]);
```

- [ ] **Step 3: `wallet.tsx`** — loader currently takes no args.

Add import:
```ts
import { requireUser } from "~/lib/auth.server";
```
Replace the loader signature + `Promise.all` (`app/routes/wallet.tsx:28-36`):
```ts
export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const now = new Date();
  const { from, to } = getMonthRange(now);
  const [allTx, monthTx, categories, goals] = await Promise.all([
    repo.listTransactions(user.id),
    repo.listTransactions(user.id, { from, to }),
    repo.listCategories(user.id),
    repo.listGoals(user.id),
  ]);
```

- [ ] **Step 4: `history.tsx`** — loader takes no args; action takes `{ request }`.

Add import:
```ts
import { requireUser } from "~/lib/auth.server";
```
Replace the loader (`app/routes/history.tsx:55-66`):
```ts
export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const [transactions, categories] = await Promise.all([
    repo.listTransactions(user.id),
    repo.listCategories(user.id),
  ]);
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  return {
    categories,
    transactions,
    categoryNameById: Object.fromEntries(categoryNameById),
  };
}
```
In the action, after `const form = await request.formData();` get the user, then pass it. Replace `const ok = await repo.deleteTransaction(id);` (`app/routes/history.tsx:77`) with:
```ts
  const user = await requireUser(request);
  const ok = await repo.deleteTransaction(user.id, id);
```

- [ ] **Step 5: `history.$id.tsx`** — loader takes `{ params }`; action takes `{ params, request }`.

Add import:
```ts
import { requireUser } from "~/lib/auth.server";
```
Replace the loader (`app/routes/history.$id.tsx:56-63`):
```ts
export async function loader({ params, request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const tx = await repo.getTransaction(user.id, params.id);
  if (!tx) {
    throw data("ไม่พบรายการ", { status: 404 });
  }
  const categories = await repo.listCategories(user.id);
  return { tx, categories };
}
```
In the action, after `const form = await request.formData();` add:
```ts
  const user = await requireUser(request);
```
Replace `const ok = await repo.deleteTransaction(params.id);` (`:81`) with:
```ts
    const ok = await repo.deleteTransaction(user.id, params.id);
```
Replace `const updated = await repo.updateTransaction(params.id, parsed.data);` (`:116`) with:
```ts
  const updated = await repo.updateTransaction(user.id, params.id, parsed.data);
```

- [ ] **Step 6: `goals.tsx`** — loader takes no args; action takes `{ request }`.

Add import:
```ts
import { requireUser } from "~/lib/auth.server";
```
Replace the loader (`app/routes/goals.tsx:27-30`):
```ts
export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const goals = await repo.listGoals(user.id);
  return { goals };
}
```
In the action, after `const form = await request.formData();` add:
```ts
  const user = await requireUser(request);
```
Replace `const goals = await repo.listGoals();` (`:103`) with:
```ts
    const goals = await repo.listGoals(user.id);
```
Replace `await repo.addContribution(parsed.data);` (`:117`) with:
```ts
    await repo.addContribution(user.id, parsed.data);
```
Replace `await repo.createGoal(parsed.data);` (`:150`) with:
```ts
  await repo.createGoal(user.id, parsed.data);
```

- [ ] **Step 7: `settings.tsx`** — loader takes no args; action takes `{ request }`. Note this file has a `findDuplicateCategory` helper that also calls `repo.listCategories()` — find and thread it too.

Add import:
```ts
import { requireUser } from "~/lib/auth.server";
```
Replace the loader (`app/routes/settings.tsx:57-69`):
```ts
export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const categories = await repo.listCategories(user.id);
  const usageByCategoryId = Object.fromEntries(
    await Promise.all(
      categories.map(async (category) => [
        category.id,
        await repo.countTransactionsByCategory(user.id, category.id),
      ])
    )
  );

  return { categories, usageByCategoryId };
}
```
In the action, after `const form = await request.formData();` add:
```ts
  const user = await requireUser(request);
```
Then update each repo call in the action body:
- `:103` `await repo.createCategory(parsed.data);` → `await repo.createCategory(user.id, parsed.data);`
- `:117` `const categories = await repo.listCategories();` → `const categories = await repo.listCategories(user.id);`
- `:132` `await repo.updateCategory(category.id, { name: parsed.data.name });` → `await repo.updateCategory(user.id, category.id, { name: parsed.data.name });`
- `:142` `const usage = await repo.countTransactionsByCategory(parsed.data.id);` → `const usage = await repo.countTransactionsByCategory(user.id, parsed.data.id);`
- `:151` `const ok = await repo.deleteCategory(parsed.data.id);` → `const ok = await repo.deleteCategory(user.id, parsed.data.id);`

Also locate `findDuplicateCategory` (a helper that wraps `repo.listCategories()` — search the file). It must accept and pass `user.id`. Change its signature to take `userId` as the first param, pass `userId` to `repo.listCategories(userId)` inside it, and update both call sites in the action (lines ~95 and ~123) to pass `user.id` as the first argument.

- [ ] **Step 8: Typecheck the whole app**

Run: `pnpm typecheck`
Expected: PASS (zero errors). If any route still errors, it's a missed `repo.*` call — grep with `grep -rn "repo\.\(list\|create\|update\|delete\|get\|add\|count\)" app/routes/` and confirm every call's first arg is a user id.

- [ ] **Step 9: Run unit tests + lint + format**

Run: `pnpm vitest run && pnpm lint && pnpm format:check`
Expected: all PASS.

- [ ] **Step 10: Run the e2e smoke suite**

Run: `pnpm build && pnpm e2e`
Expected: PASS. (The mock is still in use, so behavior is unchanged for a logged-in user; isolation is now real.)

- [ ] **Step 11: Commit**

```bash
git add app/routes
git commit -m "feat(routes): thread authenticated user.id into all repo calls"
```

---

**Phase A checkpoint:** `pnpm typecheck && pnpm lint && pnpm format:check && pnpm vitest run` all green, no database required. The interface seam is fully user-scoped on the mock.

---

# PHASE B — Drizzle + Postgres

## Task B1: Add dependencies and scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime + dev deps**

Run:
```bash
pnpm add drizzle-orm pg
pnpm add -D drizzle-kit @types/pg
```
Expected: `package.json` gains `drizzle-orm`, `pg` (deps) and `drizzle-kit`, `@types/pg` (devDeps); `pnpm-lock.yaml` updates.

- [ ] **Step 2: Add `pg` to pnpm `onlyBuiltDependencies`**

`pg` and its native deps may need build approval. In `package.json`, update the `pnpm.onlyBuiltDependencies` array (currently `["esbuild", "sharp"]`) to also include `"pg"`:
```json
  "pnpm": {
    "onlyBuiltDependencies": [
      "esbuild",
      "sharp",
      "pg"
    ]
  },
```

- [ ] **Step 3: Add scripts**

In `package.json` `scripts`, add:
```json
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "test:integration": "vitest run --config vitest.integration.config.ts",
```

- [ ] **Step 4: Verify install**

Run: `pnpm typecheck`
Expected: PASS (no source changes yet).

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "build(db): add drizzle-orm, pg, drizzle-kit deps and db scripts"
```

---

## Task B2: Drizzle schema

**Files:**
- Create: `app/lib/db/schema.ts`

Money columns are `numeric(12,2)`. Better Auth owns the `user` table; we only
reference `user.id` by name (text) without redefining it, to avoid coupling our
migrations to Better Auth's DDL. FK is declared against the literal table/column.

- [ ] **Step 1: Write the schema**

Create `app/lib/db/schema.ts`:
```ts
import { sql } from "drizzle-orm";
import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Better Auth owns the `user` table; reference its id without redefining it.
const userIdRef = (name = "user_id") =>
  text(name)
    .notNull()
    .references(() => sql`"user"("id")`);

export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    kind: text("kind").notNull(), // 'expense' | 'income'
  },
  (t) => ({
    userIdx: index("categories_user_idx").on(t.userId),
  })
);

export const transactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    categoryId: text("category_id"),
    note: text("note"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    userOrderIdx: index("transactions_user_order_idx").on(
      t.userId,
      t.occurredAt,
      t.createdAt
    ),
  })
);

export const goals = pgTable(
  "goals",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    target: numeric("target", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    userIdx: index("goals_user_idx").on(t.userId),
  })
);

export const goalContributions = pgTable(
  "goal_contributions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    goalId: text("goal_id").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    note: text("note"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    goalIdx: index("goal_contributions_goal_idx").on(t.goalId),
    userIdx: index("goal_contributions_user_idx").on(t.userId),
  })
);
```

> Note: `userIdRef` is provided for reference but the columns above declare
> `user_id` as plain `text().notNull()`. We keep the FK out of the Drizzle schema
> because Better Auth manages the `user` table on its own schedule; ownership is
> enforced in the repo via `WHERE user_id = $1`. If you later want a DB-level FK,
> add it in a hand-written migration after confirming Better Auth's table exists.
> Delete the unused `userIdRef`/`sql` import if you go this route to keep lint clean.

- [ ] **Step 2: Remove unused imports to satisfy lint**

Since the columns use plain `text().notNull()` (no FK), delete the `import { sql } ...` line and the `userIdRef` helper. Final imports should be only:
```ts
import { index, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/lib/db/schema.ts
git commit -m "feat(db): add drizzle schema for finance tables (numeric money)"
```

---

## Task B3: drizzle-kit config + initial migration

**Files:**
- Create: `drizzle.config.ts` (app root)
- Create: `app/lib/db/migrations/*` (generated)

- [ ] **Step 1: Write `drizzle.config.ts`**

Create `drizzle.config.ts` at the app root:
```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./app/lib/db/schema.ts",
  out: "./app/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
```

- [ ] **Step 2: Generate the initial migration**

Run: `pnpm db:generate`
Expected: a new SQL file under `app/lib/db/migrations/` (e.g. `0000_*.sql`) plus a `meta/` snapshot directory. Open the SQL and confirm it creates `categories`, `transactions`, `goals`, `goal_contributions` with `numeric(12, 2)` amount columns and the named indexes.

- [ ] **Step 3: Commit**

```bash
git add drizzle.config.ts app/lib/db/migrations
git commit -m "feat(db): drizzle-kit config and initial finance migration"
```

---

## Task B4: Postgres client (pooled, globalThis-cached)

**Files:**
- Create: `app/lib/db/client.ts`

- [ ] **Step 1: Write the client**

Create `app/lib/db/client.ts`:
```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  var __pordeePool: Pool | undefined;
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Postgres is required in Phase 1."
    );
  }
  return url;
}

// Reuse one pool across HMR reloads / module re-evaluations.
const pool: Pool = (globalThis.__pordeePool ??= new Pool({
  connectionString: getDatabaseUrl(),
}));

export const db = drizzle(pool, { schema });
export { pool };
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/lib/db/client.ts
git commit -m "feat(db): pooled postgres client with drizzle instance"
```

---

## Task B5: drizzleRepo implementation

**Files:**
- Create: `app/lib/db/drizzle.ts`

The `numeric` ↔ `number` boundary lives entirely here: parse on read, pass number
on write. `listGoals` computes `saved` as a SUM via a left join + group by.

- [ ] **Step 1: Write the repo**

Create `app/lib/db/drizzle.ts`:
```ts
import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "./client";
import {
  categories,
  goalContributions,
  goals,
  transactions,
} from "./schema";
import type {
  Category,
  Goal,
  GoalContribution,
  PordeeRepo,
  Transaction,
} from "./types";

const DEFAULT_CATEGORIES: Array<Pick<Category, "name" | "kind">> = [
  { name: "อาหาร", kind: "expense" },
  { name: "เดินทาง", kind: "expense" },
  { name: "บิล", kind: "expense" },
  { name: "เงินเดือน", kind: "income" },
  { name: "งานเสริม", kind: "income" },
];

function toMoney(value: string): number {
  return Number(value);
}

function rowToTransaction(row: typeof transactions.$inferSelect): Transaction {
  return {
    id: row.id,
    userId: row.userId,
    kind: row.kind as Transaction["kind"],
    title: row.title,
    amount: toMoney(row.amount),
    categoryId: row.categoryId,
    note: row.note,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function rowToCategory(row: typeof categories.$inferSelect): Category {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    kind: row.kind as Category["kind"],
  };
}

// Seed default categories the first time a user has none.
async function ensureSeeded(userId: string): Promise<void> {
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.userId, userId))
    .limit(1);
  if (existing.length > 0) return;
  await db.insert(categories).values(
    DEFAULT_CATEGORIES.map((c) => ({
      id: randomUUID(),
      userId,
      name: c.name,
      kind: c.kind,
    }))
  );
}

export const drizzleRepo: PordeeRepo = {
  async listCategories(userId) {
    await ensureSeeded(userId);
    const rows = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId));
    return rows.map(rowToCategory);
  },

  async createCategory(userId, input) {
    const row = {
      id: randomUUID(),
      userId,
      name: input.name,
      kind: input.kind,
    };
    await db.insert(categories).values(row);
    return rowToCategory(row as typeof categories.$inferSelect);
  },

  async updateCategory(userId, id, input) {
    const updated = await db
      .update(categories)
      .set({ name: input.name })
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning();
    return updated.length ? rowToCategory(updated[0]) : null;
  },

  async deleteCategory(userId, id) {
    const used = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(eq(transactions.categoryId, id), eq(transactions.userId, userId))
      )
      .limit(1);
    if (used.length > 0) return false;
    const deleted = await db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning({ id: categories.id });
    return deleted.length > 0;
  },

  async countTransactionsByCategory(userId, categoryId) {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(
        and(
          eq(transactions.categoryId, categoryId),
          eq(transactions.userId, userId)
        )
      );
    return result[0]?.count ?? 0;
  },

  async listTransactions(userId, opts = {}) {
    const conditions = [eq(transactions.userId, userId)];
    if (opts.from) {
      conditions.push(sql`${transactions.occurredAt} >= ${opts.from}`);
    }
    if (opts.to) {
      conditions.push(sql`${transactions.occurredAt} <= ${opts.to}`);
    }
    if (opts.kind) {
      conditions.push(eq(transactions.kind, opts.kind));
    }
    if (opts.categoryId) {
      conditions.push(eq(transactions.categoryId, opts.categoryId));
    }
    const rows = await db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt));
    return rows.map(rowToTransaction);
  },

  async getTransaction(userId, id) {
    const rows = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .limit(1);
    return rows.length ? rowToTransaction(rows[0]) : null;
  },

  async createTransaction(userId, input) {
    const row = {
      id: randomUUID(),
      userId,
      kind: input.kind,
      title: input.title,
      amount: String(input.amount),
      categoryId: input.categoryId,
      note: input.note,
      occurredAt: new Date(input.occurredAt),
      createdAt: new Date(),
    };
    const inserted = await db.insert(transactions).values(row).returning();
    return rowToTransaction(inserted[0]);
  },

  async updateTransaction(userId, id, input) {
    const updated = await db
      .update(transactions)
      .set({
        kind: input.kind,
        title: input.title,
        amount: String(input.amount),
        categoryId: input.categoryId,
        note: input.note,
        occurredAt: new Date(input.occurredAt),
      })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();
    return updated.length ? rowToTransaction(updated[0]) : null;
  },

  async deleteTransaction(userId, id) {
    const deleted = await db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning({ id: transactions.id });
    return deleted.length > 0;
  },

  async listGoals(userId) {
    const rows = await db
      .select({
        id: goals.id,
        userId: goals.userId,
        name: goals.name,
        target: goals.target,
        createdAt: goals.createdAt,
        saved: sql<string>`coalesce(sum(${goalContributions.amount}), 0)`,
      })
      .from(goals)
      .leftJoin(goalContributions, eq(goalContributions.goalId, goals.id))
      .where(eq(goals.userId, userId))
      .groupBy(goals.id)
      .orderBy(desc(goals.createdAt));
    return rows.map(
      (r): Goal => ({
        id: r.id,
        userId: r.userId,
        name: r.name,
        target: toMoney(r.target),
        saved: toMoney(r.saved),
        createdAt: r.createdAt.toISOString(),
      })
    );
  },

  async createGoal(userId, input) {
    const row = {
      id: randomUUID(),
      userId,
      name: input.name,
      target: String(input.target),
      createdAt: new Date(),
    };
    const inserted = await db.insert(goals).values(row).returning();
    const g = inserted[0];
    return {
      id: g.id,
      userId: g.userId,
      name: g.name,
      target: toMoney(g.target),
      saved: 0,
      createdAt: g.createdAt.toISOString(),
    };
  },

  async addContribution(userId, input) {
    return db.transaction(async (tx) => {
      // Ownership check: the goal must belong to this user.
      const owned = await tx
        .select({ id: goals.id })
        .from(goals)
        .where(and(eq(goals.id, input.goalId), eq(goals.userId, userId)))
        .limit(1);
      if (owned.length === 0) {
        throw new Error("goal not found for user");
      }
      const row = {
        id: randomUUID(),
        userId,
        goalId: input.goalId,
        amount: String(input.amount),
        note: input.note,
        occurredAt: new Date(input.occurredAt),
      };
      const inserted = await tx
        .insert(goalContributions)
        .values(row)
        .returning();
      const c = inserted[0];
      return {
        id: c.id,
        userId: c.userId,
        goalId: c.goalId,
        amount: toMoney(c.amount),
        note: c.note,
        occurredAt: c.occurredAt.toISOString(),
      } satisfies GoalContribution;
    });
  },
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/lib/db/drizzle.ts
git commit -m "feat(db): implement user-scoped drizzleRepo against postgres"
```

---

## Task B6: Integration tests against real Postgres

**Files:**
- Create: `vitest.integration.config.ts`
- Create: `tests/integration/drizzle-repo.test.ts`

These run only when `DATABASE_URL` points at a disposable Postgres. Locally:
`docker run --rm -e POSTGRES_PASSWORD=pordee -e POSTGRES_DB=pordee_test -p 5433:5432 postgres:16`
then `DATABASE_URL=postgres://postgres:pordee@localhost:5433/pordee_test pnpm db:migrate && pnpm test:integration`.

- [ ] **Step 1: Write the integration vitest config**

Create `vitest.integration.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "~": new URL("./app", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/integration/**/*.{test,spec}.{ts,tsx}"],
    fileParallelism: false,
  },
});
```

- [ ] **Step 2: Write the integration test**

Create `tests/integration/drizzle-repo.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { drizzleRepo } from "~/lib/db/drizzle";
import { db, pool } from "~/lib/db/client";
import {
  categories,
  goalContributions,
  goals,
  transactions,
} from "~/lib/db/schema";

const USER_A = "itest-user-a";
const USER_B = "itest-user-b";

beforeEach(async () => {
  await db.delete(goalContributions);
  await db.delete(goals);
  await db.delete(transactions);
  await db.delete(categories);
});

afterAll(async () => {
  await pool.end();
});

describe("drizzleRepo categories", () => {
  it("seeds default categories per user on first access", async () => {
    const cats = await drizzleRepo.listCategories(USER_A);
    expect(cats).toHaveLength(5);
    expect(cats.every((c) => c.userId === USER_A)).toBe(true);
    // No re-seed on second call.
    expect(await drizzleRepo.listCategories(USER_A)).toHaveLength(5);
  });

  it("blocks deleting a category in use", async () => {
    const cat = await drizzleRepo.createCategory(USER_A, {
      name: "อาหาร",
      kind: "expense",
    });
    await drizzleRepo.createTransaction(USER_A, {
      kind: "expense",
      title: "กาแฟ",
      amount: 55,
      categoryId: cat.id,
      note: null,
      occurredAt: "2026-05-01T03:00:00.000Z",
    });
    expect(await drizzleRepo.countTransactionsByCategory(USER_A, cat.id)).toBe(
      1
    );
    expect(await drizzleRepo.deleteCategory(USER_A, cat.id)).toBe(false);
  });
});

describe("drizzleRepo transactions", () => {
  it("lists newest first and round-trips numeric amount as number", async () => {
    const earlier = await drizzleRepo.createTransaction(USER_A, {
      kind: "expense",
      title: "เก่า",
      amount: 12.5,
      categoryId: null,
      note: null,
      occurredAt: "2026-05-01T00:00:00.000Z",
    });
    const later = await drizzleRepo.createTransaction(USER_A, {
      kind: "expense",
      title: "ใหม่",
      amount: 120,
      categoryId: null,
      note: null,
      occurredAt: "2026-05-10T00:00:00.000Z",
    });
    const all = await drizzleRepo.listTransactions(USER_A);
    expect(all.map((t) => t.id)).toEqual([later.id, earlier.id]);
    // numeric(12,2) "12.50" reads back as number 12.5, not "12.50".
    const reread = await drizzleRepo.getTransaction(USER_A, earlier.id);
    expect(reread?.amount).toBe(12.5);
    expect(typeof reread?.amount).toBe("number");
  });

  it("filters by kind and category", async () => {
    const bills = await drizzleRepo.createCategory(USER_A, {
      name: "บิล",
      kind: "expense",
    });
    await drizzleRepo.createTransaction(USER_A, {
      kind: "expense",
      title: "บิลน้ำ",
      amount: 200,
      categoryId: bills.id,
      note: null,
      occurredAt: "2026-05-05T00:00:00.000Z",
    });
    await drizzleRepo.createTransaction(USER_A, {
      kind: "income",
      title: "เงินเดือน",
      amount: 30000,
      categoryId: null,
      note: null,
      occurredAt: "2026-05-25T00:00:00.000Z",
    });
    expect(
      await drizzleRepo.listTransactions(USER_A, { kind: "income" })
    ).toHaveLength(1);
    expect(
      await drizzleRepo.listTransactions(USER_A, { categoryId: bills.id })
    ).toHaveLength(1);
  });
});

describe("drizzleRepo goals", () => {
  it("computes saved as the sum of contributions", async () => {
    const goal = await drizzleRepo.createGoal(USER_A, {
      name: "ทริป",
      target: 8000,
    });
    expect(goal.saved).toBe(0);
    await drizzleRepo.addContribution(USER_A, {
      goalId: goal.id,
      amount: 1500,
      note: null,
      occurredAt: "2026-05-15T00:00:00.000Z",
    });
    await drizzleRepo.addContribution(USER_A, {
      goalId: goal.id,
      amount: 500.25,
      note: "เพิ่ม",
      occurredAt: "2026-05-20T00:00:00.000Z",
    });
    const goals = await drizzleRepo.listGoals(USER_A);
    expect(goals).toHaveLength(1);
    expect(goals[0].saved).toBe(2000.25);
  });

  it("rejects a contribution to another user's goal", async () => {
    const goal = await drizzleRepo.createGoal(USER_A, {
      name: "ของ A",
      target: 1000,
    });
    await expect(
      drizzleRepo.addContribution(USER_B, {
        goalId: goal.id,
        amount: 100,
        note: null,
        occurredAt: "2026-05-20T00:00:00.000Z",
      })
    ).rejects.toThrow();
    expect((await drizzleRepo.listGoals(USER_A))[0].saved).toBe(0);
  });
});

describe("drizzleRepo user isolation", () => {
  it("scopes reads and writes by user", async () => {
    const tx = await drizzleRepo.createTransaction(USER_A, {
      kind: "expense",
      title: "ของ A",
      amount: 99,
      categoryId: null,
      note: null,
      occurredAt: "2026-05-10T00:00:00.000Z",
    });
    expect(await drizzleRepo.listTransactions(USER_B)).toHaveLength(0);
    expect(await drizzleRepo.getTransaction(USER_B, tx.id)).toBeNull();
    expect(
      await drizzleRepo.updateTransaction(USER_B, tx.id, {
        kind: "expense",
        title: "hijack",
        amount: 1,
        categoryId: null,
        note: null,
        occurredAt: tx.occurredAt,
      })
    ).toBeNull();
    expect(await drizzleRepo.deleteTransaction(USER_B, tx.id)).toBe(false);
    expect((await drizzleRepo.getTransaction(USER_A, tx.id))?.title).toBe(
      "ของ A"
    );
  });
});
```

- [ ] **Step 3: Run migrations against a local disposable Postgres, then run integration tests**

Run:
```bash
docker run -d --name pordee-itest -e POSTGRES_PASSWORD=pordee -e POSTGRES_DB=pordee_test -p 5433:5432 postgres:16
export DATABASE_URL=postgres://postgres:pordee@localhost:5433/pordee_test
# wait ~2s for Postgres to accept connections, then:
pnpm db:migrate
pnpm test:integration
```
Expected: all integration tests PASS. The numeric round-trip test confirms `12.5`/`2000.25` come back as `number`, and the isolation/ownership tests pass.

- [ ] **Step 4: Tear down local Postgres**

Run: `docker rm -f pordee-itest && unset DATABASE_URL`

- [ ] **Step 5: Commit**

```bash
git add vitest.integration.config.ts tests/integration/drizzle-repo.test.ts
git commit -m "test(db): integration suite for drizzleRepo against postgres"
```

---

## Task B7: Move Better Auth to Postgres

**Files:**
- Modify: `app/lib/auth.server.ts`

Better Auth accepts a kysely-compatible dialect or a `pg` Pool. We pass the same
pool from `client.ts` so auth + finance share one Postgres. The SQLite path and
`PORDEE_AUTH_DB_PATH` are removed. The existing `ensureAuthDatabase()` /
`getMigrations` flow is preserved — it now migrates the Better Auth tables into
Postgres.

- [ ] **Step 1: Rewrite the database wiring in `auth.server.ts`**

Replace the top of `app/lib/auth.server.ts` (lines 1-29, through the `betterAuth({...})` call) with:
```ts
import { redirect } from "react-router";
import { betterAuth } from "better-auth";
import { APIError, isAPIError } from "better-auth/api";
import { getMigrations } from "better-auth/db/migration";
import { pool } from "~/lib/db/client";

export const auth = betterAuth({
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:5173",
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "pordee-dev-auth-secret-change-before-production",
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    cookiePrefix: "pordee",
  },
});
```
Leave everything from `let migrationPromise` downward unchanged.

> If Better Auth's installed version does not accept a raw `pg.Pool` for
> `database`, wrap it in a kysely `PostgresDialect` (kysely is already a dep):
> ```ts
> import { Kysely, PostgresDialect } from "kysely";
> // ...
> database: { db: new Kysely({ dialect: new PostgresDialect({ pool }) }), type: "postgres" }
> ```
> Verify against the installed `better-auth@1.6.11` adapter docs before choosing;
> prefer the plain `pool` form if it compiles and migrates.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS. If `database: pool` is rejected by the type, switch to the kysely-dialect form from the note above and re-run.

- [ ] **Step 3: Verify auth migrations run against Postgres**

Run (with a disposable Postgres and `DATABASE_URL` set, as in B6 Step 3, after `pnpm db:migrate`):
```bash
docker run -d --name pordee-itest -e POSTGRES_PASSWORD=pordee -e POSTGRES_DB=pordee_test -p 5433:5432 postgres:16
export DATABASE_URL=postgres://postgres:pordee@localhost:5433/pordee_test
pnpm db:migrate
pnpm build && pnpm start &
sleep 3
# Hit the signup endpoint to force ensureAuthDatabase() to migrate auth tables.
curl -s -X POST http://localhost:3000/api/auth/sign-up/email \
  -H 'content-type: application/json' \
  -d '{"email":"itest@example.com","password":"itest-password-123","name":"itest"}' | head -c 300
echo
# Confirm the better-auth tables exist in Postgres:
docker exec pordee-itest psql -U postgres -d pordee_test -c "\dt"
kill %1
docker rm -f pordee-itest && unset DATABASE_URL
```
Expected: the signup returns a session/user JSON (not a 500), and `\dt` lists `user`, `session`, `account`, `verification` alongside the finance tables.

- [ ] **Step 4: Commit**

```bash
git add app/lib/auth.server.ts
git commit -m "feat(auth): move better-auth from sqlite to shared postgres pool"
```

---

## Task B8: Flip the repo export to Drizzle

**Files:**
- Modify: `app/lib/db/index.ts`

- [ ] **Step 1: Switch the export**

Replace the entire contents of `app/lib/db/index.ts` with:
```ts
import { drizzleRepo } from "./drizzle";
import type { PordeeRepo } from "./types";

export const repo: PordeeRepo = drizzleRepo;
export type { PordeeRepo } from "./types";
export type {
  Category,
  Goal,
  GoalContribution,
  Transaction,
  TransactionKind,
} from "./types";
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Run unit tests (mock tests import `mock.ts` directly, not the export)**

Run: `pnpm vitest run`
Expected: PASS — the mock unit tests import `~/lib/db/mock` directly, so they are unaffected by the export swap.

- [ ] **Step 4: Commit**

```bash
git add app/lib/db/index.ts
git commit -m "feat(db): export drizzleRepo as the active repo"
```

---

## Task B9: CI Postgres service for integration tests

**Files:**
- Modify: `.github/workflows/ci.yml`

Add a `services: postgres` block + a migrate + integration-test step to the
`check` job. The existing unit tests (`pnpm test`) stay DB-free.

- [ ] **Step 1: Add the Postgres service and steps to the `check` job**

In `.github/workflows/ci.yml`, under `jobs.check`, add a `services` block (sibling of `runs-on`) and two new steps after `Unit tests`:
```yaml
  check:
    name: typecheck • lint • test • build
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: pordee
          POSTGRES_DB: pordee_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgres://postgres:pordee@localhost:5432/pordee_test
    steps:
      # ... existing checkout / pnpm / node / install / typecheck / lint / format / unit steps ...

      - name: DB migrate
        run: pnpm db:migrate

      - name: Integration tests
        run: pnpm test:integration

      # ... existing Build step ...
```
Keep all existing steps; insert `DB migrate` + `Integration tests` between `Unit tests` and `Build`. The `env: DATABASE_URL` at job level makes it available to migrate, integration tests, and build.

- [ ] **Step 2: Validate YAML locally**

Run: `python3 -c "import yaml,sys; yaml.safe_load(open('../.github/workflows/ci.yml')); print('yaml ok')"`
(Adjust the path: the workflow is at repo root `.github/workflows/ci.yml`, i.e. one level up from `app/`.)
Expected: `yaml ok`.

- [ ] **Step 3: Commit**

```bash
git add ../.github/workflows/ci.yml
git commit -m "ci(db): add postgres service, migrate, and integration test steps"
```

---

## Task B10: Deploy + docs + Dockerfile updates

**Files:**
- Modify: `.env.example`
- Modify: `Dockerfile`
- Modify: `DEPLOY.md`
- Modify: `README.md`
- Modify: `app/lib/db/README.md`

- [ ] **Step 1: `.env.example` — require `DATABASE_URL`, drop the SQLite path**

Replace the entire contents of `.env.example` with:
```
# Pordee — Phase 1 environment
# Finance data and Better Auth both use Postgres now.

NODE_ENV=development
PORT=3000
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=replace-with-a-random-production-secret
DATABASE_URL=postgres://pordee:pordee@localhost:5432/pordee
```

- [ ] **Step 2: `Dockerfile` — remove SQLite env + volume**

In `Dockerfile`, delete line `ENV PORDEE_AUTH_DB_PATH=/app/.data/auth.sqlite` and the `VOLUME ["/app/.data"]` line. The runner stage no longer needs a data volume because state lives in Postgres. Final runner stage:
```dockerfile
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY package.json ./
EXPOSE 3000
CMD ["node", "node_modules/@react-router/serve/dist/cli.js", "./build/server/index.js"]
```

- [ ] **Step 3: `DEPLOY.md` — Phase 1 Postgres instructions**

Update `DEPLOY.md`: change the "Phase 0 / no Postgres" framing to Phase 1. Specifically:
- Replace the intro paragraph (lines ~3-7) to state finance + auth both use Postgres.
- In the Docker run example, drop `PORDEE_AUTH_DB_PATH`, the `-v pordee-auth-data:/app/.data` volume, and add `-e DATABASE_URL=...`.
- In the Dokploy section, replace the SQLite volume-mount step with: add a Postgres service (with its own persistent volume), set `DATABASE_URL` in the app env, and run `pnpm db:migrate` as a pre-start/release step. Remove the `/app/.data` mount step.
- Replace the env var block with the `.env.example` Phase 1 vars (no `PORDEE_AUTH_DB_PATH`, add `DATABASE_URL`).
- Update the "Phase 1 (preview)" section to "done"/current, or delete it.

- [ ] **Step 4: `README.md` + `app/lib/db/README.md` — reflect Phase 1**

In `app/lib/db/README.md`: replace the "Phase 0 uses an in-memory mockRepo" framing with "Phase 1: `repo` is `drizzleRepo` backed by Postgres; `mockRepo` is retained for unit tests only." Update the "Phase 1 swap plan" section to a "done" note, and add: integration tests need `DATABASE_URL`; `db:generate` after schema changes, `db:migrate` to apply.
In the top-level `README.md`: update any Phase 0 / in-memory mention to note Postgres + `DATABASE_URL` is now required to run.

- [ ] **Step 5: Verify the build still works without a DB-at-build-time assumption**

Run: `pnpm build`
Expected: PASS. (Build must not require a live DB. The pool is created lazily at module load; `pnpm build` compiles only. If build evaluates `client.ts` and throws on missing `DATABASE_URL`, set a dummy `DATABASE_URL` for the build step in CI/Dockerfile, or make pool creation lazy. Confirm behavior and, if needed, defer pool creation until first query via a getter.)

- [ ] **Step 6: Commit**

```bash
git add .env.example Dockerfile DEPLOY.md README.md app/lib/db/README.md
git commit -m "docs(db): update deploy, env, and readmes for postgres (phase 1)"
```

---

## Final Verification

- [ ] **Step 1: Full local gate (no DB needed for these)**

Run: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm vitest run`
Expected: all PASS.

- [ ] **Step 2: Integration + e2e with a local Postgres**

Run:
```bash
docker run -d --name pordee-itest -e POSTGRES_PASSWORD=pordee -e POSTGRES_DB=pordee_test -p 5433:5432 postgres:16
export DATABASE_URL=postgres://postgres:pordee@localhost:5433/pordee_test
pnpm db:migrate
pnpm test:integration
pnpm build && pnpm e2e
docker rm -f pordee-itest && unset DATABASE_URL
```
Expected: integration tests PASS; e2e smoke PASS against the real Postgres-backed stack.

- [ ] **Step 3: Push and confirm CI green** (only when the user asks to push)

---

## Notes for the implementer

- **Money boundary:** Postgres `numeric` comes back as a JS **string** from `pg`. The repo converts on read (`Number(...)`) and writes numbers as `String(...)`. Never leak a string `amount` past `drizzle.ts`. The integration test asserts `typeof amount === "number"`.
- **`saved` is derived:** never store it; `listGoals` computes it via `SUM`. `createGoal` returns `saved: 0` directly (no contributions yet).
- **Seeding:** both `mockRepo` and `drizzleRepo` seed the 5 default categories per user on first access (mock keys on a `seededUsers` set; drizzle checks for zero existing rows). Keep the two `DEFAULT_CATEGORIES` lists identical.
- **Ownership:** every single-row op filters `(id AND user_id)`; not-found and not-owned both return `null`/`false`. `addContribution` checks goal ownership inside the transaction before inserting.
- **Auth + finance share one pool** (`app/lib/db/client.ts`). Don't create a second pool in `auth.server.ts`.
- **Do not delete the react-grab dev tool** (`app/lib/dev/react-grab.tsx`) or its mount — preserve `ReactGrabDev` body + mount per project memory.
