import { z } from "zod";

export const transactionKindSchema = z.enum(["expense", "income"]);

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
