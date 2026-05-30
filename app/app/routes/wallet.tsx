import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/wallet";
import { ArrowRight, Plus } from "lucide-react";
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
      content: "แยกเงินเป็นกระเป๋าย่อย เพื่อดูเงินที่ยังใช้ได้ง่ายขึ้น",
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

  let totalIncome = 0;
  let totalExpense = 0;
  let monthIncome = 0;
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

    const categoryId = transaction.categoryId ?? "uncategorized";
    monthExpenseByCategory.set(
      categoryId,
      (monthExpenseByCategory.get(categoryId) ?? 0) + transaction.amount
    );
  }

  const reserved = goals.reduce((sum, goal) => sum + goal.saved, 0);
  const reserveTarget = goals.reduce((sum, goal) => sum + goal.target, 0);
  const available = totalIncome - totalExpense - reserved;

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
  const dailyRemaining = Math.max(0, available - travelRemaining - billsRemaining);
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
      mascot: "/brand/mascots/normal.png",
      surfaceClass: "bg-[#FFF1D3]",
      amountClass: "text-[#8A5A0A]",
      barClass: "bg-[#F4B640]",
    },
    {
      id: "bills",
      title: "เตรียมจ่ายบิล",
      description: "แยกเงินไว้ก่อนถึงวันจ่ายจริง",
      amount: billsRemaining,
      target: billsTarget,
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
      mascot: "/brand/mascots/saving.png",
      surfaceClass: "bg-[#EAF2F3]",
      amountClass: "text-[#235C72]",
      barClass: "bg-[#8CBFD0]",
    },
  ];

  return {
    separatedTotal: pockets.reduce((sum, pocket) => sum + pocket.amount, 0),
    pockets: pockets.map((pocket) => ({
      ...pocket,
      percent:
        pocket.target > 0
          ? Math.min(100, Math.round((pocket.amount / pocket.target) * 100))
          : 0,
    })),
    hasAnyData: allTx.length > 0 || goals.length > 0,
  };
}

export default function Wallet() {
  const { separatedTotal, pockets, hasAnyData } =
    useLoaderData<typeof loader>();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 lg:gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-ink text-3xl font-semibold tracking-tight">
          กระเป๋าของฉัน
        </h1>
        <p className="text-muted text-sm">
          แยกเงินเป็นกระเป๋าเล็ก ๆ ให้เห็นง่ายขึ้น
        </p>
      </header>

      <section
        aria-label="เงินที่แยกไว้ในกระเป๋า"
        className="border-line bg-teal/10 rounded-lg border p-4 sm:p-5"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-ink text-sm font-semibold">
              เงินที่แยกไว้ในกระเป๋า
            </p>
            <p className="text-teal mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
              {fmtBaht(separatedTotal)}
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto" variant="teal">
            <Link to="/goals">
              <Plus className="h-4 w-4" />
              เพิ่มกระเป๋า
            </Link>
          </Button>
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

      {!hasAnyData ? (
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
      ) : null}
    </div>
  );
}

function PocketCard({
  pocket,
}: {
  pocket: {
    title: string;
    description: string;
    amount: number;
    target: number;
    percent: number;
    mascot: string;
    surfaceClass: string;
    amountClass: string;
    barClass: string;
  };
}) {
  return (
    <article className="border-line bg-surface overflow-hidden rounded-lg border">
      <div
        className={cn(
          "flex h-32 items-center justify-center sm:h-36",
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

      <div className="flex min-h-48 flex-col p-4">
        <div>
          <h2 className="text-ink text-base font-semibold">{pocket.title}</h2>
          <p className="text-muted mt-1 text-sm leading-6">
            {pocket.description}
          </p>
        </div>

        <div className="mt-auto pt-6">
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
        </div>
      </div>
    </article>
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
