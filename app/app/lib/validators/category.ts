import { z } from "zod";
import {
  CATEGORY_ICON_IDS,
  DEFAULT_CATEGORY_ICON_ID,
} from "~/lib/db/category-icons";
import { transactionKindSchema } from "./transaction";

const categoryNameSchema = z.string().trim().min(1, "กรอกชื่อหมวด").max(40);
const categoryIconSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length > 0
      ? value
      : DEFAULT_CATEGORY_ICON_ID,
  z.enum(CATEGORY_ICON_IDS)
);

export const createCategorySchema = z.object({
  name: categoryNameSchema,
  kind: transactionKindSchema,
  icon: categoryIconSchema,
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  id: z.string().trim().min(1, "ไม่พบหมวด"),
  name: categoryNameSchema,
  icon: categoryIconSchema,
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const deleteCategorySchema = z.object({
  id: z.string().trim().min(1, "ไม่พบหมวด"),
});
