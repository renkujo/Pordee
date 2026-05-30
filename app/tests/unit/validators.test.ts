import { describe, expect, it } from "vitest";
import { createTransactionSchema } from "~/lib/validators/transaction";
import { createGoalSchema, addContributionSchema } from "~/lib/validators/goal";
import {
  createCategorySchema,
  updateCategorySchema,
} from "~/lib/validators/category";

describe("createTransactionSchema", () => {
  it("accepts a minimal valid expense", () => {
    const result = createTransactionSchema.parse({
      kind: "expense",
      title: "ข้าวเที่ยง",
      amount: 60,
    });
    expect(result.kind).toBe("expense");
    expect(result.amount).toBe(60);
    expect(result.categoryId).toBeNull();
    expect(result.note).toBeNull();
    expect(result.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("coerces a numeric string amount", () => {
    const result = createTransactionSchema.parse({
      kind: "income",
      title: "เงินเดือน",
      amount: "45000",
    });
    expect(result.amount).toBe(45000);
  });

  it("rejects zero or negative amounts", () => {
    expect(() =>
      createTransactionSchema.parse({ kind: "expense", title: "x", amount: 0 })
    ).toThrow();
    expect(() =>
      createTransactionSchema.parse({
        kind: "expense",
        title: "x",
        amount: -10,
      })
    ).toThrow();
  });

  it("rejects empty title after trim", () => {
    expect(() =>
      createTransactionSchema.parse({
        kind: "expense",
        title: "   ",
        amount: 50,
      })
    ).toThrow();
  });

  it("rejects unknown kinds", () => {
    expect(() =>
      createTransactionSchema.parse({ kind: "savings", title: "x", amount: 1 })
    ).toThrow();
  });
});

describe("category schemas", () => {
  it("creates a category with a valid name and kind", () => {
    const result = createCategorySchema.parse({
      name: " ของใช้บ้าน ",
      kind: "expense",
    });
    expect(result.name).toBe("ของใช้บ้าน");
    expect(result.kind).toBe("expense");
  });

  it("rejects empty names and unknown kinds", () => {
    expect(() =>
      createCategorySchema.parse({ name: " ", kind: "expense" })
    ).toThrow();
    expect(() =>
      createCategorySchema.parse({ name: "โบนัส", kind: "saving" })
    ).toThrow();
  });

  it("updates category names by id", () => {
    const result = updateCategorySchema.parse({
      id: "cat-food",
      name: "อาหารนอกบ้าน",
    });
    expect(result.id).toBe("cat-food");
    expect(result.name).toBe("อาหารนอกบ้าน");
  });
});

describe("goal schemas", () => {
  it("createGoalSchema requires positive target", () => {
    const ok = createGoalSchema.parse({
      name: "ทริปเชียงใหม่",
      target: 8000,
    });
    expect(ok.target).toBe(8000);
    expect(() => createGoalSchema.parse({ name: "x", target: 0 })).toThrow();
    expect(() => createGoalSchema.parse({ name: "  ", target: 100 })).toThrow();
  });

  it("addContributionSchema requires goalId + positive amount", () => {
    const ok = addContributionSchema.parse({ goalId: "g1", amount: 500 });
    expect(ok.amount).toBe(500);
    expect(() =>
      addContributionSchema.parse({ goalId: "", amount: 10 })
    ).toThrow();
    expect(() =>
      addContributionSchema.parse({ goalId: "g1", amount: -1 })
    ).toThrow();
  });
});
