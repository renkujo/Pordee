import type { TransactionKind } from "~/lib/db";

export interface QuickEntryParse {
  amount: number | null;
  kind: TransactionKind;
  title: string;
  /**
   * Canonical name of the inferred default category (e.g. "อาหาร"), or null.
   * The UI resolves this to the user's actual category id by name, since
   * categories are seeded per-user with non-deterministic ids.
   */
  categoryName: string | null;
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

// `name` matches the per-user default category names seeded by the repo,
// so the UI can resolve the inferred category by name regardless of its id.
const INCOME_CATEGORY_NAMES = ["เงินเดือน", "งานเสริม"] as const;

const CATEGORY_RULES: { name: string; keywords: string[] }[] = [
  {
    name: "อาหาร",
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
    name: "เดินทาง",
    keywords: ["รถ", "แท็กซี่", "วิน", "bts", "mrt", "น้ำมัน", "grab", "ค่ารถ"],
  },
  {
    name: "บิล",
    keywords: ["บิล", "ค่าน้ำ", "ค่าไฟ", "ค่าเน็ต", "ค่าโทรศัพท์", "ผ่อน"],
  },
  {
    name: "เงินเดือน",
    keywords: ["เงินเดือน", "ค่าจ้าง"],
  },
  {
    name: "งานเสริม",
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

  const categoryName = inferCategory(lowered, kind);

  return {
    amount: amount !== null && Number.isFinite(amount) ? amount : null,
    kind,
    title,
    categoryName,
  };
}

function inferCategory(lowered: string, kind: TransactionKind): string | null {
  for (const rule of CATEGORY_RULES) {
    const isIncomeRule = INCOME_CATEGORY_NAMES.includes(
      rule.name as (typeof INCOME_CATEGORY_NAMES)[number]
    );
    if (kind === "expense" && isIncomeRule) continue;
    if (kind === "income" && !isIncomeRule) continue;
    if (rule.keywords.some((kw) => lowered.includes(kw.toLowerCase()))) {
      return rule.name;
    }
  }
  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
