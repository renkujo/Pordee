import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/wallet";
import { ArrowRight, ListChecks, Plus, Target } from "lucide-react";
import { Button } from "~/components/ui/button";
import { MascotTip } from "~/components/brand/mascot-state";
import { repo } from "~/lib/db";
import { requireUser } from "~/lib/auth.server";
import { getMonthRange } from "~/lib/date/month-range";
import { fmtBaht } from "~/lib/format/baht";
import { cn } from "~/lib/cn";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "พอดี — กระเป๋า" },
    {
      name: "description",
      content: "แยกเงินเป็นกระเป๋าย่อย เพื่อดูเงินที่ยังใช้ได้ง่ายขึ้น",
    },
  ];
}

type PocketStatus = "empty" | "low" | "normal" | "over";

interface PocketCta {
  to: string;
  label: string;
}

export async function loader({ request }: Route.LoaderArgs) {
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
      title: "ใช้จ่ายประจำวัน",
      description: "เงินสำหรับใช้จ่ายเล็ก ๆ ระหว่างวัน",
      amount: dailyRemaining,
      target: dailyTarget,
      spent: foodSpent,
      spentLabel: "ใช้ไปกับอาหารเดือนนี้",
      cta: { to: "/add", label: "บันทึกรายจ่าย" },
      mascot: "/brand/mascots/happy.png",
      surfaceClass: "bg-teal/10",
      amountClass: "text-teal",
      barClass: "bg-teal",
    },
    {
      id: "travel",
      title: "เดินทาง",
      description: "ค่าเดินทางที่อยากกันไว้ก่อนออกจากบ้าน",
      amount: travelRemaining,
      target: travelTarget,
      spent: travelSpent,
      spentLabel: "ใช้ไปกับการเดินทางเดือนนี้",
      cta: { to: "/history", label: "ดูรายการเดินทาง" },
      mascot: "/brand/mascots/normal.png",
      surfaceClass: "bg-lime/25",
      amountClass: "text-ink",
      barClass: "bg-lime-strong",
    },
    {
      id: "bills",
      title: "เตรียมจ่ายบิล",
      description: "แยกเงินไว้ก่อนถึงวันจ่ายจริง",
      amount: billsRemaining,
      target: billsTarget,
      spent: billsSpent,
      spentLabel: "จ่ายบิลไปแล้วเดือนนี้",
      cta: { to: "/history", label: "ดูบิลที่จ่ายแล้ว" },
      mascot: "/brand/mascots/thinking.png",
      surfaceClass: "bg-coral/10",
      amountClass: "text-coral",
      barClass: "bg-coral",
    },
    {
      id: "reserve",
      title: "เงินสำรอง",
      description: "เงินกันไว้ เผื่อเดือนนี้มีเรื่องไม่คาดคิด",
      amount: reserved,
      target: finalReserveTarget,
      spent: 0,
      spentLabel: "เก็บเข้าเป้าหมายแล้ว",
      cta: { to: "/goals", label: "เติมเงินสำรอง" },
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
          ? "ไม่ระบุหมวด"
          : (categoryNameById[categoryId] ?? "ไม่ระบุหมวด"),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    monthLabel: now.toLocaleDateString("th-TH", {
      month: "long",
      year: "numeric",
    }),
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
}

interface PocketView {
  id: string;
  title: string;
  description: string;
  amount: number;
  target: number;
  spent: number;
  spentLabel: string;
  cta: PocketCta;
  percent: number;
  status: PocketStatus;
  mascot: string;
  surfaceClass: string;
  amountClass: string;
  barClass: string;
}

