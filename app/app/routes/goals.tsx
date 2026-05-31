import {
  data,
  Form,
  redirect,
  useActionData,
  useLoaderData,
} from "react-router";
import type { Route } from "./+types/goals";
import { PiggyBank, PlusCircle, Target, WalletCards } from "lucide-react";
import { useState } from "react";
import { MascotState, MascotTip } from "~/components/brand/mascot-state";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { DatePicker } from "~/components/ui/date-picker";
import type { Goal } from "~/lib/db";
import { repo } from "~/lib/db";
import { requireUser } from "~/lib/auth.server";
import { cn } from "~/lib/cn";
import { fmtBaht } from "~/lib/format/baht";
import { dayValueToIso, todayDayValue } from "~/lib/date/day-value";
import { addContributionSchema, createGoalSchema } from "~/lib/validators/goal";

export function meta(_: Route.MetaArgs) {
  return [{ title: "พอดี — เป้าหมาย" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const goals = await repo.listGoals(user.id);
  return { goals };
}

interface ActionFieldErrors {
  name?: string;
  target?: string;
}

interface ContributionFieldErrors {
  amount?: string;
  goalId?: string;
  note?: string;
}

type ActionResult =
  | {
      ok: false;
      intent: "create";
      errors: ActionFieldErrors;
      values: Record<string, string>;
    }
  | {
      ok: false;
      intent: "contribute";
      errors: ContributionFieldErrors;
      values: Record<string, string>;
    }
  | undefined;

export async function action({
  request,
}: Route.ActionArgs): Promise<ActionResult | Response> {
  const user = await requireUser(request);
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "contribute") {
    const rawOccurredAt = form.get("occurredAt");
    const occurredAt = dayValueToIso(
      typeof rawOccurredAt === "string" ? rawOccurredAt : null
    );
    const raw = {
      goalId: form.get("goalId"),
      amount: form.get("amount"),
      note: form.get("note") ? String(form.get("note")) : null,
      ...(occurredAt ? { occurredAt } : {}),
    };

    const parsed = addContributionSchema.safeParse(raw);
    if (!parsed.success) {
      const errors: ContributionFieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "amount") {
          errors.amount = "จำนวนเติมต้องมากกว่า 0";
        }
        if (key === "goalId") {
          errors.goalId = "เลือกเป้าหมาย";
        }
        if (key === "note") {
          errors.note = issue.message;
        }
      }
      return {
        ok: false,
        intent: "contribute",
        errors,
        values: {
          goalId: String(raw.goalId ?? ""),
          amount: String(raw.amount ?? ""),
          note: String(raw.note ?? ""),
        },
      };
    }

    const goals = await repo.listGoals(user.id);
    if (!goals.some((goal) => goal.id === parsed.data.goalId)) {
      return {
        ok: false,
        intent: "contribute",
        errors: { goalId: "ไม่พบเป้าหมายนี้" },
        values: {
          goalId: parsed.data.goalId,
          amount: String(raw.amount ?? ""),
          note: String(raw.note ?? ""),
        },
      };
    }

    await repo.addContribution(user.id, parsed.data);
    return redirect("/goals");
  }

  if (intent !== null && intent !== "create") {
    throw data("คำสั่งไม่ถูกต้อง", { status: 400 });
  }

  const raw = {
    name: form.get("name"),
    target: form.get("target"),
  };

  const parsed = createGoalSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: ActionFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "name" || key === "target") {
        errors[key] = issue.message;
      }
    }
    return {
      ok: false,
      intent: "create",
      errors,
      values: {
        name: String(raw.name ?? ""),
        target: String(raw.target ?? ""),
      },
    };
  }

  await repo.createGoal(user.id, parsed.data);
  return redirect("/goals");
}

