import type { TransactionKind } from "./types";

export const CATEGORY_ICON_IDS = [
  "utensils",
  "bus",
  "receipt",
  "coffee",
  "banknote",
  "briefcase",
  "home",
  "car",
  "fuel",
  "smartphone",
  "wifi",
  "shopping-bag",
  "shirt",
  "heart",
  "dumbbell",
  "graduation-cap",
  "book-open",
  "plane",
  "gift",
  "piggy-bank",
  "landmark",
  "credit-card",
  "gamepad",
  "tags",
] as const;

export type CategoryIconId = (typeof CATEGORY_ICON_IDS)[number];

export const DEFAULT_CATEGORY_ICON_ID: CategoryIconId = "tags";

export const isCategoryIconId = (value: unknown): value is CategoryIconId => {
  return (
    typeof value === "string" &&
    CATEGORY_ICON_IDS.includes(value as CategoryIconId)
  );
};

export const getDefaultCategoryIconId = ({
  kind,
  name,
}: {
  kind: TransactionKind;
  name: string;
}): CategoryIconId => {
  const normalized = name.trim().toLocaleLowerCase("th-TH");

  if (normalized.includes("อาหาร")) return "utensils";
  if (normalized.includes("กาแฟ")) return "coffee";
  if (normalized.includes("เดินทาง")) return "bus";
  if (normalized.includes("รถ")) return "car";
  if (normalized.includes("น้ำมัน")) return "fuel";
  if (normalized.includes("บิล")) return "receipt";
  if (normalized.includes("มือถือ") || normalized.includes("โทร")) {
    return "smartphone";
  }
  if (normalized.includes("เน็ต") || normalized.includes("อินเทอร์เน็ต")) {
    return "wifi";
  }
  if (normalized.includes("เสื้อ")) return "shirt";
  if (normalized.includes("สุขภาพ") || normalized.includes("ฟิตเนส")) {
    return "dumbbell";
  }
  if (normalized.includes("หนังสือ")) return "book-open";
  if (normalized.includes("บัตร")) return "credit-card";
  if (normalized.includes("ออม")) return "piggy-bank";
  if (normalized.includes("ธนาคาร")) return "landmark";
  if (normalized.includes("เงินเดือน")) return "banknote";
  if (normalized.includes("งานเสริม")) return "briefcase";

  return kind === "income" ? "banknote" : DEFAULT_CATEGORY_ICON_ID;
};
