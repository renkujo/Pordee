import { Link, useLoaderData, useSearchParams } from "react-router";
import type { ReactNode } from "react";
import type { Route } from "./+types/dashboard";
import { Plus, RotateCcw, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { MonthPicker } from "~/components/ui/date-picker";
import { repo } from "~/lib/db";
import { requireUser } from "~/lib/auth.server";
import { fmtBaht, fmtSignedBaht } from "~/lib/format/baht";
import { getSharePercent } from "~/lib/format/progress";
import {
  dayValueToEndIso,
  dayValueToStartIso,
  parseDayValue,
  todayDayValue,
} from "~/lib/date/day-value";
import { cn } from "~/lib/cn";
import { usePordeeLocale, usePordeeTranslation } from "~/lib/i18n/provider";

export const meta = (_: Route.MetaArgs) => {
  return [
    { title: "พอดี — หน้าหลัก" },
    { name: "description", content: "เงินพอดี ชีวิตเบาขึ้น" },
  ];
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await requireUser(request);
  await repo.processDueRecurring(user.id);
  const url = new URL(request.url);
  const selectedDay = parseDayValue(url.searchParams.get("date"));
  const today = new Date();
  const now =
    selectedDay && selectedDay <= today ? selectedDay : new Date(today);
  const range = getDashboardDateRange({
    monthDate: now,
    today,
  });
  const [monthTx, categories, goals] = await Promise.all([
    repo.listTransactions(user.id, { from: range.fromIso, to: range.toIso }),
    repo.listCategories(user.id),
    repo.listGoals(user.id),
  ]);

  let income = 0;
  let expense = 0;
  const expenseByCategory = new Map<string, number>();

  for (const t of monthTx) {
    if (t.kind === "income") {
      income += t.amount;
    } else {
      expense += t.amount;
      const categoryKey = t.categoryId ?? "uncategorized";
      expenseByCategory.set(
        categoryKey,
        (expenseByCategory.get(categoryKey) ?? 0) + t.amount
      );
    }
  }

  const categoryNameById = Object.fromEntries(
    categories.map((c) => [c.id, c.name])
  );

  const categorySpend = Array.from(expenseByCategory.entries())
    .map(([categoryId, amount]) => ({
      categoryId,
      name:
        categoryId === "uncategorized"
          ? null
          : (categoryNameById[categoryId] ?? null),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);
  const isCurrentMonth =
    now.getFullYear() === today.getFullYear() &&
    now.getMonth() === today.getMonth();
  const currentMonthEnd = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  );
  const daysLeft = isCurrentMonth
    ? Math.max(1, currentMonthEnd.getDate() - today.getDate() + 1)
    : 0;
  const balance = income - expense;

  return {
    monthLabel: now.toLocaleDateString("th-TH", {
      month: "long",
      year: "numeric",
    }),
    monthDate: now.toISOString(),
    selectedDay: todayDayValue(now),
    range,
    isCurrentMonth,
    income,
    expense,
    balance,
    daysLeft,
    dailySafe:
      isCurrentMonth && daysLeft > 0 && income > 0
        ? Math.floor(balance / daysLeft)
        : null,
    recent: monthTx.slice(0, 5),
    goals: goals.slice(0, 3),
    categoryNameById,
    categorySpend,
  };
};

const rangeLabelFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
});

type Translate = ReturnType<typeof usePordeeTranslation>;

interface DashboardDateRange {
  fromDay: string;
  toDay: string;
  monthStartDay: string;
  monthEndDay: string;
  fromIso: string;
  toIso: string;
  label: string;
}

