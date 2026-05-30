import { z } from "zod";
import { transactionKindSchema } from "./transaction";

const categoryNameSchema = z.string().trim().min(1, "กรอกชื่อหมวด").max(40);

export const createCategorySchema = z.object({
  name: categoryNameSchema,
  kind: transactionKindSchema,
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  id: z.string().trim().min(1, "ไม่พบหมวด"),
  name: categoryNameSchema,
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const deleteCategorySchema = z.object({
  id: z.string().trim().min(1, "ไม่พบหมวด"),
});
