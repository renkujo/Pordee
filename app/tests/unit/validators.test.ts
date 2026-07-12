import { describe, expect, it } from "vitest";
import {
  createTransactionSchema,
  getTransactionDiscountState,
  transactionDiscountErrors,
} from "~/lib/validators/transaction";
import { createGoalSchema, addContributionSchema } from "~/lib/validators/goal";
import {
  createCategorySchema,
  updateCategorySchema,
} from "~/lib/validators/category";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "~/lib/validators/auth";

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

describe("getTransactionDiscountState", () => {
  it("returns the net expense amount after discount", () => {
    const result = getTransactionDiscountState({
      kind: "expense",
      amount: "200",
      discountAmount: "50",
    });

    expect(result.netAmount).toBe(150);
    expect(result.discountNumber).toBe(50);
    expect(result.hasValidDiscount).toBe(true);
    expect(result.canUseNetAmount).toBe(true);
  });

  it("rejects invalid discount values for expenses", () => {
    expect(
      getTransactionDiscountState({
        kind: "expense",
        amount: "100",
        discountAmount: "-1",
      }).discountError
    ).toBe(transactionDiscountErrors.invalid);

    expect(
      getTransactionDiscountState({
        kind: "expense",
        amount: "100",
        discountAmount: "100",
      }).discountError
    ).toBe(transactionDiscountErrors.tooHigh);
  });

  it("ignores discount input for income", () => {
    const result = getTransactionDiscountState({
      kind: "income",
      amount: "100",
      discountAmount: "40",
    });

    expect(result.appliesDiscount).toBe(false);
    expect(result.discountNumber).toBe(0);
    expect(result.netAmount).toBe(100);
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
    expect(result.icon).toBe("tags");
  });

  it("accepts category icons from the allowlist", () => {
    const result = createCategorySchema.parse({
      name: "ของใช้บ้าน",
      kind: "expense",
      icon: "home",
    });

    expect(result.icon).toBe("home");
    expect(() =>
      createCategorySchema.parse({
        name: "ของใช้บ้าน",
        kind: "expense",
        icon: "unknown",
      })
    ).toThrow();
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
      icon: "utensils",
    });
    expect(result.id).toBe("cat-food");
    expect(result.name).toBe("อาหารนอกบ้าน");
    expect(result.icon).toBe("utensils");
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

describe("changePasswordSchema", () => {
  it("accepts a strong new password and matching confirmation", () => {
    const result = changePasswordSchema.parse({
      currentPassword: "password123",
      newPassword: "Password1@",
      confirmPassword: "Password1@",
    });

    expect(result.newPassword).toBe("Password1@");
  });

  it("rejects weak, repeated, or mismatched passwords", () => {
    expect(() =>
      changePasswordSchema.parse({
        currentPassword: "password123",
        newPassword: "password123",
        confirmPassword: "password123",
      })
    ).toThrow();

    expect(() =>
      changePasswordSchema.parse({
        currentPassword: "password123",
        newPassword: "Password1@",
        confirmPassword: "Password2@",
      })
    ).toThrow();
  });
});

describe("forgotPasswordSchema", () => {
  it("accepts a valid email and rejects malformed input", () => {
    expect(
      forgotPasswordSchema.parse({ email: "user@pordee.test" }).email
    ).toBe("user@pordee.test");
    expect(() =>
      forgotPasswordSchema.parse({ email: "not-an-email" })
    ).toThrow();
  });
});

describe("resetPasswordSchema", () => {
  it("accepts a strong matching password with a reset token", () => {
    const result = resetPasswordSchema.parse({
      confirmPassword: "Password1@",
      newPassword: "Password1@",
      token: "reset-token",
    });

    expect(result.token).toBe("reset-token");
  });

  it("rejects weak, mismatched, or tokenless reset attempts", () => {
    expect(() =>
      resetPasswordSchema.parse({
        confirmPassword: "password",
        newPassword: "password",
        token: "reset-token",
      })
    ).toThrow();
    expect(() =>
      resetPasswordSchema.parse({
        confirmPassword: "Password2@",
        newPassword: "Password1@",
        token: "reset-token",
      })
    ).toThrow();
    expect(() =>
      resetPasswordSchema.parse({
        confirmPassword: "Password1@",
        newPassword: "Password1@",
        token: "",
      })
    ).toThrow();
  });
});
