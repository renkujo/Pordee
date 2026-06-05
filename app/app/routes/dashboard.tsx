import { Link, useLoaderData, useSearchParams } from "react-router";
import type { ReactNode } from "react";
import type { Route } from "./+types/dashboard";
import {
  ArrowRight,
  CalendarRange,
  ListChecks,
  Plus,
  RotateCcw,
  Target,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { MascotState, MascotTip } from "~/components/brand/mascot-state";
import { MonthPicker } from "~/components/ui/date-picker";
import { repo } from "~/lib/db";
import { requireUser } from "~/lib/auth.server";
import { fmtBaht, fmtSignedBaht } from "~/lib/format/baht";
import {
  dayValueToEndIso,
  dayValueToStartIso,
  parseDayValue,
  todayDayValue,
} from "~/lib/date/day-value";
import { cn } from "~/lib/cn";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "พอดี — หน้าหลัก" },
    { name: "description", content: "เงินพอดี ชีวิตเบาขึ้น" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
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
          ? "ไม่ระบุหมวด"
          : (categoryNameById[categoryId] ?? "ไม่ระบุหมวด"),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);
  const isCurrentMonth =
    now.getFullYear() === today.getFullYear() &&
    now.getMonth() === today.getMonth();
  const todayDay = todayDayValue(today);
  const toDate = parseDayValue(range.toDay) ?? today;
  const daysLeft =
    isCurrentMonth && range.toDay >= todayDay
      ? Math.max(1, toDate.getDate() - today.getDate() + 1)
      : 0;
  const balance = income - expense;

  return {
    monthLabel: now.toLocaleDateString("th-TH", {
      month: "long",
      year: "numeric",
    }),
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
}

const fmtDate = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
});

const rangeLabelFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
});

interface DashboardDateRange {
  fromDay: string;
  toDay: string;
  monthStartDay: string;
  monthEndDay: string;
  fromIso: string;
  toIso: string;
  label: string;
}

