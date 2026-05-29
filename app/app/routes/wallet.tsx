import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/wallet";
import {
  ArrowRight,
  CalendarDays,
  ListChecks,
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
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
import { repo } from "~/lib/db";
import { getMonthRange } from "~/lib/date/month-range";
import { fmtBaht } from "~/lib/format/baht";
import { cn } from "~/lib/cn";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "พอดี — กระเป๋า" },
    {
      name: "description",
      content: "ดูเงินพร้อมใช้ เงินกันไว้ และทิศทางการใช้จ่าย",
    },
  ];
}

export async function loader() {
  const now = new Date();
  const { from, to } = getMonthRange(now);
  const [allTx, monthTx, categories, goals] = await Promise.all([
    repo.listTransactions(),
    repo.listTransactions({ from, to }),
    repo.listCategories(),
    repo.listGoals(),
  ]);

  const categoryNameById = Object.fromEntries(
    categories.map((category) => [category.id, category.name])
  );

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
  const balance = totalIncome - totalExpense;
  const available = balance - reserved;
  const monthNet = monthIncome - monthExpense;
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft = Math.max(1, monthEnd.getDate() - now.getDate() + 1);
  const dailyRoom = Math.floor(available / daysLeft);

  const categorySpend = Array.from(monthExpenseByCategory.entries())
    .map(([categoryId, amount]) => ({
      id: categoryId,
      name:
        categoryId === "uncategorized"
          ? "ไม่ระบุหมวด"
          : (categoryNameById[categoryId] ?? "ไม่ระบุหมวด"),
      amount,
      share: monthExpense > 0 ? Math.round((amount / monthExpense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    monthLabel: now.toLocaleDateString("th-TH", {
      month: "long",
      year: "numeric",
    }),
    balance,
    available,
    reserved,
    monthIncome,
    monthExpense,
    monthNet,
    dailyRoom,
    daysLeft,
    recent: allTx.slice(0, 6),
    goals: goals
      .map((goal) => ({
        ...goal,
        progress:
          goal.target > 0
            ? Math.min(100, Math.round((goal.saved / goal.target) * 100))
            : 0,
      }))
      .sort((a, b) => b.saved - a.saved)
      .slice(0, 4),
    categorySpend,
    categoryNameById,
    hasAnyData: allTx.length > 0 || goals.length > 0,
  };
}

const fmtDate = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
});

export default function Wallet() {
  const {
    monthLabel,
    balance,
    available,
    reserved,
    monthIncome,
    monthExpense,
    monthNet,
    dailyRoom,
    daysLeft,
    recent,
    goals,
    categorySpend,
    categoryNameById,
    hasAnyData,
  } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted text-sm">กระเป๋าของฉัน</p>
          <h1 className="text-ink text-2xl font-semibold">
            เงินพร้อมใช้และเงินกันไว้
          </h1>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link to="/history">
              <ListChecks className="h-4 w-4" />
              ประวัติ
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/add">
              <Plus className="h-4 w-4" />
              บันทึก
            </Link>
          </Button>
        </div>
      </header>

      <section
        aria-label="สถานะกระเป๋า"
        className="grid gap-4 lg:grid-cols-12"
      >
        <Card className="lg:col-span-7">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Badge tone={available >= 0 ? "teal" : "coral"}>
                    {available >= 0 ? "ยังพอจัดสรรได้" : "ต้องลดการใช้จ่าย"}
                  </Badge>
                  <p className="text-muted mt-4 text-sm">เงินพร้อมใช้ตอนนี้</p>
                  <p
                    className={cn(
                      "mt-2 text-3xl font-semibold tracking-tight sm:text-4xl",
                      available < 0 ? "text-coral" : "text-ink"
                    )}
                  >
                    {fmtBaht(available)}
                  </p>
                </div>
                <div className="border-line bg-sky/45 rounded-sm border px-3 py-2 text-sm">
                  <p className="text-muted">เหลืออีก {daysLeft} วัน</p>
                  <p
                    className={cn(
                      "mt-1 font-semibold",
                      dailyRoom < 0 ? "text-coral" : "text-ink"
                    )}
                  >
                    {fmtBaht(dailyRoom)} / วัน
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <WalletFigure label="เงินทั้งหมด" value={fmtBaht(balance)} />
                <WalletFigure
                  label="กันไว้กับเป้าหมาย"
                  value={fmtBaht(reserved)}
                  tone="teal"
                />
                <WalletFigure
                  label={`สุทธิ ${monthLabel}`}
                  value={`${monthNet >= 0 ? "+" : "-"}${fmtBaht(Math.abs(monthNet))}`}
                  tone={monthNet < 0 ? "coral" : "teal"}
                />
              </div>

              <div className="border-line rounded-sm border">
                <MoneyRail
                  available={Math.max(available, 0)}
                  reserved={reserved}
                  spent={Math.max(monthExpense, 0)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>เดือนนี้เคลื่อนไหวยังไง</CardTitle>
            <CardDescription>เทียบเงินเข้าออกจากรายการที่บันทึก</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <FlowRow
              icon={TrendingUp}
              label="เงินเข้า"
              value={fmtBaht(monthIncome)}
              tone="teal"
            />
            <FlowRow
              icon={TrendingDown}
              label="เงินออก"
              value={fmtBaht(monthExpense)}
              tone="coral"
            />
            <FlowRow
              icon={CalendarDays}
              label="คงเหลือต่อวัน"
              value={fmtBaht(dailyRoom)}
              tone={dailyRoom < 0 ? "coral" : "neutral"}
            />
            <p className="text-muted border-line mt-1 border-t pt-3 text-sm leading-6">
              {getWalletNote(available, reserved, monthExpense)}
            </p>
          </CardContent>
        </Card>

        {hasAnyData ? (
          <>
            <CategoryPlan rows={categorySpend} className="lg:col-span-6" />
            <ReservedGoals goals={goals} className="lg:col-span-6" />
            <RecentList
              recent={recent}
              categoryNameById={categoryNameById}
              className="lg:col-span-12"
            />
          </>
        ) : (
          <EmptyWallet className="lg:col-span-12" />
        )}
      </section>
    </div>
  );
}

function WalletFigure({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "teal" | "coral";
}) {
  return (
    <div className="border-line rounded-sm border p-3">
      <p className="text-muted text-xs">{label}</p>
      <p
        className={cn(
          "mt-1 text-base font-semibold",
          tone === "teal" && "text-teal",
          tone === "coral" && "text-coral",
          tone === "neutral" && "text-ink"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function MoneyRail({
  available,
  reserved,
  spent,
}: {
  available: number;
  reserved: number;
  spent: number;
}) {
  const total = Math.max(available + reserved + spent, 1);
  const parts = [
    {
      label: "พร้อมใช้",
      value: available,
      className: "bg-teal",
      width: Math.max(available > 0 ? 8 : 0, (available / total) * 100),
    },
    {
      label: "กันไว้",
      value: reserved,
      className: "bg-lime",
      width: Math.max(reserved > 0 ? 8 : 0, (reserved / total) * 100),
    },
    {
      label: "ใช้ไปเดือนนี้",
      value: spent,
      className: "bg-coral",
      width: Math.max(spent > 0 ? 8 : 0, (spent / total) * 100),
    },
  ].filter((part) => part.value > 0);

  return (
    <div className="p-3">
      {parts.length > 0 ? (
        <div className="bg-sky flex h-3 overflow-hidden rounded-xs">
          {parts.map((part) => (
            <span
              aria-hidden="true"
              className={part.className}
              key={part.label}
              style={{ width: `${part.width}%` }}
            />
          ))}
        </div>
      ) : (
        <div className="bg-sky h-3 rounded-xs" />
      )}
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {parts.map((part) => (
          <div className="flex items-center gap-2 text-xs" key={part.label}>
            <span className={cn("h-2 w-2 rounded-xs", part.className)} />
            <span className="text-muted">{part.label}</span>
            <span className="text-ink ml-auto font-medium">
              {fmtBaht(part.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlowRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  tone: "neutral" | "teal" | "coral";
}) {
  return (
    <div className="border-line flex items-center gap-3 rounded-sm border p-3">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xs border",
          tone === "teal" && "border-teal/20 bg-teal/10 text-teal",
          tone === "coral" && "border-coral/20 bg-coral/10 text-coral",
          tone === "neutral" && "border-line bg-sky text-ink"
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-muted min-w-0 text-sm">{label}</span>
      <span
        className={cn(
          "ml-auto text-sm font-semibold",
          tone === "teal" && "text-teal",
          tone === "coral" && "text-coral",
          tone === "neutral" && "text-ink"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function CategoryPlan({
  rows,
  className,
}: {
  rows: Array<{ id: string; name: string; amount: number; share: number }>;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>หมวดที่ควรจับตา</CardTitle>
        <CardDescription>คิดจากรายจ่ายในเดือนนี้</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length > 0 ? (
          <div className="flex flex-col gap-3">
            {rows.map((row) => (
              <div className="flex flex-col gap-2" key={row.id}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-ink truncate text-sm font-medium">
                    {row.name}
                  </p>
                  <p className="text-muted text-sm">{fmtBaht(row.amount)}</p>
                </div>
                <div className="bg-sky h-2 rounded-xs">
                  <div
                    className="bg-coral h-2 rounded-xs"
                    style={{ width: `${Math.max(row.share, 4)}%` }}
                  />
                </div>
                <p className="text-muted text-xs">{row.share}% ของรายจ่าย</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted text-sm leading-6">
            ยังไม่มีรายจ่ายเดือนนี้ เมื่อเริ่มบันทึกจะเห็นหมวดที่ใช้เงินมากสุด
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ReservedGoals({
  goals,
  className,
}: {
  goals: Array<{
    id: string;
    name: string;
    target: number;
    saved: number;
    progress: number;
  }>;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>เงินกันไว้</CardTitle>
          <CardDescription>ยอดสะสมจากเป้าหมายที่ตั้งไว้</CardDescription>
        </div>
        <Button asChild size="sm" variant="secondary">
          <Link to="/goals">
            ดูเป้าหมาย
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {goals.length > 0 ? (
          <div className="flex flex-col divide-y">
            {goals.map((goal) => (
              <div className="py-3 first:pt-0 last:pb-0" key={goal.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-ink truncate text-sm font-medium">
                      {goal.name}
                    </p>
                    <p className="text-muted mt-1 text-xs">
                      {fmtBaht(goal.saved)} จาก {fmtBaht(goal.target)}
                    </p>
                  </div>
                  <Badge tone="teal">{goal.progress}%</Badge>
                </div>
                <div className="bg-sky mt-3 h-2 rounded-xs">
                  <div
                    className="bg-teal h-2 rounded-xs"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <span className="border-line bg-sky flex h-9 w-9 shrink-0 items-center justify-center rounded-xs border text-teal">
              <Target className="h-4 w-4" />
            </span>
            <p className="text-muted text-sm leading-6">
              ยังไม่มีเป้าหมายเก็บเงิน ตั้งเป้าหมายเพื่อแยกเงินกันไว้ออกจากเงินพร้อมใช้
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentList({
  recent,
  categoryNameById,
  className,
}: {
  recent: Array<{
    id: string;
    title: string;
    kind: "income" | "expense";
    amount: number;
    categoryId: string | null;
    occurredAt: string;
  }>;
  categoryNameById: Record<string, string>;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>รายการที่กระทบกระเป๋า</CardTitle>
          <CardDescription>รายการล่าสุดจากทุกเดือน</CardDescription>
        </div>
        <Button asChild size="sm" variant="secondary">
          <Link to="/history">
            ดูทั้งหมด
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {recent.length > 0 ? (
          <div className="divide-y">
            {recent.map((transaction) => (
              <Link
                className="hover:bg-sky/65 -mx-2 flex items-center gap-3 rounded-sm px-2 py-3 transition-colors"
                key={transaction.id}
                to={`/history/${transaction.id}`}
              >
                <span
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 rounded-xs",
                    transaction.kind === "income" ? "bg-teal" : "bg-coral"
                  )}
                />
                <span className="min-w-0">
                  <span className="text-ink block truncate text-sm font-medium">
                    {transaction.title}
                  </span>
                  <span className="text-muted mt-0.5 block text-xs">
                    {fmtDate.format(new Date(transaction.occurredAt))} ·{" "}
                    {transaction.categoryId
                      ? (categoryNameById[transaction.categoryId] ??
                        "ไม่ระบุหมวด")
                      : "ไม่ระบุหมวด"}
                  </span>
                </span>
                <span
                  className={cn(
                    "ml-auto text-sm font-semibold",
                    transaction.kind === "income" ? "text-teal" : "text-coral"
                  )}
                >
                  {transaction.kind === "income" ? "+" : "-"}
                  {fmtBaht(transaction.amount)}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted text-sm leading-6">
            ยังไม่มีรายการล่าสุด เริ่มบันทึกรายรับรายจ่ายเพื่อให้กระเป๋าอัปเดต
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyWallet({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <img
            alt=""
            className="h-20 w-20 shrink-0 object-contain"
            loading="lazy"
            src="/brand/mascots/normal.png"
          />
          <div>
            <h2 className="text-ink text-base font-semibold">
              กระเป๋าจะชัดขึ้นหลังมีรายการแรก
            </h2>
            <p className="text-muted mt-1 text-sm leading-6">
              บันทึกรายรับหรือรายจ่ายหนึ่งรายการ แล้วหน้านี้จะแยกเงินพร้อมใช้
              เงินกันไว้ และหมวดที่ควรจับตาให้เอง
            </p>
          </div>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/add">
            <Plus className="h-4 w-4" />
            บันทึกรายการแรก
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function getWalletNote(available: number, reserved: number, expense: number) {
  if (available < 0) {
    return "เงินพร้อมใช้ติดลบแล้ว ลองตรวจรายการใหญ่หรือเลื่อนเงินบางส่วนออกจากเป้าหมายก่อนใช้จ่ายต่อ";
  }

  if (reserved > 0 && expense > 0) {
    return "กระเป๋านี้แยกเงินกันไว้ให้อยู่คนละส่วนกับเงินพร้อมใช้ เพื่อให้เห็นวงเงินที่ใช้ได้จริง";
  }

  if (reserved > 0) {
    return "มีเงินกันไว้แล้ว แต่ยังไม่มีรายจ่ายเดือนนี้ เริ่มบันทึกเมื่อมีการใช้เงินจริง";
  }

  return "ยังไม่ได้กันเงินไว้กับเป้าหมาย ถ้ามีเงินก้อนที่ไม่ควรแตะ ให้เพิ่มไว้ในหน้าเป้าหมาย";
}
