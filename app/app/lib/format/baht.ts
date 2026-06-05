const baseFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const preciseFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export interface BahtFormatOptions {
  precise?: boolean;
}

export function fmtBaht(amount: number, opts: BahtFormatOptions = {}): string {
  if (!Number.isFinite(amount)) return "—";
  return opts.precise
    ? preciseFormatter.format(amount)
    : baseFormatter.format(amount);
}

export function fmtSignedBaht(
  amount: number,
  kind: "income" | "expense",
  opts: BahtFormatOptions = {}
): string {
  const sign = kind === "income" ? "+" : "-";
  return `${sign}${fmtBaht(Math.abs(amount), opts)}`;
}