export default function Goals() {
  const { goals } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionResult>();
  const totalTarget = goals.reduce((sum, goal) => sum + goal.target, 0);
  const totalSaved = goals.reduce((sum, goal) => sum + goal.saved, 0);
  const totalRemaining = Math.max(0, totalTarget - totalSaved);
  const overallPct =
    totalTarget > 0
      ? Math.min(100, Math.round((totalSaved / totalTarget) * 100))
      : 0;
  const completedCount = goals.filter(
    (goal) => goal.saved >= goal.target
  ).length;
  const activeCount = goals.length - completedCount;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 lg:gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-ink text-3xl font-semibold tracking-tight">
          เป้าหมาย
        </h1>
        <p className="text-muted max-w-2xl text-sm leading-6">
          กันเงินไว้ให้เรื่องสำคัญ เห็นยอดรวม ยอดที่ยังขาด
          และเติมเงินเข้าแต่ละเป้าหมายได้จากหน้าเดียว
        </p>
      </header>

      <section
        aria-label="ภาพรวมเป้าหมาย"
        className="border-line bg-surface overflow-hidden rounded-lg border"
      >
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="bg-teal/10 p-4 sm:p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-ink text-sm font-semibold">
                  เก็บไว้แล้วทั้งหมด
                </p>
                <p className="text-teal mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
                  {fmtBaht(totalSaved)}
                </p>
                <p className="text-muted mt-2 text-sm">
                  จากเป้าหมายรวม {fmtBaht(totalTarget)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <img
                  alt=""
                  className="h-20 w-20 object-contain sm:h-24 sm:w-24"
                  loading="lazy"
                  src="/brand/mascots/saving.png"
                />
                <div className="text-right">
                  <p className="text-ink text-3xl font-semibold tabular-nums">
                    {overallPct}%
                  </p>
                  <p className="text-muted text-xs">ความคืบหน้ารวม</p>
                </div>
              </div>
            </div>
            <ProgressBar className="mt-5" pct={overallPct} />
          </div>

          <div className="border-line grid grid-cols-2 gap-0 border-t lg:border-t-0 lg:border-l">
            <SummaryTile
              icon={Target}
              label="เป้าหมายทั้งหมด"
              value={`${goals.length} รายการ`}
            />
            <SummaryTile
              icon={WalletCards}
              label="กำลังเก็บ"
              value={`${activeCount} รายการ`}
            />
            <SummaryTile
              icon={PiggyBank}
              label="ครบแล้ว"
              value={`${completedCount} รายการ`}
            />
            <SummaryTile
              icon={PlusCircle}
              label="ยังขาด"
              value={fmtBaht(totalRemaining)}
            />
          </div>
        </div>
      </section>

      <MascotTip
        mood={goals.length > 0 ? "saving" : "normal"}
        title={goals.length > 0 ? "พอดีเห็นเป้าหมายแล้ว" : "พอดีช่วยตั้งหลัก"}
      >
        {goals.length > 0
          ? `ตอนนี้กันเงินไว้แล้ว ${fmtBaht(totalSaved)} จากเป้าหมายรวม ${fmtBaht(totalTarget)} เติมทีละนิดก็ยังนับว่าเดินหน้า`
          : "เลือกเรื่องเดียวที่อยากกันเงินไว้ก่อน จำนวนไม่ต้องใหญ่ แค่ทำให้เริ่มเก็บง่ายขึ้น"}
      </MascotTip>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:items-start">
        <section
          aria-label="เป้าหมายที่กำลังเก็บ"
          className="border-line bg-surface rounded-lg border"
        >
          <div className="border-line flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
            <div>
              <h2 className="text-ink text-base font-semibold">
                เป้าหมายที่กำลังเก็บ
              </h2>
              <p className="text-muted text-sm">{goals.length} รายการ</p>
            </div>
            {goals.length > 0 ? (
              <span className="text-teal text-sm font-semibold tabular-nums">
                {overallPct}%
              </span>
            ) : null}
          </div>

          <div className="p-4 sm:p-5">
            {goals.length === 0 ? (
              <MascotState
                mood="saving"
                title="เริ่มจากเป้าหมายเล็ก ๆ ก่อนก็พอดี"
                description="เลือกเรื่องที่อยากกันเงินไว้ แล้วค่อยเติมทีละนิดตามจังหวะของคุณ"
              />
            ) : (
              <ul className="flex flex-col gap-3" data-testid="goals-list">
                {goals.map((goal) => (
                  <GoalItem actionData={actionData} goal={goal} key={goal.id} />
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="border-line bg-surface rounded-lg border 2xl:sticky 2xl:top-5">
          <div className="border-line border-b px-4 py-3 sm:px-5">
            <h2 className="text-ink text-base font-semibold">เพิ่มเป้าหมาย</h2>
            <p className="text-muted text-sm">
              ตั้งชื่อสั้น ๆ และจำนวนเงินที่อยากกันไว้
            </p>
          </div>
          <Form
            key={goals.length}
            method="post"
            className="flex flex-col gap-4 p-4 sm:p-5"
          >
            <input type="hidden" name="intent" value="create" />
            <div className="border-line bg-sky/45 rounded-md border p-3">
              <p className="text-ink text-sm font-semibold">พอดีแนะนำ</p>
              <p className="text-muted mt-1 text-sm leading-6">
                ชื่อเป้าหมายควรจำได้ทันที เช่น กองทุนฉุกเฉิน หรือค่าทริป
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-name">ชื่อเป้าหมาย</Label>
              <Input
                id="goal-name"
                name="name"
                defaultValue={
                  actionData?.intent === "create" ? actionData.values.name : ""
                }
                placeholder="กองทุนฉุกเฉิน"
                required
              />
              {actionData?.intent === "create" && actionData.errors.name && (
                <p className="text-coral-strong text-sm">
                  {actionData.errors.name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-target">จำนวนเงินเป้าหมาย (บาท)</Label>
              <Input
                id="goal-target"
                name="target"
                type="number"
                inputMode="decimal"
                step="0.01"
                defaultValue={
                  actionData?.intent === "create"
                    ? actionData.values.target
                    : ""
                }
                placeholder="5000"
                required
              />
              {actionData?.intent === "create" && actionData.errors.target && (
                <p className="text-coral-strong text-sm">
                  {actionData.errors.target}
                </p>
              )}
            </div>

            <Button type="submit">เพิ่มเป้าหมาย</Button>
          </Form>
        </aside>
      </div>
    </div>
  );
}

function GoalItem({
  actionData,
  goal,
}: {
  actionData: ActionResult;
  goal: Goal;
}) {
  const pct =
    goal.target > 0
      ? Math.min(100, Math.round((goal.saved / goal.target) * 100))
      : 0;
  const remaining = Math.max(0, goal.target - goal.saved);
  const isComplete = pct >= 100;
  const hasContributionError =
    actionData?.intent === "contribute" && actionData.values.goalId === goal.id;
  const [occurredDate, setOccurredDate] = useState(todayDayValue());

  return (
    <li className="border-line rounded-md border">
      <article className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_17rem] md:items-end 2xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-ink truncate text-base font-semibold">
                {goal.name}
              </p>
              <p className="text-muted mt-1 text-sm">
                {isComplete
                  ? "ครบเป้าหมายแล้ว"
                  : `ขาดอีก ${fmtBaht(remaining)}`}
              </p>
            </div>
            <span
              className={cn(
                "inline-flex h-8 shrink-0 items-center rounded-xs px-3 text-sm font-semibold tabular-nums",
                isComplete ? "bg-lime/50 text-ink" : "bg-teal/10 text-teal"
              )}
            >
              {pct}%
            </span>
          </div>

          <ProgressBar className="mt-4" pct={pct} complete={isComplete} />

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <GoalMetric
              label="เก็บแล้ว"
              value={fmtBaht(goal.saved)}
              tone="teal"
            />
            <GoalMetric label="เป้าหมาย" value={fmtBaht(goal.target)} />
            <GoalMetric
              label={isComplete ? "เกินเป้า" : "ยังขาด"}
              value={fmtBaht(
                isComplete ? Math.max(0, goal.saved - goal.target) : remaining
              )}
            />
          </div>
        </div>

        <Form
          key={`${goal.id}-${goal.saved}`}
          method="post"
          className="border-line bg-sky/35 flex flex-col gap-3 rounded-md border p-3"
        >
          <input type="hidden" name="intent" value="contribute" />
          <input type="hidden" name="goalId" value={goal.id} />
          <input type="hidden" name="occurredAt" value={occurredDate} />
          <div className="flex flex-col gap-2">
            <Label htmlFor={`goal-${goal.id}-amount`}>เติมเงินเข้าเป้า</Label>
            <Input
              id={`goal-${goal.id}-amount`}
              name="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="500"
              defaultValue={
                hasContributionError ? actionData.values.amount : ""
              }
              required
            />
            {hasContributionError && actionData.errors.amount && (
              <p className="text-coral-strong text-sm">
                {actionData.errors.amount}
              </p>
            )}
            {hasContributionError && actionData.errors.goalId && (
              <p className="text-coral-strong text-sm">
                {actionData.errors.goalId}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`goal-${goal.id}-note`}>โน้ต</Label>
            <Input
              id={`goal-${goal.id}-note`}
              name="note"
              placeholder="เช่น เงินเหลือวันนี้"
              defaultValue={hasContributionError ? actionData.values.note : ""}
            />
            {hasContributionError && actionData.errors.note && (
              <p className="text-coral-strong text-sm">
                {actionData.errors.note}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`goal-${goal.id}-date`}>วันที่เติมเงิน</Label>
            <DatePicker
              id={`goal-${goal.id}-date`}
              value={occurredDate}
              max={todayDayValue()}
              onChange={setOccurredDate}
            />
          </div>
          <Button type="submit" variant="teal" className="w-full">
            บันทึกเงินเข้าเป้า
          </Button>
        </Form>
      </article>
    </li>
  );
}

function ProgressBar({
  className,
  complete = false,
  pct,
}: {
  className?: string;
  complete?: boolean;
  pct: number;
}) {
  return (
    <div
      className={cn(
        "bg-line/70 h-2.5 w-full overflow-hidden rounded-xs",
        className
      )}
      aria-label={`คืบหน้า ${pct}%`}
    >
      <div
        className={cn("h-full rounded-xs", complete ? "bg-lime" : "bg-teal")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value: string;
}) {
  return (
    <div className="border-line flex min-h-24 flex-col justify-between border-r border-b p-4 even:border-r-0 sm:p-5">
      <Icon className="text-coral h-4 w-4" />
      <div>
        <p className="text-muted text-xs">{label}</p>
        <p className="text-ink mt-1 text-base font-semibold tabular-nums">
          {value}
        </p>
      </div>
    </div>
  );
}

function GoalMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "teal";
  value: string;
}) {
  return (
    <div className="border-line rounded-xs border px-3 py-2">
      <p className="text-muted text-xs">{label}</p>
      <p
        className={cn(
          "mt-1 text-sm font-semibold whitespace-nowrap tabular-nums",
          tone === "teal" ? "text-teal" : "text-ink"
        )}
      >
        {value}
      </p>
    </div>
  );
}
