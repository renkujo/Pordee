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
