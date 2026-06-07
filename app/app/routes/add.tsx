import { useMemo, useState } from "react";
import { Form, redirect, useActionData, useLoaderData } from "react-router";
import type { Route } from "./+types/add";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { DiscountAmountField } from "~/components/transactions/discount-amount-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { DatePicker } from "~/components/ui/date-picker";
import { MascotTip } from "~/components/brand/mascot-state";
import { cn } from "~/lib/cn";
import {
  dayValueToIso,
  formatDayLabel,
  todayDayValue,
} from "~/lib/date/day-value";
import { repo } from "~/lib/db";
import type { Category, TransactionKind } from "~/lib/db";
import { requireUser } from "~/lib/auth.server";
import {
  createTransactionSchema,
  getTransactionDiscountState,
} from "~/lib/validators/transaction";
import { parseQuickEntry } from "~/lib/parse/quick-entry";
import { fmtNumber } from "~/lib/format/number";
import { usePordeeTranslation } from "~/lib/i18n/provider";

const NO_CATEGORY_VALUE = "__none__";

export const meta = (_: Route.MetaArgs) => {
  return [{ title: "พอดี — บันทึกรายการ" }];
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await requireUser(request);
  const categories = await repo.listCategories(user.id);
  return { categories };
};

interface ActionFieldErrors {
  title?: string;
  amount?: string;
  discountAmount?: string;
  kind?: string;
}

type ActionResult =
  | { ok: false; errors: ActionFieldErrors; values: Record<string, string> }
  | undefined;

export const action = async ({
  request,
}: Route.ActionArgs): Promise<ActionResult | Response> => {
  const user = await requireUser(request);
  const form = await request.formData();
  const categoryId = form.get("categoryId");
  const rawKind = form.get("kind");
  const rawAmount = form.get("amount");
  const rawDiscountAmount = form.get("discountAmount");
  const discountState = getTransactionDiscountState({
    kind: rawKind,
    amount: rawAmount,
    discountAmount: rawDiscountAmount,
  });
  const errors: ActionFieldErrors = {};

  if (discountState.discountError) {
    errors.discountAmount = discountState.discountError;
  }

  const rawDate = form.get("occurredAt");
  const occurredAt = dayValueToIso(
    typeof rawDate === "string" ? rawDate : null
  );

  const raw = {
    kind: rawKind,
    title: form.get("title"),
    amount: discountState.canUseNetAmount ? discountState.netAmount : rawAmount,
    categoryId:
      typeof categoryId === "string" && categoryId !== NO_CATEGORY_VALUE
        ? categoryId
        : null,
    note: form.get("note") || null,
    ...(occurredAt ? { occurredAt } : {}),
  };

  const parsed = createTransactionSchema.safeParse(raw);
  if (!parsed.success || Object.keys(errors).length > 0) {
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "title" || key === "amount" || key === "kind") {
          errors[key] = issue.message;
        }
      }
    }
    return {
      ok: false,
      errors,
      values: {
        kind: String(raw.kind ?? "expense"),
        title: String(raw.title ?? ""),
        amount: String(rawAmount ?? ""),
        discountAmount: String(rawDiscountAmount ?? ""),
        categoryId: String(categoryId ?? NO_CATEGORY_VALUE),
        note: String(form.get("note") ?? ""),
        occurredAt: typeof rawDate === "string" ? rawDate : "",
      },
    };
  }

  await repo.createTransaction(user.id, {
    kind: parsed.data.kind,
    title: parsed.data.title,
    amount: parsed.data.amount,
    categoryId: parsed.data.categoryId,
    note: parsed.data.note,
    occurredAt: parsed.data.occurredAt,
  });

  return redirect("/history");
};

const QUICK_EXAMPLES = [
  "add.example.coffee",
  "add.example.lunch",
  "add.example.fare",
];