export default function Wallet() {
  const {
    monthLabel,
    summary,
    separatedTotal,
    pockets,
    spendBreakdown,
    monthExpense,
    hasAnyData,
    hasMonthData,
  } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 lg:gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-muted text-sm">จัดสรรเงินเดือนนี้ · {monthLabel}</p>
        <h1 className="text-ink text-3xl font-semibold tracking-tight">
          กระเป๋าของฉัน
        </h1>
        <p className="text-muted max-w-2xl text-sm leading-6">
          แยกเงินเป็นกระเป๋าเล็ก ๆ ให้เห็นง่ายขึ้นว่าเงินส่วนไหนยังใช้ได้
          และส่วนไหนควรกันไว้
        </p>
      </header>

      <section
        aria-label="ภาพรวมเงินที่ใช้ได้"
        className="border-line bg-surface overflow-hidden rounded-lg border"
      >
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="bg-teal/10 flex flex-col gap-4 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-ink text-sm font-semibold">
                  เงินที่ยังใช้ได้
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
                  หลังหักรายจ่ายและเงินที่กันไว้ในเป้าหมายแล้ว
                </p>
              </div>
              <Button asChild className="w-full sm:w-auto" variant="teal">
                <Link to="/add">
                  <Plus className="h-4 w-4" />
                  บันทึกรายการ
                </Link>
              </Button>
            </div>

            <div className="border-line bg-surface rounded-md border p-3 sm:p-4">
              <p className="text-ink text-sm font-semibold">
                {getDailySafeTitle(summary.available, summary.daysLeft)}
              </p>
              <p className="text-muted mt-1 text-sm leading-6">
                {getDailySafeCopy(summary)}
              </p>
            </div>
          </div>

          <div className="border-line grid grid-cols-2 gap-0 border-t lg:border-t-0 lg:border-l">
            <SummaryTile
              label="รายรับเดือนนี้"
              value={fmtBaht(summary.monthIncome)}
              tone="teal"
            />
            <SummaryTile
              label="รายจ่ายเดือนนี้"
              value={fmtBaht(summary.monthExpense)}
              tone="coral"
            />
            <SummaryTile
              label="กันไว้ในเป้าหมาย"
              value={fmtBaht(summary.reserved)}
            />
            <SummaryTile
              label="แยกไว้ในกระเป๋า"
              value={fmtBaht(separatedTotal)}
            />
          </div>
        </div>
      </section>

      <section
        aria-label="รายการกระเป๋าย่อย"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {pockets.map((pocket) => (
          <PocketCard key={pocket.id} pocket={pocket} />
        ))}
      </section>

      {hasAnyData ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
          <SpendBreakdown
            rows={spendBreakdown}
            totalExpense={monthExpense}
            hasMonthData={hasMonthData}
          />
          <AdvicePanel summary={summary} />
        </div>
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
                  เริ่มจากรายการแรกก่อน
                </h2>
                <p className="text-muted mt-1 max-w-2xl text-sm leading-6">
                  เมื่อมีรายรับ รายจ่าย หรือเป้าหมายเก็บเงิน พอดีจะแยกภาพรวม
                  ให้เห็นว่าเงินส่วนไหนยังใช้ได้ และส่วนไหนควรกันไว้
                </p>
              </div>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <Link to="/add">
                บันทึกรายการ
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "teal" | "coral";
}) {
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
}

const statusMeta: Record<PocketStatus, { label: string; toneClass: string }> = {
  empty: { label: "ยังไม่ได้กันเงิน", toneClass: "bg-sky text-muted" },
  low: { label: "ใกล้หมด", toneClass: "bg-coral/10 text-coral" },
  over: { label: "ใช้เกินที่กันไว้", toneClass: "bg-coral/10 text-coral" },
  normal: { label: "กำลังพอดี", toneClass: "bg-teal/10 text-teal" },
};

