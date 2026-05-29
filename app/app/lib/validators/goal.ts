import { z } from "zod";

export const createGoalSchema = z.object({
  name: z.string().trim().min(1, "ตั้งชื่อเป้าหมาย").max(120),
  target: z.coerce.number().positive("เป้าหมายต้องมากกว่า 0"),
});

export const addContributionSchema = z.object({
  goalId: z.string().min(1),
  amount: z.coerce.number().positive(),
  note: z.string().trim().max(500).nullable().default(null),
  occurredAt: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type AddContributionInput = z.infer<typeof addContributionSchema>;
