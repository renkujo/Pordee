import { z } from "zod";

export const transactionKindSchema = z.enum(["expense", "income"]);
export const transactionSourceSchema = z.enum(["manual", "recurring"]);

export const transactionDiscountErrors = {
  invalid: "transaction.discount.error.invalid",
  tooHigh: "transaction.discount.error.tooHigh",
} as const;

export const createTransactionSchema = z.object({
  kind: transactionKindSchema,
  title: z.string().trim().min(1, "กรอกรายการ").max(120),
  amount: z.coerce.number().positive("จำนวนต้องมากกว่า 0"),
  categoryId: z.string().trim().min(1).nullable().default(null),
  note: z.string().trim().max(500).nullable().default(null),
  occurredAt: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = z.object({
  kind: transactionKindSchema,
  title: z.string().trim().min(1, "กรอกรายการ").max(120),
  amount: z.coerce.number().positive("จำนวนต้องมากกว่า 0"),
  categoryId: z.string().trim().min(1).nullable().default(null),
  note: z.string().trim().max(500).nullable().default(null),
  occurredAt: z.string().datetime(),
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const recurringFrequencySchema = z.enum([
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);

export const recurringPostModeSchema = z.enum(["confirm", "auto"]);

const dayValueSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "เลือกวันที่ให้ถูกต้อง");

export const recurringTemplateSchema = z
  .object({
    kind: transactionKindSchema,
    title: z.string().trim().min(1, "กรอกรายการ").max(120),
    amount: z.coerce.number().positive("จำนวนต้องมากกว่า 0"),
    categoryId: z.string().trim().min(1).nullable().default(null),
    note: z.string().trim().max(500).nullable().default(null),
    frequency: recurringFrequencySchema,
    weeklyDay: z.coerce.number().int().min(0).max(6).nullable().default(null),
    monthlyDay: z.coerce.number().int().min(1).max(31).nullable().default(null),
    yearlyMonth: z.coerce
      .number()
      .int()
      .min(1)
      .max(12)
      .nullable()
      .default(null),
    yearlyDay: z.coerce.number().int().min(1).max(31).nullable().default(null),
    startDate: dayValueSchema,
    endDate: dayValueSchema.nullable().default(null),
    postMode: recurringPostModeSchema,
  })
  .superRefine((value, ctx) => {
    if (value.endDate && value.endDate < value.startDate) {
      ctx.addIssue({
        code: "custom",
        message: "วันสิ้นสุดต้องไม่ก่อนวันเริ่ม",
        path: ["endDate"],
      });
    }
    if (value.frequency === "weekly" && value.weeklyDay === null) {
      ctx.addIssue({
        code: "custom",
        message: "เลือกวันในสัปดาห์",
        path: ["weeklyDay"],
      });
    }
    if (value.frequency === "monthly" && value.monthlyDay === null) {
      ctx.addIssue({
        code: "custom",
        message: "เลือกวันที่ของเดือน",
        path: ["monthlyDay"],
      });
    }
    if (
      value.frequency === "yearly" &&
      (value.yearlyMonth === null || value.yearlyDay === null)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "เลือกวันและเดือนของปี",
        path: ["yearlyDay"],
      });
    }
  });

export type RecurringTemplateInput = z.infer<typeof recurringTemplateSchema>;

interface TransactionDiscountStateInput {
  kind: unknown;
  amount: unknown;
  discountAmount: unknown;
}

export const getTransactionDiscountState = ({
  kind,
  amount,
  discountAmount,
}: TransactionDiscountStateInput) => {
  const appliesDiscount = kind === "expense";
  const amountNumber =
    typeof amount === "number"
      ? amount
      : typeof amount === "string"
        ? Number(amount)
        : Number.NaN;
  const discountValue =
    typeof discountAmount === "number"
      ? String(discountAmount)
      : typeof discountAmount === "string"
        ? discountAmount.trim()
        : "";
  const discountNumber =
    appliesDiscount && discountValue.length > 0 ? Number(discountValue) : 0;
  const hasDiscountInput = appliesDiscount && discountValue.length > 0;
  const discountError =
    appliesDiscount && (!Number.isFinite(discountNumber) || discountNumber < 0)
      ? transactionDiscountErrors.invalid
      : appliesDiscount &&
          Number.isFinite(amountNumber) &&
          amountNumber > 0 &&
          Number.isFinite(discountNumber) &&
          discountNumber > 0 &&
          discountNumber >= amountNumber
        ? transactionDiscountErrors.tooHigh
        : undefined;
  const hasValidDiscount = discountError === undefined;
  const canUseNetAmount =
    appliesDiscount &&
    Number.isFinite(amountNumber) &&
    Number.isFinite(discountNumber);
  const netAmount = canUseNetAmount
    ? amountNumber - discountNumber
    : amountNumber;

  return {
    amountNumber,
    discountNumber,
    appliesDiscount,
    hasDiscountInput,
    hasValidDiscount,
    discountError,
    netAmount,
    canUseNetAmount,
  };
};
