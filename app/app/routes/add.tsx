import { useMemo, useState } from "react";
import { Form, redirect, useActionData, useLoaderData } from "react-router";
import type { Route } from "./+types/add";
import {
  Banknote,
  Bus,
  CalendarDays,
  Check,
  CircleEllipsis,
  Coffee,
  ReceiptText,
  Repeat2,
  ShoppingBasket,
  StickyNote,
  Utensils,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { DatePicker } from "~/components/ui/date-picker";
import { cn } from "~/lib/cn";
import {
  dayValueToIso,
  formatDayLabel,
  todayDayValue,
} from "~/lib/date/day-value";
import { repo } from "~/lib/db";
import type { Category } from "~/lib/db";
import { requireUser } from "~/lib/auth.server";
import {
  createTransactionSchema,
  getTransactionDiscountState,
  recurringTemplateSchema,
} from "~/lib/validators/transaction";
import { parseQuickEntry } from "~/lib/parse/quick-entry";
import { fmtNumber } from "~/lib/format/number";
import { usePordeeLocale, usePordeeTranslation } from "~/lib/i18n/provider";

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
  recurring?: string;
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
  const normalizedCategoryId =
    typeof categoryId === "string" &&
    categoryId.trim().length > 0 &&
    categoryId !== NO_CATEGORY_VALUE
      ? categoryId
      : null;
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
    categoryId: normalizedCategoryId,
    note: form.get("note") || null,
    ...(occurredAt ? { occurredAt } : {}),
  };

  const isRecurring = form.get("isRecurring") === "on";

  const parsed = createTransactionSchema.safeParse(raw);
  const recurringParsed = isRecurring
    ? recurringTemplateSchema.safeParse({
        ...raw,
        startDate:
          form.get("startDate") ||
          (typeof rawDate === "string" ? rawDate : todayDayValue()),
        endDate: form.get("endDate") || null,
        frequency: form.get("frequency"),
        weeklyDay: form.get("weeklyDay") || null,
        monthlyDay: form.get("monthlyDay") || null,
        yearlyMonth: form.get("yearlyMonth") || null,
        yearlyDay: form.get("yearlyDay") || null,
        postMode: form.get("postMode"),
      })
    : null;

  if (
    !parsed.success ||
    (recurringParsed && !recurringParsed.success) ||
    Object.keys(errors).length > 0
  ) {
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "title" || key === "amount" || key === "kind") {
          errors[key] = issue.message;
        }
      }
    }
    if (recurringParsed && !recurringParsed.success) {
      errors.recurring = recurringParsed.error.issues[0]?.message;
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

  if (recurringParsed) {
    await repo.createRecurringTemplate(user.id, recurringParsed.data);
    await repo.processDueRecurring(user.id);
    return redirect("/recurring");
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
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringStartDate, setRecurringStartDate] = useState(todayDayValue());
  const [recurringFrequency, setRecurringFrequency] = useState<
    "daily" | "weekly" | "monthly" | "yearly"
  >("monthly");
  const [recurringPostMode, setRecurringPostMode] = useState<
    "confirm" | "auto"
  >("confirm");
  const [recurringEndDate, setRecurringEndDate] = useState("");

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
  const { hasDiscountInput, hasValidDiscount, netAmount } = discountState;
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
  const selectedCategory = filteredCategories.find(
    (c) => c.id === effectiveCategory
  );
  const primaryCategories = getPrimaryCategories(filteredCategories);
  const visibleAmount =
    Number.isFinite(netAmount) && netAmount > 0 ? fmtNumber(netAmount) : "0";
  const amountLabel =
    Number.isFinite(netAmount) && netAmount > 0 ? `฿${visibleAmount}` : "รอยอด";
  const todayLabel = formatDayLabel(occurredDate);
  const recurringFrequencyLabel = getFrequencyLabel(recurringFrequency);
  const recurringModeLabel =
    recurringPostMode === "auto" ? "อัตโนมัติ" : "รอยืนยัน";
  const { locale } = usePordeeLocale();
  const dateLocale = locale === "th" ? "th-TH" : "en-US";
  const todayContext = new Intl.DateTimeFormat(dateLocale, {
    day: "numeric",
    month: "short",
  }).format(new Date());

  return (
    <div className="mx-auto w-full max-w-[30rem] pb-3 lg:max-w-[34rem]">
      <Form method="post">
        <section className="border-line bg-surface rounded-lg border shadow-sm">
          <div className="border-line bg-sky/45 rounded-t-lg border-b px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted text-xs font-medium">
                วันนี้ {todayContext}
              </p>
              <Badge tone={canSubmit ? "teal" : "muted"} className="rounded-sm">
                {canSubmit ? "พร้อม" : "รอข้อมูล"}
              </Badge>
            </div>
            <div className="mt-2">
              <h1 className="text-ink text-xl font-semibold">
                {t("add.title")}
              </h1>
              <p className="text-muted mt-1 text-xs">
                พิมพ์รายการพร้อมยอด เช่น “กาแฟ 65”
              </p>
            </div>

            <div className="border-line bg-surface focus-within:border-coral focus-within:ring-coral/20 mt-4 flex items-center gap-3 rounded-md border px-3 py-2 focus-within:ring-2">
              <span className="bg-coral/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xs">
                <ReceiptText className="text-coral h-4.5 w-4.5" />
              </span>
              <Input
                id="quick-entry"
                value={quick}
                onChange={(e) => {
                  setQuick(e.target.value);
                  setAmountOverride(null);
                  setKindOverride(null);
                  setCategoryOverride(null);
                }}
                placeholder="กาแฟ 65"
                autoComplete="off"
                aria-describedby="quick-entry-hint"
                className="h-11 border-0 bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="px-4 pt-4 pb-4 sm:px-5">
            <input type="hidden" name="title" value={preview.title} />
            {actionData && !actionData.ok && actionData.errors.title ? (
              <p className="text-coral-strong text-sm">
                {t(actionData.errors.title)}
              </p>
            ) : entryHint ? (
              <p id="quick-entry-hint" className="text-muted -mt-1 text-xs">
                {entryHint}
              </p>
            ) : null}

            <div className="border-line bg-sky/35 mt-3 rounded-md border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-muted text-xs">พอดีอ่านรายการนี้</p>
                  <p className="text-ink mt-1 truncate text-base font-semibold">
                    {previewTitle}
                  </p>
                </div>
                <p
                  className={cn(
                    "shrink-0 text-xl font-semibold tabular-nums",
                    effectiveKind === "income" ? "text-teal" : "text-coral"
                  )}
                >
                  {amountLabel}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone={effectiveKind === "income" ? "teal" : "coral"}>
                  {effectiveKind === "income" ? "รายรับ" : "รายจ่าย"}
                </Badge>
                <Badge tone="neutral">{selectedCategoryName}</Badge>
                <Badge tone="neutral">{todayLabel}</Badge>
                {isRecurring ? (
                  <Badge tone="muted">
                    {recurringFrequencyLabel} · {recurringModeLabel}
                  </Badge>
                ) : null}
              </div>
            </div>

            <input type="hidden" name="kind" value={effectiveKind} />
            <input
              type="hidden"
              name="categoryId"
              value={effectiveCategory ?? NO_CATEGORY_VALUE}
            />
            <input type="hidden" name="occurredAt" value={occurredDate} />

            <div className="mt-4 grid grid-cols-[0.9fr_1.1fr] gap-2">
              <div className="grid grid-cols-2 gap-2">
                <MoneyDirectionButton
                  active={effectiveKind === "expense"}
                  ariaLabel="รายจ่าย"
                  icon={WalletCards}
                  tone="coral"
                  onClick={() => {
                    setKindOverride("expense");
                    setCategoryOverride(null);
                  }}
                >
                  จ่าย
                </MoneyDirectionButton>
                <MoneyDirectionButton
                  active={effectiveKind === "income"}
                  ariaLabel="รายรับ"
                  icon={Banknote}
                  tone="teal"
                  onClick={() => {
                    setKindOverride("income");
                    setCategoryOverride(null);
                    setDiscountAmount("");
                  }}
                >
                  รับ
                </MoneyDirectionButton>
              </div>

              <div className="border-line bg-surface focus-within:ring-coral/25 flex min-w-0 items-center rounded-md border px-3 focus-within:ring-2">
                <span className="text-muted text-sm">฿</span>
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
                  className="h-12 border-0 bg-transparent text-lg font-semibold tabular-nums shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            {actionData && !actionData.ok && actionData.errors.amount ? (
              <p className="text-coral-strong mt-2 text-sm">
                {t(actionData.errors.amount)}
              </p>
            ) : !canSubmit ? (
              <p id="amount-hint" className="text-muted mt-2 text-xs">
                {t("transaction.amount.hint.required")}
              </p>
            ) : null}

            {effectiveKind === "expense" ? (
              <div className="border-line bg-sky/25 mt-3 rounded-md border px-3 py-2.5">
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                  <Label
                    htmlFor="discountAmount"
                    className="text-ink shrink-0 text-sm font-semibold"
                  >
                    ส่วนลด
                  </Label>
                  <div className="border-line bg-surface flex min-w-0 items-center gap-1.5 rounded-xs border px-2">
                    <span className="text-muted text-sm">฿</span>
                    <Input
                      id="discountAmount"
                      name="discountAmount"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={discountAmount}
                      onChange={(event) =>
                        setDiscountAmount(event.target.value)
                      }
                      placeholder="0"
                      aria-describedby="discount-hint"
                      className="h-8 border-0 bg-transparent px-0 text-sm font-semibold tabular-nums shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <span className="text-muted shrink-0 text-xs">ถ้ามี</span>
                </div>
                <p
                  id="discount-hint"
                  className={cn(
                    "mt-1 text-xs",
                    hasDiscountInput && !hasValidDiscount
                      ? "text-coral-strong"
                      : "text-muted"
                  )}
                >
                  {actionData &&
                  !actionData.ok &&
                  actionData.errors.discountAmount
                    ? t(actionData.errors.discountAmount)
                    : hasDiscountInput && !hasValidDiscount
                      ? t("transaction.discount.error.tooHigh")
                      : hasDiscountInput && hasValidDiscount
                        ? t("transaction.discount.netAmount", {
                            amount: fmtNumber(netAmount),
                          })
                        : "ระบุเฉพาะรายการที่มีส่วนลด"}
                </p>
              </div>
            ) : (
              <input type="hidden" name="discountAmount" value="" />
            )}

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <Label className="text-muted text-xs">หมวด</Label>
                <Select
                  value={effectiveCategory ?? NO_CATEGORY_VALUE}
                  onValueChange={(value) =>
                    setCategoryOverride(
                      value === NO_CATEGORY_VALUE ? null : value
                    )
                  }
                >
                  <SelectTrigger
                    aria-label="หมวด"
                    className="h-8 w-auto min-w-24 rounded-xs px-2 text-xs"
                  >
                    <SelectValue placeholder="ดูทั้งหมด" />
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
              <div className="group relative -mx-4 sm:-mx-5">
                <div className="flex scrollbar-none gap-2 overflow-x-auto px-4 pb-1 sm:px-5">
                  {primaryCategories.map((category) => {
                    const active = category.id === effectiveCategory;
                    const Icon = getCategoryIcon(category);
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setCategoryOverride(category.id)}
                        className={cn(
                          "border-line bg-surface flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm transition-colors",
                          active
                            ? "border-coral bg-coral/10 text-coral"
                            : "text-ink hover:bg-sky"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="whitespace-nowrap">
                          {category.name}
                        </span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setCategoryOverride(null)}
                    className={cn(
                      "border-line bg-surface hover:bg-sky flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm transition-colors",
                      !selectedCategory
                        ? "border-coral bg-coral/10 text-coral"
                        : "text-muted"
                    )}
                  >
                    <CircleEllipsis className="h-4 w-4" />
                    ไม่ระบุ
                  </button>
                </div>
                <div
                  aria-hidden="true"
                  className="from-surface pointer-events-none absolute top-0 bottom-1 left-0 w-8 bg-gradient-to-r via-[color-mix(in_oklab,var(--color-surface)_72%,transparent)] to-transparent opacity-0 transition-opacity duration-150 group-hover:opacity-100 sm:w-10"
                />
                <div
                  aria-hidden="true"
                  className="from-surface pointer-events-none absolute top-0 right-0 bottom-1 w-12 bg-gradient-to-l via-[color-mix(in_oklab,var(--color-surface)_84%,transparent)] to-transparent opacity-0 transition-opacity duration-150 group-hover:opacity-100 sm:w-14"
                />
              </div>
            </div>

            <div className="border-line mt-4 divide-y border-t">
              <div className="grid gap-2 py-3">
                <FieldHeading
                  description={todayLabel}
                  icon={CalendarDays}
                  label="วันที่"
                />
                <DatePicker
                  id="occurredAt"
                  value={occurredDate}
                  max={todayDayValue()}
                  onChange={setOccurredDate}
                  showPresets
                />
              </div>

              <div className="grid gap-2 py-3">
                <FieldHeading
                  description="เพิ่มรายละเอียดถ้าจำเป็น"
                  icon={StickyNote}
                  label="บันทึก"
                />
                <Input
                  id="note"
                  name="note"
                  placeholder={t("transaction.note.placeholder")}
                  className="h-11 rounded-md"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsRecurring((value) => !value)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 py-3 text-left transition-colors active:scale-[0.99]",
                  isRecurring ? "text-teal" : "text-ink"
                )}
                aria-pressed={isRecurring}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "border-line bg-surface flex h-10 w-10 shrink-0 items-center justify-center rounded-md border",
                      isRecurring ? "border-teal bg-teal/10" : null
                    )}
                  >
                    <Repeat2 className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">ทำซ้ำ</span>
                    <span className="text-muted block truncate text-xs">
                      {isRecurring
                        ? `${recurringFrequencyLabel} · ${recurringModeLabel}`
                        : "ตั้งเป็นรายการประจำ"}
                    </span>
                  </span>
                </span>
                <span
                  className={cn(
                    "border-line bg-sky relative h-6 w-11 shrink-0 rounded-full border transition-colors",
                    isRecurring ? "border-teal bg-teal/20" : null
                  )}
                  aria-hidden="true"
                >
                  <span
                    className={cn(
                      "bg-surface absolute top-0.5 left-0.5 h-5 w-5 rounded-full shadow-sm transition-transform",
                      isRecurring ? "bg-teal translate-x-5" : null
                    )}
                  />
                </span>
              </button>
            </div>
            <input
              type="hidden"
              name="isRecurring"
              value={isRecurring ? "on" : ""}
              disabled={!isRecurring}
            />

            {isRecurring ? (
              <div className="border-line bg-sky/30 mt-3 rounded-md border p-3">
                <Label className="flex items-start gap-3">
                  <Checkbox
                    checked={isRecurring}
                    onCheckedChange={(checked) =>
                      setIsRecurring(checked === true)
                    }
                    value="on"
                    className="mt-1"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-ink flex items-center justify-between gap-2 text-sm font-semibold">
                      <span>ทำซ้ำ</span>
                      <span className="text-muted text-xs font-normal">
                        {recurringFrequencyLabel} · {recurringModeLabel}
                      </span>
                    </span>
                    <span className="mt-3 grid grid-cols-4 gap-1.5">
                      {RECURRENCE_OPTIONS.map((option) => (
                        <ChipButton
                          key={option.value}
                          active={recurringFrequency === option.value}
                          onClick={() => setRecurringFrequency(option.value)}
                        >
                          {option.label}
                        </ChipButton>
                      ))}
                    </span>
                    <span className="mt-2 grid grid-cols-2 gap-1.5">
                      <ChipButton
                        active={recurringPostMode === "confirm"}
                        onClick={() => setRecurringPostMode("confirm")}
                      >
                        รอยืนยัน
                      </ChipButton>
                      <ChipButton
                        active={recurringPostMode === "auto"}
                        onClick={() => setRecurringPostMode("auto")}
                      >
                        อัตโนมัติ
                      </ChipButton>
                    </span>
                    <span className="mt-3 grid grid-cols-2 gap-2">
                      <DatePicker
                        id="recurring-start"
                        value={recurringStartDate}
                        onChange={setRecurringStartDate}
                      />
                      <DatePicker
                        id="recurring-end"
                        value={recurringEndDate}
                        min={recurringStartDate}
                        onChange={setRecurringEndDate}
                        placeholder="ไม่กำหนด"
                      />
                    </span>
                  </span>
                </Label>
                <input
                  type="hidden"
                  name="frequency"
                  value={recurringFrequency}
                />
                <input
                  type="hidden"
                  name="postMode"
                  value={recurringPostMode}
                />
                <input
                  type="hidden"
                  name="startDate"
                  value={recurringStartDate}
                />
                <input type="hidden" name="endDate" value={recurringEndDate} />
                <RecurringRuleFields
                  key={`${recurringFrequency}-${recurringStartDate}`}
                  dayValue={recurringStartDate}
                  frequency={recurringFrequency}
                />
                {actionData && !actionData.ok && actionData.errors.recurring ? (
                  <p className="text-coral-strong mt-2 text-sm">
                    {actionData.errors.recurring}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="bg-surface border-line sticky bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-20 -mx-4 mt-5 border-t px-4 py-3 sm:-mx-5 sm:rounded-b-lg sm:px-5 lg:static">
              <div className="mx-auto flex max-w-[30rem] items-center gap-3 lg:max-w-[34rem]">
                <div className="min-w-0 flex-1">
                  <p className="text-ink truncate text-sm font-semibold">
                    {previewTitle} · {amountLabel}
                  </p>
                  <p className="text-muted truncate text-xs">
                    {selectedCategoryName} · {todayLabel}
                  </p>
                </div>
                <Button
                  type="submit"
                  aria-label="บันทึกรายการ"
                  disabled={!canSubmit}
                  className="h-12 shrink-0 rounded-md px-5"
                >
                  <Check className="h-4 w-4" />
                  {isRecurring
                    ? `บันทึกซ้ำ ${amountLabel}`
                    : `บันทึก ${amountLabel}`}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </Form>
    </div>
  );
};

export default Add;

const MoneyDirectionButton = ({
  active,
  ariaLabel,
  children,
  icon: Icon,
  onClick,
  tone,
}: {
  active: boolean;
  ariaLabel: string;
  children: React.ReactNode;
  icon: LucideIcon;
  onClick: () => void;
  tone: "coral" | "teal";
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={cn(
        "border-line bg-surface flex h-12 items-center justify-center gap-2 rounded-md border text-sm font-semibold transition-colors",
        active && tone === "coral"
          ? "border-coral bg-coral/10 text-coral"
          : active && tone === "teal"
            ? "border-teal bg-teal/10 text-teal"
            : "text-muted hover:bg-sky"
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
};

const FieldHeading = ({
  description,
  icon: Icon,
  label,
}: {
  description: string;
  icon: LucideIcon;
  label: string;
}) => {
  return (
    <div className="flex items-center gap-2">
      <span className="border-line bg-sky flex h-8 w-8 shrink-0 items-center justify-center rounded-md border">
        <Icon className="text-muted h-4 w-4" />
      </span>
      <div className="min-w-0">
        <Label className="text-ink text-sm font-semibold">{label}</Label>
        <p className="text-muted truncate text-xs">{description}</p>
      </div>
    </div>
  );
};

const ChipButton = ({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "border-line bg-surface h-9 min-w-0 rounded-xs border px-2 text-xs font-medium transition-colors",
        active ? "border-teal bg-teal/10 text-teal" : "text-muted hover:bg-sky"
      )}
    >
      <span className="block truncate">{children}</span>
    </button>
  );
};

const RecurringRuleFields = ({
  dayValue,
  frequency,
}: {
  dayValue: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
}) => {
  const parsed = parseDayParts(dayValue);
  const weeklyDay = parsed.date?.getDay() ?? 1;
  const monthlyDay = parsed.day ?? 1;
  const yearlyMonth = parsed.month ?? 1;
  const yearlyDay = parsed.day ?? 1;

  if (frequency === "daily") {
    return (
      <>
        <input type="hidden" name="weeklyDay" value="" />
        <input type="hidden" name="monthlyDay" value="" />
        <input type="hidden" name="yearlyMonth" value="" />
        <input type="hidden" name="yearlyDay" value="" />
      </>
    );
  }

  if (frequency === "weekly") {
    return (
      <>
        <input type="hidden" name="weeklyDay" value={weeklyDay} />
        <input type="hidden" name="monthlyDay" value="" />
        <input type="hidden" name="yearlyMonth" value="" />
        <input type="hidden" name="yearlyDay" value="" />
      </>
    );
  }

  if (frequency === "monthly") {
    return (
      <>
        <input type="hidden" name="weeklyDay" value="" />
        <input type="hidden" name="monthlyDay" value={monthlyDay} />
        <input type="hidden" name="yearlyMonth" value="" />
        <input type="hidden" name="yearlyDay" value="" />
      </>
    );
  }

  return (
    <>
      <input type="hidden" name="weeklyDay" value="" />
      <input type="hidden" name="monthlyDay" value="" />
      <input type="hidden" name="yearlyMonth" value={yearlyMonth} />
      <input type="hidden" name="yearlyDay" value={yearlyDay} />
    </>
  );
};

const parseDayParts = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return { date: null, day: null, month: null };
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return {
    date: Number.isNaN(date.getTime()) ? null : date,
    day: Number(day),
    month: Number(month),
  };
};

const getPrimaryCategories = (categories: Category[]) => {
  const unique = new Map<string, Category>();
  for (const category of categories) {
    if (!unique.has(category.name)) unique.set(category.name, category);
  }
  return Array.from(unique.values()).slice(0, 5);
};

const getCategoryIcon = (category: Category): LucideIcon => {
  if (category.kind === "income")
    return category.name.includes("เดือน") ? Banknote : WalletCards;
  if (category.name.includes("อาหาร")) return Utensils;
  if (category.name.includes("เดินทาง")) return Bus;
  if (category.name.includes("บิล")) return ReceiptText;
  if (category.name.includes("ของ")) return ShoppingBasket;
  if (category.name.includes("กาแฟ")) return Coffee;
  return CircleEllipsis;
};

const getFrequencyLabel = (
  frequency: "daily" | "weekly" | "monthly" | "yearly"
) => {
  if (frequency === "daily") return "ทุกวัน";
  if (frequency === "weekly") return "ทุกสัปดาห์";
  if (frequency === "monthly") return "ทุกเดือน";
  return "ทุกปี";
};

const RECURRENCE_OPTIONS: Array<{
  label: string;
  value: "daily" | "weekly" | "monthly" | "yearly";
}> = [
  { label: "วัน", value: "daily" },
  { label: "สัปดาห์", value: "weekly" },
  { label: "เดือน", value: "monthly" },
  { label: "ปี", value: "yearly" },
];
