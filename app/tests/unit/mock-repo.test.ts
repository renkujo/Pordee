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
    expect(names).toEqual(["งานเสริม", "บิล", "อาหาร", "เงินเดือน", "เดินทาง"]);
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
