import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { MascotState } from "~/components/brand/mascot-state";
import { repo } from "~/lib/db";
import { fmtBaht, fmtSignedBaht } from "~/lib/format/baht";
import { getMonthRange } from "~/lib/date/month-range";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "พอดี — หน้าหลัก" },
    { name: "description", content: "เงินพอดี ชีวิตเบาขึ้น" },
  ];
}

export async function loader() {
  const now = new Date();
  const { from, to } = getMonthRange(now);
  const [monthTx, categories, goals] = await Promise.all([
    repo.listTransactions({ from, to }),
    repo.listCategories(),
    repo.listGoals(),
  ]);

  let income = 0;
  let expense = 0;
  for (const t of monthTx) {
    if (t.kind === "income") income += t.amount;
    else expense += t.amount;
  }

  const categoryNameById = Object.fromEntries(
    categories.map((c) => [c.id, c.name])
  );

  return {
    monthLabel: now.toLocaleDateString("th-TH", {
      month: "long",
      year: "numeric",
    }),
    income,
    expense,
    balance: income - expense,
    recent: monthTx.slice(0, 5),
    goals: goals.slice(0, 3),
    categoryNameById,
  };
}

const fmtDate = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
});

export default function Dashboard() {
  const {
    monthLabel,
    income,
    expense,
    balance,
    recent,
    goals,
    categoryNameById,
  } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-muted text-sm">เดือนนี้</p>
          <h1 className="text-ink text-2xl font-semibold">{monthLabel}</h1>
        </div>
        <Button asChild size="sm" className="lg:hidden">
          <Link to="/add">
            <Plus className="h-4 w-4" />
            บันทึก
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>คงเหลือเดือนนี้</CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className="text-3xl font-semibold tracking-tight"
            data-testid="balance"
          >
            {fmtBaht(balance)}
          </p>
          <div className="mt-3 flex gap-2 text-xs">
            <Badge tone="teal" data-testid="income-badge">
              รายรับ {fmtBaht(income)}
            </Badge>
            <Badge tone="coral" data-testid="expense-badge">
              รายจ่าย {fmtBaht(expense)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
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
              <MascotState
                mood="normal"
                size="sm"
                title="ยังไม่มีรายการในเดือนนี้"
                description="เริ่มจากรายการแรก แล้วภาพรวมเดือนนี้จะค่อย ๆ ชัดขึ้น"
              />
            ) : (
              <ul className="divide-line divide-y" data-testid="recent-list">
                {recent.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 py-2.5"
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
                    <Badge tone={t.kind === "income" ? "teal" : "coral"}>
                      {fmtSignedBaht(t.amount, t.kind)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
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
              <MascotState
                mood="saving"
                size="sm"
                title="ยังไม่มีเป้าหมาย"
                description="ตั้งเป้าหมายเล็ก ๆ เพื่อกันเงินไว้ให้เรื่องที่สำคัญ"
              />
            ) : (
              <ul className="flex flex-col gap-3" data-testid="goal-list">
                {goals.map((g) => {
                  const pct =
                    g.target > 0
                      ? Math.min(100, Math.round((g.saved / g.target) * 100))
                      : 0;
                  return (
                    <li key={g.id} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-ink truncate font-medium">
                          {g.name}
                        </span>
                        <span className="text-muted text-xs">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>สัญญาณที่ควรดู</CardTitle>
        </CardHeader>
        <CardContent>
          <DashboardSignal income={income} expense={expense} />
        </CardContent>
      </Card>
    </div>
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
        title="ยังไม่มีข้อมูลพอให้เตือน"
        description="เมื่อมีรายการใช้จ่ายมากขึ้น พอดีจะช่วยชี้จุดที่ควรชะลอแบบไม่กดดัน"
      />
    );
  }
  if (income > 0 && expense > income) {
    return (
      <MascotState
        mood="warning"
        title="รายจ่ายเกินรายรับเดือนนี้"
        description={`ใช้ไปแล้ว ${fmtBaht(expense)} จากรายรับ ${fmtBaht(income)} ลองชะลอหมวดที่ใช้บ่อยที่สุดก่อน`}
      />
    );
  }
  return (
    <MascotState
      mood="happy"
      title="กำลังไปดี"
      description={`เดือนนี้ใช้ไป ${fmtBaht(expense)} จากรายรับ ${fmtBaht(income)} ยังพอดีอยู่`}
    />
  );
}