function PocketCard({ pocket }: { pocket: PocketView }) {
  const status = statusMeta[pocket.status];

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
          <h2 className="text-ink text-base font-semibold">{pocket.title}</h2>
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              status.toneClass
            )}
          >
            {status.label}
          </span>
        </div>
        <p className="text-muted mt-1 text-sm leading-6">
          {pocket.description}
        </p>

        <div className="mt-auto pt-5">
          <p className="text-muted text-sm font-semibold">เหลือใช้ได้</p>
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
            <span className="text-muted">จาก {fmtBaht(pocket.target)}</span>
            <span className={cn("font-semibold", pocket.amountClass)}>
              {pocket.percent}%
            </span>
          </div>
          {pocket.spent > 0 ? (
            <p className="text-muted mt-2 text-xs">
              {pocket.spentLabel} {fmtBaht(pocket.spent)}
            </p>
          ) : null}

          <Button
            asChild
            variant="secondary"
            size="sm"
            className="mt-4 w-full justify-between"
          >
            <Link to={pocket.cta.to}>
              {pocket.cta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function SpendBreakdown({
  rows,
  totalExpense,
  hasMonthData,
}: {
  rows: Awaited<ReturnType<typeof loader>>["spendBreakdown"];
  totalExpense: number;
  hasMonthData: boolean;
}) {
  return (
    <section
      aria-label="เงินหายไปไหน"
      className="border-line bg-surface rounded-lg border"
    >
      <div className="border-line flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-ink text-base font-semibold">เงินหายไปไหน</h2>
          <p className="text-muted text-sm">หมวดที่ใช้เยอะที่สุดเดือนนี้</p>
        </div>
        <Link to="/history" className="text-muted hover:text-ink text-xs">
          เปิดประวัติ
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
                  ? "ยังไม่มีรายจ่ายเดือนนี้"
                  : "ยังไม่มีรายการเดือนนี้"}
              </p>
              <p className="text-muted mt-1 text-sm leading-6">
                เมื่อมีรายจ่าย พอดีจะเรียงหมวดที่ใช้เยอะสุดไว้ให้ดูตรงนี้
              </p>
            </div>
          </div>
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
                    <span className="text-muted shrink-0 text-xs tabular-nums">
                      {fmtBaht(row.amount)} · {pct}%
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
      </div>
    </section>
  );
}

function AdvicePanel({
  summary,
}: {
  summary: Awaited<ReturnType<typeof loader>>["summary"];
}) {
  const advice = getAdvice(summary);

  return (
    <aside
      aria-label="คำแนะนำจากพอดี"
      className="border-line bg-surface rounded-lg border lg:sticky lg:top-5"
    >
      <div className="border-line border-b px-4 py-3 sm:px-5">
        <h2 className="text-ink text-base font-semibold">คำแนะนำจากพอดี</h2>
      </div>
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <MascotTip mood={advice.mood} title={advice.title}>
          {advice.body}
        </MascotTip>
        <div className="border-line flex flex-col gap-2 border-t pt-4">
          <AdviceLink
            to="/add"
            icon={Plus}
            label="บันทึกรายการวันนี้"
            description="เพิ่มข้อมูลให้ภาพรวมกระเป๋าแม่นขึ้น"
          />
          <AdviceLink
            to="/goals"
            icon={Target}
            label="กันเงินเข้าเป้าหมาย"
            description="ย้ายเงินที่เหลือไปเก็บไว้ให้เรื่องสำคัญ"
          />
          <AdviceLink
            to="/history"
            icon={ListChecks}
            label="ตรวจรายการย้อนหลัง"
            description="ดูว่าหมวดไหนใช้เกินที่ตั้งใจไว้"
          />
        </div>
      </div>
    </aside>
  );
}

