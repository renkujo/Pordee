import { z } from "zod";

export const walletPocketTypeSchema = z.enum([
  "daily",
  "travel",
  "bills",
  "reserve",
  "custom",
]);

export const walletPocketMascotSchema = z.enum([
  "happy",
  "normal",
  "thinking",
  "saving",
]);

export const walletPocketSurfaceSchema = z.enum([
  "teal",
  "lime",
  "coral",
  "sky",
  "neutral",
]);

export const walletRolloverRuleSchema = z.enum([
  "keep",
  "reset",
  "move_to_reserve",
]);

const categoryIdsSchema = z.preprocess(
  (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value.trim().length > 0) return [value];
    return [];
  },
  z.array(z.string().trim().min(1)).default([])
);

export const walletPocketInputSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1, "ตั้งชื่อกระเป๋า").max(80),
  description: z.string().trim().max(180).default(""),
  type: walletPocketTypeSchema.default("custom"),
  monthlyLimit: z.coerce.number().min(0, "วงเงินต้องไม่ติดลบ").default(0),
  mascot: walletPocketMascotSchema.default("normal"),
  surface: walletPocketSurfaceSchema.default("sky"),
  rolloverRule: walletRolloverRuleSchema.default("keep"),
  categoryIds: categoryIdsSchema,
});

export const walletAllocationSchema = z.object({
  monthKey: z.string().regex(/^\d{4}-\d{2}$/),
  allocations: z.array(
    z.object({
      pocketId: z.string().trim().min(1),
      amount: z.coerce.number().min(0),
    })
  ),
});

export const walletTransferSchema = z
  .object({
    fromPocketId: z.string().trim().min(1).nullable().default(null),
    toPocketId: z.string().trim().min(1).nullable().default(null),
    amount: z.coerce.number().positive("จำนวนเงินต้องมากกว่า 0"),
    note: z.string().trim().max(160).nullable().default(null),
    occurredAt: z
      .string()
      .datetime()
      .default(() => new Date().toISOString()),
  })
  .refine((value) => value.fromPocketId || value.toPocketId, {
    message: "เลือกกระเป๋าที่ต้องการย้ายเงิน",
    path: ["toPocketId"],
  })
  .refine((value) => value.fromPocketId !== value.toPocketId, {
    message: "เลือกกระเป๋าต้นทางและปลายทางให้ต่างกัน",
    path: ["toPocketId"],
  });

export const archiveWalletPocketSchema = z.object({
  id: z.string().trim().min(1),
});

export const reorderWalletPocketsSchema = z.object({
  pocketIds: z.array(z.string().trim().min(1)).min(1),
});

export type WalletPocketInput = z.infer<typeof walletPocketInputSchema>;
export type WalletAllocationInput = z.infer<typeof walletAllocationSchema>;
export type WalletTransferInput = z.infer<typeof walletTransferSchema>;