function getDashboardDateRange({
  monthDate,
  today = new Date(),
}: {
  monthDate: Date;
  today?: Date;
}): DashboardDateRange {
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
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function minDate(a: Date, b: Date) {
  return a < b ? a : b;
}

function getMonthRangeFromMonthValue(monthValue: string) {
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
}

export default function Dashboard() {
  const {
    monthLabel,
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

  const hasAnyData = income > 0 || expense > 0;
  const topCategory = categorySpend[0] ?? null;
  const selectedMonth = range.monthStartDay.slice(0, 7);
  const rangeSummary = isCurrentMonth
    ? "กำลังดูข้อมูลเดือนนี้ถึงวันนี้"
    : "กำลังดูข้อมูลทั้งเดือน";

  function resetRange() {
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
  }

  function handleMonthChange(monthValue: string) {
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
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 lg:gap-6">
      <header>
        <Card className="overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,31rem)]">
            <CardHeader
              className={cn(
                "justify-between gap-5 p-4 sm:p-5 lg:min-h-48",
                isCurrentMonth ? "bg-teal/10" : "bg-line/35"
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={isCurrentMonth ? "teal" : "muted"}>
                  {isCurrentMonth ? "เดือนนี้" : "ย้อนหลัง"}
                </Badge>
                <Badge tone="neutral" className="rounded-xs">
                  {range.label}
                </Badge>
              </div>
              <div>
                <CardDescription>ภาพรวมรายเดือน</CardDescription>
                <CardTitle className="mt-2 text-3xl font-semibold sm:text-4xl">
                  {monthLabel}
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="border-line bg-surface flex flex-col gap-4 border-t p-4 sm:p-5 lg:border-t-0 lg:border-l">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <CalendarRange className="text-coral h-4 w-4" />
                    <p className="text-ink text-sm font-semibold">
                      เดือนที่ใช้คำนวณ
                    </p>
                  </div>
                  <p className="text-muted mt-1 text-xs leading-5">
                    {rangeSummary}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={isCurrentMonth ? "ghost" : "secondary"}
                  size="sm"
                  onClick={resetRange}
                  disabled={isCurrentMonth}
                  className="shrink-0"
                  aria-label="กลับไปดูเดือนนี้"
                >
                  <RotateCcw className="h-4 w-4" />
                  เดือนนี้
                </Button>
              </div>

              <div className="border-line bg-sky/45 overflow-hidden rounded-md border">
                <DashboardDateField
                  label="เลือกเดือน"
                  helper="พอดีจะคำนวณภาพรวมจากรายการในเดือนที่เลือก"
                  className="p-3 sm:p-4"
                >
                  <MonthPicker
                    value={selectedMonth}
                    max={todayDayValue().slice(0, 7)}
                    onChange={handleMonthChange}
                  />
                </DashboardDateField>
              </div>

              <Button asChild className="h-11 lg:hidden">
                <Link to="/add">
                  <Plus className="h-4 w-4" />
                  บันทึกรายการ
                </Link>
              </Button>
            </CardContent>
          </div>
        </Card>
      </header>

      <section
        aria-label="ภาพรวมการเงิน"
        className="grid gap-4 lg:grid-flow-dense lg:auto-rows-[minmax(150px,auto)] lg:grid-cols-6"
      >
        <Card className="overflow-hidden lg:col-span-4">
          <CardContent className="flex h-full flex-col p-4 sm:p-5">
            <div
              className={cn(
                "-m-4 flex flex-1 flex-col gap-4 p-4 sm:-m-5 sm:gap-5 sm:p-5",
                getBalanceSurfaceClass(balance, income)
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Badge tone={getBalanceTone(balance, income)}>
                    {getBalanceLabel(balance, income)}
                  </Badge>
                  <p className="text-muted mt-4 text-sm">
                    {isCurrentMonth
                      ? "คงเหลือเดือนนี้"
                      : "คงเหลือเดือนที่เลือก"}
                  </p>
                  <p
                    className="text-ink mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
                    data-testid="balance"
                  >
                    {fmtBaht(balance)}
                  </p>
                </div>
                <img
                  alt=""
                  className="h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16"
                  loading="lazy"
                  src={getBalanceMascot(balance, expense)}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <SummaryMetric
                  label="รายรับ"
                  value={fmtBaht(income)}
                  tone="teal"
                  testId="income-badge"
                />
                <SummaryMetric
                  label="รายจ่าย"
                  value={fmtBaht(expense)}
                  tone="coral"
                  testId="expense-badge"
                />
                <SummaryMetric
                  label="ใช้ได้ต่อวัน"
                  value={formatDailySafe(dailySafe)}
                  tone={
                    dailySafe === null
                      ? "neutral"
                      : dailySafe < 0
                        ? "coral"
                        : "teal"
                  }
                />
              </div>

              <div className="border-line bg-surface rounded-md border p-3 sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-ink text-sm font-semibold">
                      {isCurrentMonth
                        ? daysLeft > 0
                          ? `เหลืออีก ${daysLeft} วันในเดือนนี้`
                          : "สรุปเดือนนี้"
                        : `สรุปเดือน ${monthLabel}`}
                    </p>
                    <p className="text-muted mt-1 text-sm leading-6">
                      {isCurrentMonth && daysLeft > 0
                        ? getDailySafeCopy(dailySafe)
                        : `เดือน ${monthLabel} คงเหลือ ${fmtBaht(balance)} จากรายรับ ${fmtBaht(income)}`}
                    </p>
                  </div>
                  <Button asChild className="w-full sm:w-auto">
                    <Link to="/add">
                      <Plus className="h-4 w-4" />
                      บันทึกรายการ
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface overflow-hidden lg:col-span-2 lg:row-span-2">
          <CardHeader>
            <CardTitle>ควรทำอะไรต่อ</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <DashboardCoach
              income={income}
              expense={expense}
              balance={balance}
            />
            {hasAnyData ? (
              <SpendRatio income={income} expense={expense} />
            ) : (
              <p className="text-muted text-sm leading-6">
                เมื่อมีรายการแรก หน้านี้จะเริ่มแสดงสัดส่วนเงินเข้าออกทันที
              </p>
            )}
            <NextActions
              topCategory={topCategory}
              goalsCount={goals.length}
              recentCount={recent.length}
            />
          </CardContent>
        </Card>

        <RecentTransactions
          className="lg:col-span-2"
          recent={recent}
          categoryNameById={categoryNameById}
        />
        <CategorySpending
          className="lg:col-span-2"
          rows={categorySpend}
          totalExpense={expense}
        />
        <GoalsPreview className="lg:col-span-2" goals={goals} />
        <SignalCard
          className="lg:col-span-4"
          income={income}
          expense={expense}
        />
      </section>
    </div>
  );
}

function DashboardDateField({
  children,
  className,
  helper,
  label,
}: {
  children: ReactNode;
  className?: string;
  helper?: string;
  label: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="text-muted text-xs">{label}</Label>
      {children}
      {helper ? <p className="text-muted text-xs leading-5">{helper}</p> : null}
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  tone,
  testId,
}: {
  label: string;
  value: string;
  tone: "neutral" | "teal" | "coral";
  testId?: string;
}) {
  return (
    <div
      className={cn(
        "border-line rounded-sm border p-2.5 sm:p-3",
        tone === "teal" && "bg-teal/10",
        tone === "coral" && "bg-coral/10",
        tone === "neutral" && "bg-surface"
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
}

function getBalanceSurfaceClass(balance: number, income: number) {
  if (income === 0) return "bg-sky/45";
  if (balance < 0) return "bg-coral/10";
  return "bg-teal/10";
}

function SpendRatio({ income, expense }: { income: number; expense: number }) {
  const pct =
    income > 0 ? Math.min(100, Math.round((expense / income) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">รายจ่ายเทียบรายรับ</span>
        <span
          className={cn("font-medium", pct > 90 ? "text-coral" : "text-ink")}
        >
          {income > 0 ? `${pct}%` : "รอรายรับ"}
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
}

function NextActions({
  topCategory,
  goalsCount,
  recentCount,
}: {
  topCategory:
    | Awaited<ReturnType<typeof loader>>["categorySpend"][number]
    | null;
  goalsCount: number;
  recentCount: number;
}) {
  return (
    <div className="border-line flex flex-col gap-2 border-t pt-4">
      <ActionLink
        to="/add"
        icon={Plus}
        label={recentCount === 0 ? "บันทึกรายการแรก" : "บันทึกรายการวันนี้"}
        description="เพิ่มข้อมูลให้ภาพรวมแม่นขึ้น"
        tone="coral"
      />
      <ActionLink
        to="/history"
        icon={ListChecks}
        label={
          topCategory
            ? topCategory.categoryId === "uncategorized"
              ? "เติมหมวดให้รายการ"
              : `ตรวจหมวด ${topCategory.name}`
            : "ตรวจประวัติ"
        }
        description={
          topCategory
            ? `เดือนนี้อยู่ตรงนี้ ${fmtBaht(topCategory.amount)}`
            : "ดูและแก้รายการที่บันทึกไว้"
        }
        tone="neutral"
      />
      <ActionLink
        to="/goals"
        icon={Target}
        label={goalsCount === 0 ? "ตั้งเป้าหมายแรก" : "ดูเป้าหมาย"}
        description="กันเงินไว้ให้เรื่องที่สำคัญ"
        tone="teal"
      />
    </div>
  );
}

function ActionLink({
  to,
  icon: Icon,
  label,
  description,
  tone,
}: {
  to: string;
  icon: typeof Plus;
  label: string;
  description: string;
  tone: "neutral" | "teal" | "coral";
}) {
  return (
    <Link
      to={to}
      className="border-line hover:bg-sky/60 focus-visible:ring-coral/40 flex items-center gap-3 rounded-sm border p-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xs border",
          tone === "coral" && "border-coral bg-coral text-white",
          tone === "teal" && "border-teal bg-teal text-white",
          tone === "neutral" && "border-line bg-surface text-muted"
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="text-ink block text-sm font-medium">{label}</span>
        <span className="text-muted mt-0.5 block truncate text-xs">
          {description}
        </span>
      </span>
      <ArrowRight className="text-muted ml-auto h-4 w-4 shrink-0" />
    </Link>
  );
}

function RecentTransactions({
  className,
  recent,
  categoryNameById,
}: {
  className?: string;
  recent: Awaited<ReturnType<typeof loader>>["recent"];
  categoryNameById: Record<string, string>;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>รายการล่าสุด</CardTitle>
        {recent.length > 0 && (
          <Link to="/history" className="text-muted hover:text-ink text-xs">
            ดูทั้งหมด
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <div className="flex flex-col gap-3">
            <MascotState
              mood="normal"
              size="sm"
              title="ยังไม่มีรายการในเดือนนี้"
              description="เริ่มจากรายการแรก แล้วภาพรวมเดือนนี้จะค่อย ๆ ชัดขึ้น"
            />
            <Button asChild variant="secondary" size="sm">
              <Link to="/add">
                <Plus className="h-4 w-4" />
                บันทึกรายการแรก
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
                    {fmtDate.format(new Date(t.occurredAt))}
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
}

function GoalsPreview({
  className,
  goals,
}: {
  className?: string;
  goals: Awaited<ReturnType<typeof loader>>["goals"];
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>เป้าหมาย</CardTitle>
        {goals.length > 0 && (
          <Link to="/goals" className="text-muted hover:text-ink text-xs">
            ดูทั้งหมด
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <div className="flex flex-col gap-3">
            <MascotState
              mood="saving"
              size="sm"
              title="ยังไม่มีเป้าหมาย"
              description="ตั้งเป้าหมายเล็ก ๆ เพื่อกันเงินไว้ให้เรื่องที่สำคัญ"
            />
            <Button asChild variant="secondary" size="sm">
              <Link to="/goals">
                <Target className="h-4 w-4" />
                เพิ่มเป้าหมาย
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
                    aria-label={`คืบหน้า ${pct}%`}
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
}

function CategorySpending({
  className,
  rows,
  totalExpense,
}: {
  className?: string;
  rows: Awaited<ReturnType<typeof loader>>["categorySpend"];
  totalExpense: number;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>หมวดที่ใช้ไปมาก</CardTitle>
        <Link to="/history" className="text-muted hover:text-ink text-xs">
          เปิดประวัติ
        </Link>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <MascotState
            mood="thinking"
            size="sm"
            title="ยังไม่เห็นหมวดรายจ่าย"
            description="เมื่อมีรายจ่าย พอดีจะเรียงหมวดที่ใช้เยอะสุดไว้ให้ดูตรงนี้"
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((row) => {
              const pct =
                totalExpense > 0
                  ? Math.min(100, Math.round((row.amount / totalExpense) * 100))
                  : 0;
              return (
                <li key={row.categoryId}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-ink font-medium">{row.name}</span>
                    <span className="text-muted shrink-0 text-xs">
                      {fmtBaht(row.amount)}
                    </span>
                  </div>
                  <div className="bg-line mt-2 h-2 w-full overflow-hidden rounded-full">
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
}

function SignalCard({
  className,
  income,
  expense,
}: {
  className?: string;
  income: number;
  expense: number;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>สัญญาณที่ควรดู</CardTitle>
      </CardHeader>
      <CardContent>
        <DashboardSignal income={income} expense={expense} />
      </CardContent>
    </Card>
  );
}

function DashboardCoach({
  income,
  expense,
  balance,
}: {
  income: number;
  expense: number;
  balance: number;
}) {
  if (income === 0 && expense === 0) {
    return (
      <MascotTip mood="normal" title="พอดีรอรายการแรกอยู่">
        เริ่มจากรายรับหรือรายจ่ายที่จำได้ง่ายที่สุดก่อน
        เดี๋ยวภาพรวมเดือนนี้จะตามมาเอง
      </MascotTip>
    );
  }
  if (income === 0) {
    return (
      <MascotTip mood="thinking" title="พอดีอยากเห็นรายรับด้วย">
        ตอนนี้เห็นรายจ่ายแล้ว แต่ยังไม่มีรายรับให้เทียบ
        เพิ่มรายรับเดือนนี้เพื่อให้คำแนะนำแม่นขึ้น
      </MascotTip>
    );
  }
  if (balance < 0) {
    return (
      <MascotTip mood="warning" title="พอดีชวนชะลอก่อน">
        คงเหลือติดลบแล้ว
        ลองเปิดประวัติแล้วดูรายการใหญ่ล่าสุดก่อนเพิ่มรายจ่ายใหม่
      </MascotTip>
    );
  }
  return (
    <MascotTip mood="happy" title="พอดีเห็นจังหวะที่ยังไหว">
      เหลือ {fmtBaht(balance)} จากรายรับเดือนนี้ ถ้ามีเงินที่อยากกันไว้
      ลองเพิ่มเป็นเป้าหมายเล็ก ๆ ได้เลย
    </MascotTip>
  );
}

function DashboardSignal({
  income,
  expense,
}: {
  income: number;
  expense: number;
}) {
  if (income === 0 && expense === 0) {
    return (
      <MascotState
        mood="warning"
        size="sm"
        title="ยังไม่มีข้อมูลพอให้เตือน"
        description="เมื่อมีรายการใช้จ่ายมากขึ้น พอดีจะช่วยชี้จุดที่ควรชะลอแบบไม่กดดัน"
      />
    );
  }
  if (income === 0 && expense > 0) {
    return (
      <MascotState
        mood="thinking"
        size="sm"
        title="ยังไม่มีรายรับเดือนนี้"
        description={`ตอนนี้มีรายจ่าย ${fmtBaht(expense)} แล้ว เพิ่มรายรับเพื่อให้พอดีคำนวณภาพรวมได้แม่นขึ้น`}
      />
    );
  }
  if (income > 0 && expense > income) {
    return (
      <MascotState
        mood="warning"
        size="sm"
        title="รายจ่ายเกินรายรับเดือนนี้"
        description={`ใช้ไปแล้ว ${fmtBaht(expense)} จากรายรับ ${fmtBaht(income)} ลองชะลอหมวดที่ใช้บ่อยที่สุดก่อน`}
      />
    );
  }
  return (
    <MascotState
      mood="happy"
      size="sm"
      title="กำลังไปดี"
      description={`เดือนนี้ใช้ไป ${fmtBaht(expense)} จากรายรับ ${fmtBaht(income)} ยังพอดีอยู่`}
    />
  );
}

function getBalanceMascot(balance: number, expense: number) {
  if (balance < 0) return "/brand/mascots/warning.png";
  if (expense === 0) return "/brand/mascots/thinking.png";
  return "/brand/mascots/happy.png";
}

function getBalanceTone(
  balance: number,
  income: number
): "neutral" | "teal" | "coral" {
  if (income === 0) return "neutral";
  if (balance < 0) return "coral";
  return "teal";
}

function getBalanceLabel(balance: number, income: number) {
  if (income === 0) return "รอรายรับ";
  if (balance < 0) return "เกินรายรับแล้ว";
  return "ยังพอดีอยู่";
}

function formatDailySafe(dailySafe: number | null) {
  if (dailySafe === null) return "รอรายรับ";
  return fmtBaht(dailySafe);
}

function getDailySafeCopy(dailySafe: number | null) {
  if (dailySafe === null) {
    return "เพิ่มรายรับเดือนนี้ก่อน แล้วพอดีจะช่วยเฉลี่ยเงินที่ใช้ได้ต่อวัน";
  }
  if (dailySafe < 0) {
    return "คงเหลือติดลบแล้ว ลองตรวจรายการใหญ่หรือชะลอรายจ่ายก่อนเพิ่มรายการใหม่";
  }
  return `ถ้าไม่อยากเกินเดือนนี้ ใช้เฉลี่ยได้ประมาณ ${fmtBaht(dailySafe)} ต่อวัน`;
}