function AdviceLink({
  to,
  icon: Icon,
  label,
  description,
}: {
  to: string;
  icon: typeof Plus;
  label: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="border-line hover:bg-sky/60 focus-visible:ring-coral/40 flex items-center gap-3 rounded-sm border p-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <span className="border-line bg-surface text-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-xs border">
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

function getCategorySpend({
  categories,
  expenseByCategory,
  names,
}: {
  categories: Array<{ id: string; name: string }>;
  expenseByCategory: Map<string, number>;
  names: string[];
}) {
  const categoryIds = categories
    .filter((category) => names.some((name) => category.name.includes(name)))
    .map((category) => category.id);

  return categoryIds.reduce(
    (sum, categoryId) => sum + (expenseByCategory.get(categoryId) ?? 0),
    0
  );
}

function getPocketTarget(
  preferred: number,
  spent: number,
  available = 0
): number {
  return roundToHundred(Math.max(preferred, spent, available, 0));
}

function roundToHundred(amount: number): number {
  if (amount <= 0) return 0;
  return Math.ceil(amount / 100) * 100;
}

function getPocketStatus(
  amount: number,
  target: number,
  spent: number
): PocketStatus {
  if (target <= 0) return "empty";
  if (spent > target) return "over";
  if (amount / target <= 0.15) return "low";
  return "normal";
}

function getDailySafeTitle(available: number, daysLeft: number) {
  if (available < 0) return "เดือนนี้ใช้เกินไปแล้ว";
  return `เหลืออีก ${daysLeft} วันในเดือนนี้`;
}

function getDailySafeCopy(
  summary: Awaited<ReturnType<typeof loader>>["summary"]
) {
  if (summary.monthIncome === 0 && summary.monthExpense === 0) {
    return "เพิ่มรายรับและรายจ่ายเดือนนี้ก่อน แล้วพอดีจะช่วยเฉลี่ยเงินที่ใช้ได้ต่อวัน";
  }
  if (summary.available < 0) {
    return "เงินที่ใช้ได้ติดลบแล้ว ลองชะลอรายจ่าย หรือลดเงินที่กันไว้ในเป้าหมายลงก่อน";
  }
  return `ถ้าไม่อยากเกินเดือนนี้ ใช้เฉลี่ยได้ประมาณ ${fmtBaht(summary.dailySafe)} ต่อวัน`;
}

function getAdvice(summary: Awaited<ReturnType<typeof loader>>["summary"]): {
  mood: "normal" | "happy" | "saving" | "warning" | "thinking";
  title: string;
  body: string;
} {
  if (summary.monthIncome === 0 && summary.monthExpense === 0) {
    return {
      mood: "normal",
      title: "พอดีรอรายการแรกอยู่",
      body: "เริ่มจากรายรับหรือรายจ่ายที่จำได้ง่ายที่สุดก่อน เดี๋ยวกระเป๋าแต่ละใบจะค่อย ๆ ชัดขึ้นเอง",
    };
  }
  if (summary.monthIncome === 0) {
    return {
      mood: "thinking",
      title: "ยังไม่เห็นรายรับเดือนนี้",
      body: `ตอนนี้มีรายจ่าย ${fmtBaht(summary.monthExpense)} แล้ว เพิ่มรายรับเดือนนี้เพื่อให้พอดีจัดสรรกระเป๋าได้แม่นขึ้น`,
    };
  }
  if (summary.available < 0) {
    return {
      mood: "warning",
      title: "พอดีชวนชะลอก่อน",
      body: "เงินที่ใช้ได้ติดลบแล้ว ลองเปิดประวัติดูรายการใหญ่ล่าสุด หรือลดเงินที่กันไว้ในเป้าหมายลงก่อนเพิ่มรายจ่ายใหม่",
    };
  }
  if (summary.monthExpense > summary.monthIncome * 0.9) {
    return {
      mood: "thinking",
      title: "ใกล้เต็มงบเดือนนี้แล้ว",
      body: `ใช้ไปแล้ว ${fmtBaht(summary.monthExpense)} จากรายรับ ${fmtBaht(summary.monthIncome)} ลองชะลอหมวดที่ใช้บ่อยที่สุดสักหน่อย`,
    };
  }
  return {
    mood: "happy",
    title: "กระเป๋ายังพอดีอยู่",
    body: `ยังใช้ได้อีก ${fmtBaht(summary.available)} เดือนนี้ ถ้ามีเงินที่อยากกันไว้ ลองเติมเข้าเป้าหมายเล็ก ๆ ได้เลย`,
  };
}