const Add = () => {
  const { categories } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionResult>();
  const t = usePordeeTranslation();

  const [quick, setQuick] = useState(actionData?.values?.title ?? "");
  const preview = useMemo(() => parseQuickEntry(quick), [quick]);

  const [amountOverride, setAmountOverride] = useState<string | null>(
    actionData?.values?.amount ?? null
  );
  const [discountAmount, setDiscountAmount] = useState(
    actionData?.values?.discountAmount ?? ""
  );
  const [kindOverride, setKindOverride] = useState<"expense" | "income" | null>(
    null
  );
  const [categoryOverride, setCategoryOverride] = useState<string | null>(null);
  const [occurredDate, setOccurredDate] = useState(
    actionData?.values?.occurredAt || todayDayValue()
  );

  const effectiveKind = kindOverride ?? preview.kind;
  const effectiveAmount =
    amountOverride !== null
      ? amountOverride
      : preview.amount !== null
        ? String(preview.amount)
        : "";

  const filteredCategories = categories.filter((c) => c.kind === effectiveKind);
  const inferredCategory = preview.categoryName
    ? (filteredCategories.find((c) => c.name === preview.categoryName)?.id ??
      null)
    : null;
  const effectiveCategory =
    categoryOverride !== null ? categoryOverride : inferredCategory;
  const amountNumber = Number(effectiveAmount);
  const discountState = getTransactionDiscountState({
    kind: effectiveKind,
    amount: effectiveAmount,
    discountAmount,
  });
  const { discountNumber, hasDiscountInput, hasValidDiscount, netAmount } =
    discountState;
  const canSubmit =
    preview.title.trim().length > 0 &&
    Number.isFinite(amountNumber) &&
    amountNumber > 0 &&
    hasValidDiscount &&
    netAmount > 0;
  const entryHint =
    quick.trim().length === 0
      ? t("add.quick.hint.empty")
      : preview.amount === null
        ? t("add.quick.hint.missingAmount")
        : null;
  const previewTitle =
    preview.title.trim().length > 0
      ? preview.title.trim()
      : t("transaction.fallbackTitle");
  const selectedCategoryName =
    filteredCategories.find((c) => c.id === effectiveCategory)?.name ??
    t("transaction.noCategory");
  const previewDescription =
    preview.amount !== null
      ? t("add.preview.description.parsed", {
          title: previewTitle,
          kind: t(
            effectiveKind === "income"
              ? "transaction.kind.income"
              : "transaction.kind.expense"
          ),
          amount: effectiveAmount,
        })
      : t("add.preview.description.empty");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-ink text-2xl font-semibold">{t("add.title")}</h1>
          <p className="text-muted text-sm">{t("add.description")}</p>
        </div>
        <StepRail
          currentStep={canSubmit ? 3 : preview.amount !== null ? 2 : 1}
        />
      </div>

      <Form method="post" className="contents">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <StepNumber>1</StepNumber>
              <CardTitle>{t("add.step.quick.title")}</CardTitle>
            </div>
            <CardDescription>{t("add.step.quick.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Label htmlFor="quick-entry">{t("transaction.title.label")}</Label>
            <Input
              id="quick-entry"
              value={quick}
              onChange={(e) => {
                setQuick(e.target.value);
                setAmountOverride(null);
                setKindOverride(null);
                setCategoryOverride(null);
              }}
              placeholder={t("add.quick.placeholder")}
              autoComplete="off"
              aria-describedby="quick-entry-hint"
            />
            <input type="hidden" name="title" value={preview.title} />
            <div className="flex flex-wrap gap-2">
              {QUICK_EXAMPLES.map((exampleId) => {
                const example = t(exampleId);
                return (
                  <Button
                    key={exampleId}
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setQuick(example);
                      setAmountOverride(null);
                      setKindOverride(null);
                      setCategoryOverride(null);
                    }}
                  >
                    {example}
                  </Button>
                );
              })}
            </div>
            {actionData && !actionData.ok && actionData.errors.title && (
              <p className="text-coral-strong text-sm">
                {t(actionData.errors.title)}
              </p>
            )}
            {entryHint && (
              <p id="quick-entry-hint" className="text-muted text-sm">
                {entryHint}
              </p>
            )}
            <MascotTip
              mood={preview.amount !== null ? "thinking" : "normal"}
              title={t("add.mascot.title")}
            >
              {previewDescription}
            </MascotTip>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <StepNumber>2</StepNumber>
              <CardTitle>{t("add.step.review.title")}</CardTitle>
            </div>
            <CardDescription>
              {t("add.step.review.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ParsedPreview
              amount={effectiveAmount}
              categoryName={selectedCategoryName}
              dateLabel={formatDayLabel(occurredDate)}
              discountAmount={
                effectiveKind === "expense" && discountNumber > 0
                  ? discountNumber
                  : 0
              }
              kind={effectiveKind}
              netAmount={netAmount}
              title={previewTitle}
            />
            <div className="border-line bg-surface rounded-md border p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-ink text-sm font-semibold">
                    {t("transaction.kind.label")}
                  </p>
                  <p className="text-muted mt-1 text-sm">
                    {t("add.kind.description")}
                  </p>
                </div>
                <Badge
                  tone={effectiveKind === "income" ? "teal" : "coral"}
                  className="w-fit"
                >
                  {t("transaction.kind.savingAs", {
                    kind: t(
                      effectiveKind === "income"
                        ? "transaction.kind.income"
                        : "transaction.kind.expense"
                    ),
                  })}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <KindToggle
                  active={effectiveKind === "expense"}
                  tone="coral"
                  onClick={() => {
                    setKindOverride("expense");
                    setCategoryOverride(null);
                  }}
                >
                  {t("transaction.kind.expense")}
                </KindToggle>
                <KindToggle
                  active={effectiveKind === "income"}
                  tone="teal"
                  onClick={() => {
                    setKindOverride("income");
                    setCategoryOverride(null);
                  }}
                >
                  {t("transaction.kind.income")}
                </KindToggle>
              </div>
            </div>
            <input type="hidden" name="kind" value={effectiveKind} />

            <div
              className={cn(
                "grid gap-4",
                effectiveKind === "expense"
                  ? "lg:grid-cols-3"
                  : "lg:grid-cols-2"
              )}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="amount">
                  {effectiveKind === "expense"
                    ? t("transaction.amount.beforeDiscount")
                    : t("transaction.amount.label")}
                </Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={effectiveAmount}
                  onChange={(e) => setAmountOverride(e.target.value)}
                  placeholder="0"
                  aria-describedby="amount-hint"
                  required
                />
                {actionData && !actionData.ok && actionData.errors.amount && (
                  <p className="text-coral-strong text-sm">
                    {t(actionData.errors.amount)}
                  </p>
                )}
                {!canSubmit && (
                  <p id="amount-hint" className="text-muted text-sm">
                    {t("transaction.amount.hint.required")}
                  </p>
                )}
              </div>

              {effectiveKind === "expense" && (
                <DiscountAmountField
                  value={discountAmount}
                  onChange={setDiscountAmount}
                  error={
                    actionData && !actionData.ok
                      ? actionData.errors.discountAmount
                      : undefined
                  }
                  hasDiscountInput={hasDiscountInput}
                  hasValidDiscount={hasValidDiscount}
                  netAmount={netAmount}
                />
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="category">
                  {t("transaction.category.label")}
                </Label>
                <Select
                  name="categoryId"
                  value={effectiveCategory ?? NO_CATEGORY_VALUE}
                  onValueChange={(value) =>
                    setCategoryOverride(
                      value === NO_CATEGORY_VALUE ? null : value
                    )
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder={t("transaction.noCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY_VALUE}>
                      {t("transaction.noCategory")}
                    </SelectItem>
                    {filteredCategories.map((c: Category) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:max-w-xs">
              <Label htmlFor="occurredAt">{t("transaction.date.label")}</Label>
              <DatePicker
                id="occurredAt"
                value={occurredDate}
                max={todayDayValue()}
                onChange={setOccurredDate}
                showPresets
                aria-describedby="occurred-hint"
              />
              <input type="hidden" name="occurredAt" value={occurredDate} />
              <p id="occurred-hint" className="text-muted text-sm">
                {t("add.date.hint")}
              </p>
            </div>

            <div className="border-line bg-sky/35 flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <StepNumber>3</StepNumber>
                  <p className="text-ink text-sm font-semibold">
                    {t("add.submit.title")}
                  </p>
                </div>
                <p className="text-muted mt-1 text-sm">
                  {canSubmit
                    ? t("add.submit.ready", {
                        title: previewTitle,
                        amount: fmtNumber(netAmount),
                      })
                    : t("add.submit.disabledHint")}
                </p>
              </div>
              <Button type="submit" disabled={!canSubmit} className="sm:w-44">
                {t("add.submit.button")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Form>
    </div>
  );
};

export default Add;

const StepRail = ({ currentStep }: { currentStep: number }) => {
  const t = usePordeeTranslation();
  const steps = [
    t("add.step.quick.title"),
    t("add.step.review.title"),
    t("add.step.save.short"),
  ];
  return (
    <ol className="grid grid-cols-3 gap-2">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber <= currentStep;
        return (
          <li
            key={step}
            className={cn(
              "border-line bg-surface flex min-w-0 items-center gap-1.5 rounded-sm border px-2 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm",
              isActive ? "text-ink" : "text-muted"
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold sm:h-6 sm:w-6",
                isActive ? "bg-ink text-surface" : "bg-sky text-muted"
              )}
            >
              {stepNumber}
            </span>
            <span className="truncate">{step}</span>
          </li>
        );
      })}
    </ol>
  );
};

const StepNumber = ({ children }: { children: React.ReactNode }) => {
  return (
    <span className="bg-ink text-surface flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
      {children}
    </span>
  );
};

const ParsedPreview = ({
  amount,
  categoryName,
  dateLabel,
  discountAmount,
  kind,
  netAmount,
  title,
}: {
  amount: string;
  categoryName: string;
  dateLabel: string;
  discountAmount: number;
  kind: TransactionKind;
  netAmount: number;
  title: string;
}) => {
  const t = usePordeeTranslation();
  const hasAmount = Number(amount) > 0;
  const displayAmount =
    hasAmount && kind === "expense" && discountAmount > 0
      ? netAmount
      : Number(amount);
  return (
    <div className="border-line bg-sky/45 rounded-md border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <MascotTip
          mood={hasAmount ? "happy" : "thinking"}
          title={
            hasAmount
              ? t("add.parsedPreview.readyTitle")
              : t("add.parsedPreview.waitingTitle")
          }
          className="border-0 bg-transparent p-0 sm:max-w-md"
        >
          {hasAmount
            ? t("add.parsedPreview.readyDescription")
            : t("add.parsedPreview.waitingDescription")}
        </MascotTip>
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:w-80">
          <PreviewChip label={t("transaction.kind.label")}>
            {t(
              kind === "income"
                ? "transaction.kind.income"
                : "transaction.kind.expense"
            )}
          </PreviewChip>
          <PreviewChip label={t("transaction.amount.label")}>
            {hasAmount
              ? t("currency.baht.compact", { amount: fmtNumber(displayAmount) })
              : t("transaction.amount.waiting")}
          </PreviewChip>
          {kind === "expense" && discountAmount > 0 ? (
            <PreviewChip label={t("transaction.discount.label")}>
              {t("currency.baht.compact", {
                amount: fmtNumber(discountAmount),
              })}
            </PreviewChip>
          ) : null}
          <PreviewChip label={t("transaction.title.label")}>
            {title}
          </PreviewChip>
          <PreviewChip label={t("transaction.category.label")}>
            {categoryName}
          </PreviewChip>
          <PreviewChip label={t("transaction.date.label")}>
            {dateLabel}
          </PreviewChip>
        </div>
      </div>
    </div>
  );
};

const PreviewChip = ({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) => {
  return (
    <div className="border-line bg-surface min-w-0 rounded-xs border px-3 py-2">
      <p className="text-muted text-xs">{label}</p>
      <p className="text-ink truncate text-sm font-semibold">{children}</p>
    </div>
  );
};

const KindToggle = ({
  active,
  onClick,
  tone,
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone: "coral" | "teal";
  children: React.ReactNode;
}) => {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-11 w-full rounded-xs px-3 text-sm",
        active && tone === "coral"
          ? "border-coral bg-coral hover:bg-coral-strong text-white"
          : active && tone === "teal"
            ? "border-teal bg-teal hover:bg-teal-strong text-white"
            : "border-line text-muted hover:bg-sky"
      )}
    >
      {children}
    </Button>
  );
};
