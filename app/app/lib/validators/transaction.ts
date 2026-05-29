import { z } from "zod";

export const transactionKindSchema = z.enum(["expense", "income"]);

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