const getDashboardDateRange = ({
  monthDate,
  today = new Date(),
}: {
  monthDate: Date;
  today?: Date;
}): DashboardDateRange => {
  const activeMonth = monthDate > today ? today : monthDate;
  const monthStart = new Date(
    activeMonth.getFullYear(),
    activeMonth.getMonth(),
    1
  );
  const calendarMonthEnd = new Date(
    activeMonth.getFullYear(),
    activeMonth.getMonth() + 1,
    0
  );
  const monthEnd = isSameMonth(activeMonth, today)
    ? minDate(calendarMonthEnd, today)
    : calendarMonthEnd;
  const fromDate = monthStart;
  const toDate = monthEnd;

  const fromDay = todayDayValue(fromDate);
  const toDay = todayDayValue(toDate);
  const fromIso = dayValueToStartIso(fromDay);
  const toIso = dayValueToEndIso(toDay);

  if (!fromIso || !toIso) {
    throw new Error("Invalid dashboard date range");
  }

  return {
    fromDay,
    toDay,
    monthStartDay: todayDayValue(monthStart),
    monthEndDay: todayDayValue(monthEnd),
    fromIso,
    toIso,
    label:
      fromDay === toDay
        ? rangeLabelFormatter.format(fromDate)
        : `${rangeLabelFormatter.format(fromDate)} - ${rangeLabelFormatter.format(toDate)}`,
  };
};

const isSameMonth = (a: Date, b: Date) => {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
};

const minDate = (a: Date, b: Date) => {
  return a < b ? a : b;
};

const getMonthRangeFromMonthValue = (monthValue: string) => {
  const fallbackToday = todayDayValue();
  const fallbackMonth = fallbackToday.slice(0, 7);
  const match = /^(\d{4})-(\d{2})$/.exec(monthValue);
  if (!match) {
    return { from: `${fallbackMonth}-01`, to: fallbackToday };
  }

  const [, year, month] = match;
  const monthNumber = Number(month);
  if (monthNumber < 1 || monthNumber > 12) {
    return { from: `${fallbackMonth}-01`, to: fallbackToday };
  }

  const start = new Date(Number(year), monthNumber - 1, 1);
  const end = new Date(Number(year), monthNumber, 0);
  const from = todayDayValue(start);
  const calendarTo = todayDayValue(end);

  if (from > fallbackToday) {
    return { from: `${fallbackMonth}-01`, to: fallbackToday };
  }

  return {
    from,
    to: calendarTo > fallbackToday ? fallbackToday : calendarTo,
  };
};

