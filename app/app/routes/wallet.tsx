import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/wallet";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { repo } from "~/lib/db";
import { requireUser } from "~/lib/auth.server";
import { getMonthRange } from "~/lib/date/month-range";
import { fmtBaht } from "~/lib/format/baht";
import { getSharePercent } from "~/lib/format/progress";
import { cn } from "~/lib/cn";
import { usePordeeLocale, usePordeeTranslation } from "~/lib/i18n/provider";

export const meta = (_: Route.MetaArgs) => {
  return [
    { title: "พอดี — กระเป๋า" },
    {
      name: "description",
      content: "แยกเงินเป็นกระเป๋าย่อย เพื่อดูเงินที่ยังใช้ได้ง่ายขึ้น",
    },
  ];
};

type PocketStatus = "empty" | "low" | "normal" | "over";

interface PocketCta {
  to: string;
  labelKey: string;
}

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await requireUser(request);
  const now = new Date();
  const { from, to } = getMonthRange(now);
  const [allTx, monthTx, categories, goals] = await Promise.all([
    repo.listTransactions(user.id),
    repo.listTransactions(user.id, { from, to }),
    repo.listCategories(user.id),
    repo.listGoals(user.id),
  ]);

  let totalIncome = 0;
  let totalExpense = 0;
  let monthIncome = 0;
  let monthExpense = 0;
  const monthExpenseByCategory = new Map<string, number>();

  for (const transaction of allTx) {
    if (transaction.kind === "income") {
      totalIncome += transaction.amount;
    } else {
      totalExpense += transaction.amount;
    }
  }

  for (const transaction of monthTx) {
    if (transaction.kind === "income") {
      monthIncome += transaction.amount;
      continue;
    }

    monthExpense += transaction.amount;
    const categoryId = transaction.categoryId ?? "uncategorized";
    monthExpenseByCategory.set(
      categoryId,
      (monthExpenseByCategory.get(categoryId) ?? 0) + transaction.amount
    );
  }

  const reserved = goals.reduce((sum, goal) => sum + goal.saved, 0);
  const reserveTarget = goals.reduce((sum, goal) => sum + goal.target, 0);
  const available = totalIncome - totalExpense - reserved;

  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft = Math.max(1, monthEnd.getDate() - now.getDate() + 1);
  const dailySafe = available > 0 ? Math.floor(available / daysLeft) : 0;

  const foodSpent = getCategorySpend({
    categories,
    expenseByCategory: monthExpenseByCategory,
    names: ["อาหาร"],
  });
  const travelSpent = getCategorySpend({
    categories,
    expenseByCategory: monthExpenseByCategory,
    names: ["เดินทาง"],
  });
  const billsSpent = getCategorySpend({
    categories,
    expenseByCategory: monthExpenseByCategory,
    names: ["บิล"],
  });

  const travelTarget = getPocketTarget(monthIncome * 0.12, travelSpent);
  const billsTarget = getPocketTarget(monthIncome * 0.22, billsSpent);
  const travelRemaining = Math.max(0, travelTarget - travelSpent);
  const billsRemaining = Math.max(0, billsTarget - billsSpent);
  const dailyRemaining = Math.max(
    0,
    available - travelRemaining - billsRemaining
  );
  const dailyTarget = getPocketTarget(
    dailyRemaining + foodSpent,
    foodSpent,
    available
  );
  const finalReserveTarget =
    reserveTarget > 0 ? reserveTarget : getPocketTarget(reserved, 0);

  const pockets = [
    {
      id: "daily",
      titleKey: "wallet.pocket.daily.title",
      descriptionKey: "wallet.pocket.daily.description",
      amount: dailyRemaining,
      target: dailyTarget,
      spent: foodSpent,
      spentLabelKey: "wallet.pocket.daily.spentLabel",
      cta: { to: "/add", labelKey: "wallet.pocket.daily.cta" },
      mascot: "/brand/mascots/happy.png",
      surfaceClass: "bg-teal/10",
      amountClass: "text-teal",
      barClass: "bg-teal",
    },
    {
      id: "travel",
      titleKey: "wallet.pocket.travel.title",
      descriptionKey: "wallet.pocket.travel.description",
      amount: travelRemaining,
      target: travelTarget,
      spent: travelSpent,
      spentLabelKey: "wallet.pocket.travel.spentLabel",
      cta: { to: "/history", labelKey: "wallet.pocket.travel.cta" },
      mascot: "/brand/mascots/normal.png",
      surfaceClass: "bg-lime/25",
      amountClass: "text-ink",
      barClass: "bg-lime-strong",
    },
    {
      id: "bills",
      titleKey: "wallet.pocket.bills.title",
      descriptionKey: "wallet.pocket.bills.description",
      amount: billsRemaining,
      target: billsTarget,
      spent: billsSpent,
      spentLabelKey: "wallet.pocket.bills.spentLabel",
      cta: { to: "/history", labelKey: "wallet.pocket.bills.cta" },
      mascot: "/brand/mascots/thinking.png",
      surfaceClass: "bg-coral/10",
      amountClass: "text-coral",
      barClass: "bg-coral",
    },
    {
      id: "reserve",
      titleKey: "wallet.pocket.reserve.title",
      descriptionKey: "wallet.pocket.reserve.description",
      amount: reserved,
      target: finalReserveTarget,
      spent: 0,
      spentLabelKey: "wallet.pocket.reserve.spentLabel",
      cta: { to: "/goals", labelKey: "wallet.pocket.reserve.cta" },
      mascot: "/brand/mascots/saving.png",
      surfaceClass: "bg-line/35",
      amountClass: "text-teal",
      barClass: "bg-teal/70",
    },
  ];

  const categoryNameById = Object.fromEntries(
    categories.map((category) => [category.id, category.name])
  );
  const spendBreakdown = Array.from(monthExpenseByCategory.entries())
    .map(([categoryId, amount]) => ({
      categoryId,
      name:
        categoryId === "uncategorized"
          ? null
          : (categoryNameById[categoryId] ?? null),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    monthLabel: now.toLocaleDateString("th-TH", {
      month: "long",
      year: "numeric",
    }),
    monthDate: now.toISOString(),
    summary: {
      monthIncome,
      monthExpense,
      reserved,
      available,
      dailySafe,
      daysLeft,
    },
    separatedTotal: pockets.reduce((sum, pocket) => sum + pocket.amount, 0),
    pockets: pockets.map((pocket) => {
      const percent =
        pocket.target > 0
          ? Math.min(100, Math.round((pocket.amount / pocket.target) * 100))
          : 0;
      return {
        ...pocket,
        percent,
        status: getPocketStatus(pocket.amount, pocket.target, pocket.spent),
      } satisfies PocketView;
    }),
    spendBreakdown,
    monthExpense,
    hasAnyData: allTx.length > 0 || goals.length > 0,
    hasMonthData: monthTx.length > 0,
  };
};

interface PocketView {
  id: string;
  titleKey: string;
  descriptionKey: string;
  amount: number;
  target: number;
  spent: number;
  spentLabelKey: string;
  cta: PocketCta;
  percent: number;
  status: PocketStatus;
  mascot: string;
  surfaceClass: string;
  amountClass: string;
  barClass: string;
}

const Wallet = () => {
  const {
    monthDate,
    summary,
    separatedTotal,
    pockets,
    spendBreakdown,
    monthExpense,
    hasAnyData,
    hasMonthData,
  } = useLoaderData<typeof loader>();
  const { locale } = usePordeeLocale();
  const t = usePordeeTranslation();
  const monthLabel = new Intl.DateTimeFormat(
    locale === "th" ? "th-TH" : "en-US",
    {
      month: "long",
      year: "numeric",
    }
  ).format(new Date(monthDate));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 lg:gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-muted text-sm">
          {t("wallet.header.kicker", { month: monthLabel })}
        </p>
        <h1 className="text-ink text-3xl font-semibold tracking-tight">
          {t("wallet.title")}
        </h1>
        <p className="text-muted max-w-2xl text-sm leading-6">
          {t("wallet.description")}
        </p>
      </header>

      <section
        aria-label={t("wallet.summary.ariaLabel")}
        className="border-line bg-surface overflow-hidden rounded-lg border"
      >
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="bg-teal/10 flex flex-col gap-4 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-ink text-sm font-semibold">
                  {t("wallet.summary.available")}
                </p>
                <p
                  className={cn(
                    "mt-2 text-4xl font-semibold tracking-tight sm:text-5xl",
                    summary.available < 0 ? "text-coral" : "text-teal"
                  )}
                  data-testid="available"
                >
                  {fmtBaht(summary.available)}
                </p>
                <p className="text-muted mt-2 text-sm">
                  {t("wallet.summary.availableDescription")}
                </p>
              </div>
              <Button asChild className="w-full sm:w-auto" variant="teal">
                <Link to="/add">
                  <Plus className="h-4 w-4" />
                  {t("shell.addTransaction")}
                </Link>
              </Button>
            </div>

            <div className="border-line bg-surface rounded-md border p-3 sm:p-4">
              <p className="text-ink text-sm font-semibold">
                {getDailySafeTitle(summary.available, summary.daysLeft, t)}
              </p>
              <p className="text-muted mt-1 text-sm leading-6">
                {getDailySafeCopy(summary, t)}
              </p>
            </div>
          </div>

          <div className="border-line grid grid-cols-2 gap-0 border-t lg:border-t-0 lg:border-l">
            <SummaryTile
              label={t("wallet.summary.monthIncome")}
              value={fmtBaht(summary.monthIncome)}
              tone="teal"
            />
            <SummaryTile
              label={t("wallet.summary.monthExpense")}
              value={fmtBaht(summary.monthExpense)}
              tone="coral"
            />
            <SummaryTile
              label={t("wallet.summary.reserved")}
              value={fmtBaht(summary.reserved)}
            />
            <SummaryTile
              label={t("wallet.summary.separated")}
              value={fmtBaht(separatedTotal)}
            />
          </div>
        </div>
      </section>

      <section
        aria-label={t("wallet.pockets.ariaLabel")}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {pockets.map((pocket) => (
          <PocketCard key={pocket.id} pocket={pocket} />
        ))}
      </section>

      {hasAnyData ? (
        <SpendBreakdown
          rows={spendBreakdown}
          totalExpense={monthExpense}
          hasMonthData={hasMonthData}
        />
      ) : (
        <section className="border-line bg-surface rounded-lg border p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <img
                alt=""
                className="h-16 w-16 shrink-0 object-contain"
                loading="lazy"
                src="/brand/mascots/normal.png"
              />
              <div>
                <h2 className="text-ink text-base font-semibold">
                  {t("wallet.empty.title")}
                </h2>
                <p className="text-muted mt-1 max-w-2xl text-sm leading-6">
                  {t("wallet.empty.description")}
                </p>
              </div>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <Link to="/add">
                {t("shell.addTransaction")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
};

export default Wallet;

const SummaryTile = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "teal" | "coral";
}) => {
  return (
    <div className="border-line flex min-h-24 flex-col justify-between border-r border-b p-4 even:border-r-0 sm:p-5">
      <p className="text-muted text-xs">{label}</p>
      <p
        className={cn(
          "mt-2 text-lg font-semibold tabular-nums",
          tone === "teal" && "text-teal",
          tone === "coral" && "text-coral",
          !tone && "text-ink"
        )}
      >
        {value}
      </p>
    </div>
  );
};

const statusMeta: Record<PocketStatus, { label: string; toneClass: string }> = {
  empty: { label: "wallet.status.empty", toneClass: "bg-sky text-muted" },
  low: { label: "wallet.status.low", toneClass: "bg-coral/10 text-coral" },
  over: { label: "wallet.status.over", toneClass: "bg-coral/10 text-coral" },
  normal: { label: "wallet.status.normal", toneClass: "bg-teal/10 text-teal" },
};

const PocketCard = ({ pocket }: { pocket: PocketView }) => {
  const status = statusMeta[pocket.status];
  const t = usePordeeTranslation();

  return (
    <article className="border-line bg-surface flex flex-col overflow-hidden rounded-lg border">
      <div
        className={cn(
          "flex h-28 items-center justify-center sm:h-32",
          pocket.surfaceClass
        )}
      >
        <img
          alt=""
          className="h-20 w-20 object-contain sm:h-24 sm:w-24"
          loading="lazy"
          src={pocket.mascot}
        />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-ink text-base font-semibold">
            {t(pocket.titleKey)}
          </h2>
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              status.toneClass
            )}
          >
            {t(status.label)}
          </span>
        </div>
        <p className="text-muted mt-1 text-sm leading-6">
          {t(pocket.descriptionKey)}
        </p>

        <div className="mt-auto pt-5">
          <p className="text-muted text-sm font-semibold">
            {t("wallet.pocket.available")}
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-semibold tracking-tight",
              pocket.amountClass
            )}
          >
            {fmtBaht(pocket.amount)}
          </p>
          <div className="bg-line/70 mt-2 h-2 overflow-hidden rounded-xs">
            <div
              className={cn("h-full rounded-xs", pocket.barClass)}
              style={{ width: `${pocket.percent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs">
            <span className="text-muted">
              {t("wallet.pocket.fromTarget", {
                amount: fmtBaht(pocket.target),
              })}
            </span>
            <span className={cn("font-semibold", pocket.amountClass)}>
              {pocket.percent}%
            </span>
          </div>
          {pocket.spent > 0 ? (
            <p className="text-muted mt-2 text-xs">
              {t(pocket.spentLabelKey, { amount: fmtBaht(pocket.spent) })}
            </p>
          ) : null}

          <Button
            asChild
            variant="secondary"
            size="sm"
            className="mt-4 w-full justify-between"
          >
            <Link to={pocket.cta.to}>
              {t(pocket.cta.labelKey)}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
};

const SpendBreakdown = ({
  rows,
  totalExpense,
  hasMonthData,
}: {
  rows: Awaited<ReturnType<typeof loader>>["spendBreakdown"];
  totalExpense: number;
  hasMonthData: boolean;
}) => {
  const t = usePordeeTranslation();

  return (
    <section
      aria-label={t("wallet.breakdown.ariaLabel")}
      className="border-line bg-surface rounded-lg border"
    >
      <div className="border-line flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-ink text-base font-semibold">
            {t("wallet.breakdown.title")}
          </h2>
          <p className="text-muted text-sm">
            {t("wallet.breakdown.description")}
          </p>
        </div>
        <Link to="/history" className="text-muted hover:text-ink text-xs">
          {t("wallet.breakdown.openHistory")}
        </Link>
      </div>

      <div className="p-4 sm:p-5">
        {rows.length === 0 ? (
          <div className="border-line bg-sky/45 flex items-center gap-4 rounded-md border p-4">
            <img
              alt=""
              className="h-12 w-12 shrink-0 object-contain"
              loading="lazy"
              src="/brand/mascots/thinking.png"
            />
            <div>
              <p className="text-ink text-sm font-semibold">
                {hasMonthData
                  ? t("wallet.breakdown.emptyExpense")
                  : t("wallet.breakdown.emptyMonth")}
              </p>
              <p className="text-muted mt-1 text-sm leading-6">
                {t("wallet.breakdown.emptyDescription")}
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((row) => {
              const pct = getSharePercent(row.amount, totalExpense);
              const rowName = row.name ?? t("transaction.noCategory.long");
              return (
                <li key={row.categoryId}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-ink font-medium">{rowName}</span>
                    <span className="text-muted shrink-0 text-xs tabular-nums">
                      {fmtBaht(row.amount)}
                      <span className="block text-right text-[11px]">
                        {t("wallet.breakdown.share", { pct })}
                      </span>
                    </span>
                  </div>
                  <div
                    aria-label={t("wallet.breakdown.shareAriaLabel", {
                      name: rowName,
                      pct,
                    })}
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={pct}
                    className="bg-line mt-2 h-2 w-full overflow-hidden rounded-full"
                    role="progressbar"
                  >
                    <div
                      className="bg-coral h-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};

const getCategorySpend = ({
  categories,
  expenseByCategory,
  names,
}: {
  categories: Array<{ id: string; name: string }>;
  expenseByCategory: Map<string, number>;
  names: string[];
}) => {
  const categoryIds = categories
    .filter((category) => names.some((name) => category.name.includes(name)))
    .map((category) => category.id);

  return categoryIds.reduce(
    (sum, categoryId) => sum + (expenseByCategory.get(categoryId) ?? 0),
    0
  );
};

const getPocketTarget = (
  preferred: number,
  spent: number,
  available = 0
): number => {
  return roundToHundred(Math.max(preferred, spent, available, 0));
};

const roundToHundred = (amount: number): number => {
  if (amount <= 0) return 0;
  return Math.ceil(amount / 100) * 100;
};

const getPocketStatus = (
  amount: number,
  target: number,
  spent: number
): PocketStatus => {
  if (target <= 0) return "empty";
  if (spent > target) return "over";
  if (amount / target <= 0.15) return "low";
  return "normal";
};

const getDailySafeTitle = (
  available: number,
  daysLeft: number,
  t: ReturnType<typeof usePordeeTranslation>
) => {
  if (available < 0) return t("wallet.dailySafe.overTitle");
  return t("wallet.dailySafe.daysLeftTitle", { daysLeft });
};

const getDailySafeCopy = (
  summary: Awaited<ReturnType<typeof loader>>["summary"],
  t: ReturnType<typeof usePordeeTranslation>
) => {
  if (summary.monthIncome === 0 && summary.monthExpense === 0) {
    return t("wallet.dailySafe.noDataCopy");
  }
  if (summary.available < 0) {
    return t("wallet.dailySafe.overCopy");
  }
  return t("wallet.dailySafe.normalCopy", {
    amount: fmtBaht(summary.dailySafe),
  });
};
