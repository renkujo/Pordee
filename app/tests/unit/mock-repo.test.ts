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
