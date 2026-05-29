import type { TransactionKind } from "~/lib/db";

export interface QuickEntryParse {
  amount: number | null;
  kind: TransactionKind;
  title: string;
  categoryId: string | null;
}

const INCOME_KEYWORDS = [
  "เงินเดือน",
  "รายรับ",
  "ได้รับ",
  "โบนัส",
  "งานเสริม",
  "ฟรีแลนซ์",
  "ค่าจ้าง",
];

const CATEGORY_RULES: { id: string; keywords: string[] }[] = [
  {
    id: "cat-food",
    keywords: [
      "ข้าว",
      "กาแฟ",
      "ชา",
      "นม",
      "อาหาร",
      "ขนม",
      "ก๋วยเตี๋ยว",
      "ส้มตำ",
      "พิซซ่า",
    ],
  },
  {
    id: "cat-transport",
    keywords: ["รถ", "แท็กซี่", "วิน", "bts", "mrt", "น้ำมัน", "grab", "ค่ารถ"],
  },
  {
    id: "cat-bills",
    keywords: ["บิล", "ค่าน้ำ", "ค่าไฟ", "ค่าเน็ต", "ค่าโทรศัพท์", "ผ่อน"],
  },
  {
    id: "cat-salary",
    keywords: ["เงินเดือน", "ค่าจ้าง"],
  },
  {
    id: "cat-side",
    keywords: ["งานเสริม", "ฟรีแลนซ์", "โบนัส"],
  },
];

const AMOUNT_PATTERN = /-?\d+(?:[.,]\d+)?/g;

export function parseQuickEntry(input: string): QuickEntryParse {
  const raw = input.trim();
  const matches = raw.match(AMOUNT_PATTERN);
  const lastNumber = matches?.[matches.length - 1] ?? null;
  const amount = lastNumber
    ? Number.parseFloat(lastNumber.replace(",", ""))
    : null;

  const lowered = raw.toLowerCase();
  const kind: TransactionKind = INCOME_KEYWORDS.some((kw) =>
    lowered.includes(kw.toLowerCase())
  )
    ? "income"
    : "expense";

  const titleWithoutAmount = lastNumber
    ? raw.replace(new RegExp(`${escapeRegExp(lastNumber)}\\s*$`), "").trim()
    : raw;
  const title = titleWithoutAmount.length > 0 ? titleWithoutAmount : raw;

  const categoryId = inferCategory(lowered, kind);

  return {
    amount: amount !== null && Number.isFinite(amount) ? amount : null,
    kind,
    title,
    categoryId,
  };
}

function inferCategory(lowered: string, kind: TransactionKind): string | null {
  for (const rule of CATEGORY_RULES) {
    if (
      kind === "expense" &&
      (rule.id === "cat-salary" || rule.id === "cat-side")
    ) {
      continue;
    }
    if (
      kind === "income" &&
      rule.id !== "cat-salary" &&
      rule.id !== "cat-side"
    ) {
      continue;
    }
    if (rule.keywords.some((kw) => lowered.includes(kw.toLowerCase()))) {
      return rule.id;
    }
  }
  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