const Dashboard = () => {
  const {
    monthDate,
    range,
    isCurrentMonth,
    income,
    expense,
    balance,
    daysLeft,
    dailySafe,
    recent,
    goals,
    categoryNameById,
    categorySpend,
  } = useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();
  const { locale } = usePordeeLocale();
  const t = usePordeeTranslation();

  const hasAnyData = income > 0 || expense > 0;
  const selectedMonth = range.monthStartDay.slice(0, 7);
  const dateLocale = locale === "th" ? "th-TH" : "en-US";
  const monthLabel = new Intl.DateTimeFormat(dateLocale, {
    month: "long",
    year: "numeric",
  }).format(new Date(monthDate));
  const localizedRangeLabel = formatRangeLabel(
    range.fromDay,
    range.toDay,
    dateLocale
  );
  const resetRange = () => {
    const currentMonth = getMonthRangeFromMonthValue(
      todayDayValue().slice(0, 7)
    );
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("date", currentMonth.from);
        next.set("from", currentMonth.from);
        next.set("to", currentMonth.to);
        return next;
      },
      { preventScrollReset: true }
    );
  };

  const handleMonthChange = (monthValue: string) => {
    const monthRange = getMonthRangeFromMonthValue(monthValue);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("date", monthRange.from);
        next.set("from", monthRange.from);
        next.set("to", monthRange.to);
        return next;
      },
      { preventScrollReset: true }
    );
  };

  const signalNeedsAttention = income === 0 ? expense > 0 : expense > income;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 lg:gap-5">
      <header className="border-line bg-surface rounded-[14px] border p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted">
                {t("dashboard.header.description")}
              </span>
              <span aria-hidden="true" className="text-line">
                /
              </span>
              <span className="text-muted">{localizedRangeLabel}</span>
              {!isCurrentMonth ? (
                <Badge tone="muted" className="rounded-xs">
                  {t("dashboard.badge.pastMonth")}
                </Badge>
              ) : null}
            </div>
            <h1 className="text-ink mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              {monthLabel}
            </h1>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end lg:w-auto">
            <DashboardDateField
              label={t("dashboard.monthPicker.label")}
              className="min-w-0 sm:w-60"
            >
              <MonthPicker
                value={selectedMonth}
                max={todayDayValue().slice(0, 7)}
                onChange={handleMonthChange}
              />
            </DashboardDateField>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={resetRange}
              disabled={isCurrentMonth}
              className="h-10 shrink-0"
              aria-label={t("dashboard.range.resetAriaLabel")}
            >
              <RotateCcw className="h-4 w-4" />
              {t("filter.thisMonth")}
            </Button>
          </div>
        </div>
      </header>

      <section
        aria-label={t("dashboard.overview.ariaLabel")}
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]"
      >
        <Card className="lg:col-span-1">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Badge tone={getBalanceTone(balance, income)}>
                    {getBalanceLabel(balance, income, t)}
                  </Badge>
                  <p className="text-muted mt-3 text-sm">
                    {isCurrentMonth
                      ? t("dashboard.balance.currentMonth")
                      : t("dashboard.balance.selectedMonth")}
                  </p>
                  <p
                    className="text-ink mt-1 text-3xl font-semibold tracking-tight sm:text-4xl"
                    data-testid="balance"
                  >
                    {fmtBaht(balance)}
                  </p>
                </div>
                <Button asChild className="w-full sm:w-auto">
                  <Link to="/add">
                    <Plus className="h-4 w-4" />
                    {t("shell.addTransaction")}
                  </Link>
                </Button>
              </div>

              <div className="border-line sm:divide-line grid border-t pt-4 sm:grid-cols-3 sm:divide-x">
                <SummaryMetric
                  label={t("transaction.kind.income")}
                  value={fmtBaht(income)}
                  tone="teal"
                  testId="income-badge"
                />
                <SummaryMetric
                  label={t("transaction.kind.expense")}
                  value={fmtBaht(expense)}
                  tone="coral"
                  testId="expense-badge"
                />
                <SummaryMetric
                  label={t("dashboard.metric.dailySafe")}
                  value={formatDailySafe(dailySafe, t)}
                  tone={
                    dailySafe === null
                      ? "neutral"
                      : dailySafe < 0
                        ? "coral"
                        : "teal"
                  }
                />
              </div>

              <p className="text-muted border-line border-t pt-4 text-sm leading-6">
                {isCurrentMonth && daysLeft > 0
                  ? getDailySafeSummary(dailySafe, t)
                  : t("dashboard.monthSummary.copy", {
                      month: monthLabel,
                      balance: fmtBaht(balance),
                      income: fmtBaht(income),
                    })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {t("dashboard.spendRatio.label")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
            {hasAnyData ? (
              <SpendRatio income={income} expense={expense} />
            ) : (
              <p className="text-muted text-sm leading-6">
                {t("dashboard.coach.emptyRatio")}
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <RecentTransactions
          recent={recent}
          categoryNameById={categoryNameById}
        />
        <CategorySpending rows={categorySpend} totalExpense={expense} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {goals.length > 0 ? <GoalsPreview goals={goals} /> : null}
        {signalNeedsAttention ? (
          <SignalCard income={income} expense={expense} />
        ) : null}
      </section>
    </div>
  );
};

export default Dashboard;

const DashboardDateField = ({
  children,
  className,
  helper,
  label,
}: {
  children: ReactNode;
  className?: string;
  helper?: string;
  label: string;
}) => {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="text-muted text-xs">{label}</Label>
      {children}
      {helper ? <p className="text-muted text-xs leading-5">{helper}</p> : null}
    </div>
  );
};

const SummaryMetric = ({
  label,
  value,
  tone,
  testId,
}: {
  label: string;
  value: string;
  tone: "neutral" | "teal" | "coral";
  testId?: string;
}) => {
  return (
    <div
      className={cn(
        "border-line py-3 first:pt-0 last:pb-0 sm:border-b-0 sm:px-4 sm:py-0 sm:first:pl-0 sm:last:pr-0",
        "border-b last:border-b-0"
      )}
    >
      <p className="text-muted text-xs">{label}</p>
      <p
        className={cn(
          "mt-1 text-sm font-semibold sm:text-base",
          tone === "teal" && "text-teal",
          tone === "coral" && "text-coral",
          tone === "neutral" && "text-ink"
        )}
        data-testid={testId}
      >
        {value}
      </p>
    </div>
  );
};

const SpendRatio = ({
  income,
  expense,
}: {
  income: number;
  expense: number;
}) => {
  const t = usePordeeTranslation();
  const pct =
    income > 0 ? Math.min(100, Math.round((expense / income) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">{fmtBaht(expense)}</span>
        <span
          className={cn("font-medium", pct > 90 ? "text-coral" : "text-ink")}
        >
          {income > 0 ? `${pct}%` : t("dashboard.balance.waitIncome")}
        </span>
      </div>
      <div className="bg-line mt-2 h-2 w-full overflow-hidden rounded-full">
        <div
          className={cn("h-full", pct > 90 ? "bg-coral" : "bg-teal")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const RecentTransactions = ({
  className,
  recent,
  categoryNameById,
}: {
  className?: string;
  recent: Awaited<ReturnType<typeof loader>>["recent"];
  categoryNameById: Record<string, string>;
}) => {
  const { locale } = usePordeeLocale();
  const t = usePordeeTranslation();
  const dateFormatter = new Intl.DateTimeFormat(
    locale === "th" ? "th-TH" : "en-US",
    {
      day: "numeric",
      month: "short",
    }
  );

  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{t("dashboard.recent.title")}</CardTitle>
        {recent.length > 0 && (
          <Link to="/history" className="text-muted hover:text-ink text-xs">
            {t("common.viewAll")}
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <div className="border-line flex flex-col gap-3 rounded-sm border border-dashed p-4">
            <div>
              <p className="text-ink text-sm font-medium">
                {t("dashboard.recent.emptyTitle")}
              </p>
              <p className="text-muted mt-1 text-sm leading-6">
                {t("dashboard.recent.emptyDescription")}
              </p>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link to="/add">
                <Plus className="h-4 w-4" />
                {t("dashboard.action.firstTransaction")}
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-line divide-y" data-testid="recent-list">
            {recent.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="text-ink truncate text-sm font-medium">
                    {t.title}
                  </p>
                  <p className="text-muted mt-0.5 text-xs">
                    {dateFormatter.format(new Date(t.occurredAt))}
                    {t.categoryId && categoryNameById[t.categoryId]
                      ? ` · ${categoryNameById[t.categoryId]}`
                      : null}
                  </p>
                </div>
                <Badge
                  tone={t.kind === "income" ? "teal" : "coral"}
                  className="shrink-0 whitespace-nowrap"
                >
                  {fmtSignedBaht(t.amount, t.kind)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

const GoalsPreview = ({
  className,
  goals,
}: {
  className?: string;
  goals: Awaited<ReturnType<typeof loader>>["goals"];
}) => {
  const t = usePordeeTranslation();

  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{t("goals.title")}</CardTitle>
        {goals.length > 0 && (
          <Link to="/goals" className="text-muted hover:text-ink text-xs">
            {t("common.viewAll")}
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <div className="border-line flex flex-col gap-3 rounded-sm border border-dashed p-4">
            <div>
              <p className="text-ink text-sm font-medium">
                {t("dashboard.goals.emptyTitle")}
              </p>
              <p className="text-muted mt-1 text-sm leading-6">
                {t("dashboard.goals.emptyDescription")}
              </p>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link to="/goals">
                <Target className="h-4 w-4" />
                {t("goals.create.submit")}
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-3" data-testid="goal-list">
            {goals.map((g) => {
              const pct =
                g.target > 0
                  ? Math.min(100, Math.round((g.saved / g.target) * 100))
                  : 0;
              return (
                <li key={g.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-ink truncate font-medium">
                      {g.name}
                    </span>
                    <span className="text-muted shrink-0 text-xs">
                      {fmtBaht(g.saved)} / {fmtBaht(g.target)}
                    </span>
                  </div>
                  <div
                    className="bg-line h-1.5 w-full overflow-hidden rounded-full"
                    aria-label={t("goals.progress.ariaLabel", { pct })}
                  >
                    <div
                      className="bg-teal h-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

const CategorySpending = ({
  className,
  rows,
  totalExpense,
}: {
  className?: string;
  rows: Awaited<ReturnType<typeof loader>>["categorySpend"];
  totalExpense: number;
}) => {
  const t = usePordeeTranslation();

  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{t("dashboard.category.title")}</CardTitle>
        <Link to="/history" className="text-muted hover:text-ink text-xs">
          {t("wallet.breakdown.openHistory")}
        </Link>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="border-line rounded-sm border border-dashed p-4">
            <p className="text-ink text-sm font-medium">
              {t("dashboard.category.emptyTitle")}
            </p>
            <p className="text-muted mt-1 text-sm leading-6">
              {t("wallet.breakdown.emptyDescription")}
            </p>
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
                    <span className="text-muted shrink-0 text-right text-xs tabular-nums">
                      {fmtBaht(row.amount)}
                      <span className="block text-[11px]">
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
      </CardContent>
    </Card>
  );
};

const SignalCard = ({
  className,
  income,
  expense,
}: {
  className?: string;
  income: number;
  expense: number;
}) => {
  const t = usePordeeTranslation();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t("dashboard.signal.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border-line rounded-sm border border-dashed p-4">
          <p className="text-ink text-sm font-medium">
            {getDashboardSignalTitle(income, expense, t)}
          </p>
          <p className="text-muted mt-1 text-sm leading-6">
            {getDashboardSignalDescription(income, expense, t)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

const getDashboardSignalTitle = (
  income: number,
  expense: number,
  t: Translate
) => {
  if (income === 0 && expense > 0) return t("dashboard.signal.noIncomeTitle");
  if (income > 0 && expense > income) return t("dashboard.signal.overTitle");
  return t("dashboard.signal.okTitle");
};

const getDashboardSignalDescription = (
  income: number,
  expense: number,
  t: Translate
) => {
  if (income === 0 && expense > 0) {
    return t("dashboard.signal.noIncomeDescription", {
      expense: fmtBaht(expense),
    });
  }
  if (income > 0 && expense > income) {
    return t("dashboard.signal.overDescription", {
      expense: fmtBaht(expense),
      income: fmtBaht(income),
    });
  }
  return t("dashboard.signal.okDescription", {
    expense: fmtBaht(expense),
    income: fmtBaht(income),
  });
};

const getBalanceTone = (
  balance: number,
  income: number
): "neutral" | "teal" | "coral" => {
  if (income === 0) return "neutral";
  if (balance < 0) return "coral";
  return "teal";
};

const getBalanceLabel = (balance: number, income: number, t: Translate) => {
  if (income === 0) return t("dashboard.balance.waitIncome");
  if (balance < 0) return t("dashboard.balance.overIncome");
  return t("dashboard.balance.ok");
};

const formatDailySafe = (dailySafe: number | null, t: Translate) => {
  if (dailySafe === null) return t("dashboard.balance.waitIncome");
  return fmtBaht(dailySafe);
};

const getDailySafeCopy = (dailySafe: number | null, t: Translate) => {
  if (dailySafe === null) {
    return t("dashboard.dailySafe.noIncomeCopy");
  }
  if (dailySafe < 0) {
    return t("dashboard.dailySafe.overCopy");
  }
  return t("dashboard.dailySafe.normalCopy", { amount: fmtBaht(dailySafe) });
};

const getDailySafeSummary = (dailySafe: number | null, t: Translate) => {
  if (dailySafe === null) {
    return `${t("dashboard.dailySafe.noIncomeTitle")} — ${getDailySafeCopy(dailySafe, t)}`;
  }
  return getDailySafeCopy(dailySafe, t);
};

const formatRangeLabel = (fromDay: string, toDay: string, locale: string) => {
  const formatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  });
  const fromDate = parseDayValue(fromDay);
  const toDate = parseDayValue(toDay);
  if (!fromDate || !toDate) return "";
  return fromDay === toDay
    ? formatter.format(fromDate)
    : `${formatter.format(fromDate)} - ${formatter.format(toDate)}`;
};
