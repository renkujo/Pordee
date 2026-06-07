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
import { usePordeeTranslation } from "~/lib/i18n/provider";

export const meta = (_: Route.MetaArgs) => {
  return [{ title: "พอดี — เป้าหมาย" }];
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await requireUser(request);
  const goals = await repo.listGoals(user.id);
  return { goals };
};

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

export const action = async ({
  request,
}: Route.ActionArgs): Promise<ActionResult | Response> => {
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
          errors.amount = "goal.error.contributionAmountPositive";
        }
        if (key === "goalId") {
          errors.goalId = "goal.error.selectGoal";
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
        errors: { goalId: "goal.error.notFound" },
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
};

const Goals = () => {
  const { goals } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionResult>();
  const t = usePordeeTranslation();
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
          {t("goals.title")}
        </h1>
        <p className="text-muted max-w-2xl text-sm leading-6">
          {t("goals.description")}
        </p>
      </header>

      <section
        aria-label={t("goals.summary.ariaLabel")}
        className="border-line bg-surface overflow-hidden rounded-lg border"
      >
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="bg-teal/10 p-4 sm:p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-ink text-sm font-semibold">
                  {t("goals.summary.saved")}
                </p>
                <p className="text-teal mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
                  {fmtBaht(totalSaved)}
                </p>
                <p className="text-muted mt-2 text-sm">
                  {t("goals.summary.fromTotal", {
                    amount: fmtBaht(totalTarget),
                  })}
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
                  <p className="text-muted text-xs">
                    {t("goals.summary.overallProgress")}
                  </p>
                </div>
              </div>
            </div>
            <ProgressBar className="mt-5" pct={overallPct} />
          </div>

          <div className="border-line grid grid-cols-2 gap-0 border-t lg:border-t-0 lg:border-l">
            <SummaryTile
              icon={Target}
              label={t("goals.summary.totalGoals")}
              value={t("common.itemCount", { count: goals.length })}
            />
            <SummaryTile
              icon={WalletCards}
              label={t("goals.summary.active")}
              value={t("common.itemCount", { count: activeCount })}
            />
            <SummaryTile
              icon={PiggyBank}
              label={t("goals.summary.completed")}
              value={t("common.itemCount", { count: completedCount })}
            />
            <SummaryTile
              icon={PlusCircle}
              label={t("goals.summary.remaining")}
              value={fmtBaht(totalRemaining)}
            />
          </div>
        </div>
      </section>

      <MascotTip
        mood={goals.length > 0 ? "saving" : "normal"}
        title={
          goals.length > 0
            ? t("goals.mascot.hasGoalsTitle")
            : t("goals.mascot.emptyTitle")
        }
      >
        {goals.length > 0
          ? t("goals.mascot.hasGoalsDescription", {
              saved: fmtBaht(totalSaved),
              target: fmtBaht(totalTarget),
            })
          : t("goals.mascot.emptyDescription")}
      </MascotTip>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:items-start">
        <section
          aria-label={t("goals.list.ariaLabel")}
          className="border-line bg-surface rounded-lg border"
        >
          <div className="border-line flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
            <div>
              <h2 className="text-ink text-base font-semibold">
                {t("goals.list.title")}
              </h2>
              <p className="text-muted text-sm">
                {t("common.itemCount", { count: goals.length })}
              </p>
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
                title={t("goals.empty.title")}
                description={t("goals.empty.description")}
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
            <h2 className="text-ink text-base font-semibold">
              {t("goals.create.title")}
            </h2>
            <p className="text-muted text-sm">
              {t("goals.create.description")}
            </p>
          </div>
          <Form
            key={goals.length}
            method="post"
            className="flex flex-col gap-4 p-4 sm:p-5"
          >
            <input type="hidden" name="intent" value="create" />
            <div className="border-line bg-sky/45 rounded-md border p-3">
              <p className="text-ink text-sm font-semibold">
                {t("goals.create.tipTitle")}
              </p>
              <p className="text-muted mt-1 text-sm leading-6">
                {t("goals.create.tipDescription")}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-name">{t("goals.create.nameLabel")}</Label>
              <Input
                id="goal-name"
                name="name"
                defaultValue={
                  actionData?.intent === "create" ? actionData.values.name : ""
                }
                placeholder={t("goals.create.namePlaceholder")}
                required
              />
              {actionData?.intent === "create" && actionData.errors.name && (
                <p className="text-coral-strong text-sm">
                  {t(actionData.errors.name)}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-target">
                {t("goals.create.targetLabel")}
              </Label>
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
                  {t(actionData.errors.target)}
                </p>
              )}
            </div>

            <Button type="submit">{t("goals.create.submit")}</Button>
          </Form>
        </aside>
      </div>
    </div>
  );
};

export default Goals;

const GoalItem = ({
  actionData,
  goal,
}: {
  actionData: ActionResult;
  goal: Goal;
}) => {
  const pct =
    goal.target > 0
      ? Math.min(100, Math.round((goal.saved / goal.target) * 100))
      : 0;
  const remaining = Math.max(0, goal.target - goal.saved);
  const isComplete = pct >= 100;
  const hasContributionError =
    actionData?.intent === "contribute" && actionData.values.goalId === goal.id;
  const [occurredDate, setOccurredDate] = useState(todayDayValue());
  const t = usePordeeTranslation();

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
                  ? t("goals.item.complete")
                  : t("goals.item.remaining", { amount: fmtBaht(remaining) })}
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
              label={t("goals.metric.saved")}
              value={fmtBaht(goal.saved)}
              tone="teal"
            />
            <GoalMetric
              label={t("goals.metric.target")}
              value={fmtBaht(goal.target)}
            />
            <GoalMetric
              label={
                isComplete ? t("goals.metric.extra") : t("goals.metric.gap")
              }
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
            <Label htmlFor={`goal-${goal.id}-amount`}>
              {t("goals.contribution.amountLabel")}
            </Label>
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
                {t(actionData.errors.amount)}
              </p>
            )}
            {hasContributionError && actionData.errors.goalId && (
              <p className="text-coral-strong text-sm">
                {t(actionData.errors.goalId)}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`goal-${goal.id}-note`}>
              {t("goals.contribution.noteLabel")}
            </Label>
            <Input
              id={`goal-${goal.id}-note`}
              name="note"
              placeholder={t("goals.contribution.notePlaceholder")}
              defaultValue={hasContributionError ? actionData.values.note : ""}
            />
            {hasContributionError && actionData.errors.note && (
              <p className="text-coral-strong text-sm">
                {t(actionData.errors.note)}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`goal-${goal.id}-date`}>
              {t("goals.contribution.dateLabel")}
            </Label>
            <DatePicker
              id={`goal-${goal.id}-date`}
              value={occurredDate}
              max={todayDayValue()}
              onChange={setOccurredDate}
            />
          </div>
          <Button type="submit" variant="teal" className="w-full">
            {t("goals.contribution.submit")}
          </Button>
        </Form>
      </article>
    </li>
  );
};

const ProgressBar = ({
  className,
  complete = false,
  pct,
}: {
  className?: string;
  complete?: boolean;
  pct: number;
}) => {
  const t = usePordeeTranslation();

  return (
    <div
      className={cn(
        "bg-line/70 h-2.5 w-full overflow-hidden rounded-xs",
        className
      )}
      aria-label={t("goals.progress.ariaLabel", { pct })}
    >
      <div
        className={cn("h-full rounded-xs", complete ? "bg-lime" : "bg-teal")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

const SummaryTile = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value: string;
}) => {
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
};

const GoalMetric = ({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "teal";
  value: string;
}) => {
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
};
