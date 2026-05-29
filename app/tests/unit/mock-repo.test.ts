import { beforeEach, describe, expect, it } from "vitest";
import { mockRepo } from "~/lib/db/mock";

interface PordeeStore {
  categories: unknown[];
  transactions: unknown[];
  goals: unknown[];
  contributions: unknown[];
}

beforeEach(() => {
  const store = (globalThis as unknown as { __pordeeStore: PordeeStore })
    .__pordeeStore;
  store.transactions.length = 0;
  store.goals.length = 0;
  store.contributions.length = 0;
});

describe("mockRepo seed", () => {
  it("seeds the expected categories", async () => {
    const cats = await mockRepo.listCategories();
    const ids = cats.map((c) => c.id).sort();
    expect(ids).toEqual([
      "cat-bills",
      "cat-food",
      "cat-salary",
      "cat-side",
      "cat-transport",
    ]);
    expect(cats.find((c) => c.id === "cat-salary")?.kind).toBe("income");
  });
});

describe("mockRepo transactions", () => {
  it("creates and lists in reverse chronological order", async () => {
    const earlier = await mockRepo.createTransaction({
      kind: "expense",
      title: "กาแฟ",
      amount: 55,
      categoryId: "cat-food",
      note: null,
      occurredAt: "2026-05-01T03:00:00.000Z",
    });
    const later = await mockRepo.createTransaction({
      kind: "expense",
      title: "ข้าวเย็น",
      amount: 120,
      categoryId: "cat-food",
      note: null,
      occurredAt: "2026-05-10T12:00:00.000Z",
    });

    const all = await mockRepo.listTransactions();
    expect(all.map((t) => t.id)).toEqual([later.id, earlier.id]);
  });

  it("filters by kind and category", async () => {
    await mockRepo.createTransaction({
      kind: "expense",
      title: "บิลน้ำ",
      amount: 200,
      categoryId: "cat-bills",
      note: null,
      occurredAt: "2026-05-05T00:00:00.000Z",
    });
    await mockRepo.createTransaction({
      kind: "income",
      title: "เงินเดือน",
      amount: 30000,
      categoryId: "cat-salary",
      note: null,
      occurredAt: "2026-05-25T00:00:00.000Z",
    });

    const income = await mockRepo.listTransactions({ kind: "income" });
    expect(income).toHaveLength(1);
    expect(income[0].categoryId).toBe("cat-salary");

    const bills = await mockRepo.listTransactions({ categoryId: "cat-bills" });
    expect(bills).toHaveLength(1);
    expect(bills[0].title).toBe("บิลน้ำ");
  });
});

describe("mockRepo transactions: get/update/delete", () => {
  it("getTransaction returns the row or null", async () => {
    const tx = await mockRepo.createTransaction({
      kind: "expense",
      title: "กาแฟ",
      amount: 65,
      categoryId: "cat-food",
      note: null,
      occurredAt: "2026-05-10T00:00:00.000Z",
    });
    expect((await mockRepo.getTransaction(tx.id))?.title).toBe("กาแฟ");
    expect(await mockRepo.getTransaction("no-such-id")).toBeNull();
  });

  it("updateTransaction overwrites fields but preserves id + createdAt", async () => {
    const tx = await mockRepo.createTransaction({
      kind: "expense",
      title: "ข้าวเที่ยง",
      amount: 60,
      categoryId: "cat-food",
      note: null,
      occurredAt: "2026-05-10T00:00:00.000Z",
    });
    const originalCreatedAt = tx.createdAt;

    const updated = await mockRepo.updateTransaction(tx.id, {
      kind: "expense",
      title: "ข้าวเที่ยง (แก้)",
      amount: 80,
      categoryId: "cat-food",
      note: "ซื้อเพิ่มชา",
      occurredAt: tx.occurredAt,
    });

    expect(updated).not.toBeNull();
    expect(updated!.id).toBe(tx.id);
    expect(updated!.createdAt).toBe(originalCreatedAt);
    expect(updated!.title).toBe("ข้าวเที่ยง (แก้)");
    expect(updated!.amount).toBe(80);
    expect(updated!.note).toBe("ซื้อเพิ่มชา");

    const reread = await mockRepo.getTransaction(tx.id);
    expect(reread?.amount).toBe(80);
  });

  it("updateTransaction returns null for unknown id", async () => {
    const res = await mockRepo.updateTransaction("nope", {
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
    const tx = await mockRepo.createTransaction({
      kind: "expense",
      title: "ขนม",
      amount: 30,
      categoryId: "cat-food",
      note: null,
      occurredAt: "2026-05-10T00:00:00.000Z",
    });
    expect(await mockRepo.deleteTransaction(tx.id)).toBe(true);
    expect(await mockRepo.getTransaction(tx.id)).toBeNull();
    expect(await mockRepo.deleteTransaction(tx.id)).toBe(false);
  });
});

describe("mockRepo goals", () => {
  it("creates a goal with saved=0 and tracks contributions", async () => {
    const goal = await mockRepo.createGoal({
      name: "ทริปเชียงใหม่",
      target: 8000,
    });
    expect(goal.saved).toBe(0);

    await mockRepo.addContribution({
      goalId: goal.id,
      amount: 1500,
      note: null,
      occurredAt: "2026-05-15T00:00:00.000Z",
    });
    await mockRepo.addContribution({
      goalId: goal.id,
      amount: 500,
      note: "เก็บเพิ่ม",
      occurredAt: "2026-05-20T00:00:00.000Z",
    });

    const goals = await mockRepo.listGoals();
    expect(goals).toHaveLength(1);
    expect(goals[0].saved).toBe(2000);
  });
});
