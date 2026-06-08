import type { TransactionKind } from "./types";

export const CATEGORY_ICON_IDS = [
  "utensils",
  "bus",
  "receipt",
  "banknote",
  "briefcase",
  "home",
  "shopping-bag",
  "heart",
  "graduation-cap",
  "plane",
  "gift",
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
  if (normalized.includes("เดินทาง")) return "bus";
  if (normalized.includes("บิล")) return "receipt";
  if (normalized.includes("เงินเดือน")) return "banknote";
  if (normalized.includes("งานเสริม")) return "briefcase";

  return kind === "income" ? "banknote" : DEFAULT_CATEGORY_ICON_ID;
};
