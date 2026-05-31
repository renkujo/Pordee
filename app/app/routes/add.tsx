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
import { createTransactionSchema } from "~/lib/validators/transaction";
import { parseQuickEntry } from "~/lib/parse/quick-entry";

const NO_CATEGORY_VALUE = "__none__";

export function meta(_: Route.MetaArgs) {
  return [{ title: "พอดี — บันทึกรายการ" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const categories = await repo.listCategories(user.id);
  return { categories };
}

interface ActionFieldErrors {
  title?: string;
  amount?: string;
  discountAmount?: string;
  kind?: string;
}

type ActionResult =
  | { ok: false; errors: ActionFieldErrors; values: Record<string, string> }
  | undefined;

export async function action({
  request,
}: Route.ActionArgs): Promise<ActionResult | Response> {
  const user = await requireUser(request);
  const form = await request.formData();
  const categoryId = form.get("categoryId");
  const rawAmount = form.get("amount");
  const rawDiscountAmount = form.get("discountAmount");
  const grossAmount =
    typeof rawAmount === "string" ? Number(rawAmount) : Number.NaN;
  const discountAmount =
    typeof rawDiscountAmount === "string" && rawDiscountAmount.trim() !== ""
      ? Number(rawDiscountAmount)
      : 0;
  const errors: ActionFieldErrors = {};

  if (!Number.isFinite(discountAmount) || discountAmount < 0) {
    errors.discountAmount = "ส่วนลดต้องเป็นจำนวนตั้งแต่ 0 ขึ้นไป";
  }

  if (
    Number.isFinite(grossAmount) &&
    grossAmount > 0 &&
    Number.isFinite(discountAmount) &&
    discountAmount > 0 &&
    discountAmount >= grossAmount
  ) {
    errors.discountAmount = "ส่วนลดต้องน้อยกว่าจำนวนเงิน";
  }

  const rawDate = form.get("occurredAt");
  const occurredAt = dayValueToIso(
    typeof rawDate === "string" ? rawDate : null
  );

  const raw = {
    kind: form.get("kind"),
    title: form.get("title"),
    amount:
      Number.isFinite(grossAmount) && Number.isFinite(discountAmount)
        ? grossAmount - discountAmount
        : rawAmount,
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
}

const QUICK_EXAMPLES = ["กาแฟ 65", "ข้าวเที่ยง 80", "ค่ารถ 40"];

export default function Add() {
  const { categories } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionResult>();

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
  const inferredCategory =
    preview.categoryId &&
    filteredCategories.some((c) => c.id === preview.categoryId)
      ? preview.categoryId
      : null;
  const effectiveCategory =
    categoryOverride !== null ? categoryOverride : inferredCategory;
  const amountNumber = Number(effectiveAmount);
  const discountNumber =
    discountAmount.trim().length > 0 ? Number(discountAmount) : 0;
  const appliesDiscount = effectiveKind === "expense";
  const hasDiscountInput = appliesDiscount && discountAmount.trim().length > 0;
  const hasValidDiscount =
    !hasDiscountInput ||
    (Number.isFinite(discountNumber) &&
      discountNumber >= 0 &&
      (!Number.isFinite(amountNumber) || discountNumber < amountNumber));
  const netAmount =
    appliesDiscount &&
    Number.isFinite(amountNumber) &&
    Number.isFinite(discountNumber)
      ? amountNumber - discountNumber
      : amountNumber;
  const canSubmit =
    preview.title.trim().length > 0 &&
    Number.isFinite(amountNumber) &&
    amountNumber > 0 &&
    hasValidDiscount &&
    netAmount > 0;
  const entryHint =
    quick.trim().length === 0
      ? "พิมพ์ชื่อรายการพร้อมจำนวนเงิน เช่น “กาแฟ 65”"
      : preview.amount === null
        ? "เพิ่มจำนวนเงินท้ายรายการ หรือกรอกจำนวนเงินด้านล่าง"
        : null;
  const previewTitle =
    preview.title.trim().length > 0 ? preview.title.trim() : "รายการนี้";
  const selectedCategoryName =
    filteredCategories.find((c) => c.id === effectiveCategory)?.name ??
    "ไม่ระบุ";
  const previewDescription =
    preview.amount !== null
      ? `พอดีอ่านว่า “${previewTitle}” เป็น${effectiveKind === "income" ? "รายรับ" : "รายจ่าย"} ${effectiveAmount} บาท`
      : "พิมพ์จำนวนเงินต่อท้าย เช่น 65 แล้วพอดีจะช่วยแยกชื่อรายการกับจำนวนเงินให้";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-ink text-2xl font-semibold">บันทึกรายการ</h1>
          <p className="text-muted text-sm">
            พิมพ์สั้น ๆ แล้วตรวจให้ตรงก่อนบันทึก
          </p>
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
              <CardTitle>พิมพ์รายการ</CardTitle>
            </div>
            <CardDescription>
              ใส่ชื่อรายการพร้อมจำนวนเงิน เช่น “กาแฟ 65”
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Label htmlFor="quick-entry">รายการ</Label>
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
            />
            <input type="hidden" name="title" value={preview.title} />
            <div className="flex flex-wrap gap-2">
              {QUICK_EXAMPLES.map((ex) => (
                <Button
                  key={ex}
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setQuick(ex);
                    setAmountOverride(null);
                    setKindOverride(null);
                    setCategoryOverride(null);
                  }}
                >
                  {ex}
                </Button>
              ))}
            </div>
            {actionData && !actionData.ok && actionData.errors.title && (
              <p className="text-coral-strong text-sm">
                {actionData.errors.title}
              </p>
            )}
            {entryHint && (
              <p id="quick-entry-hint" className="text-muted text-sm">
                {entryHint}
              </p>
            )}
            <MascotTip
              mood={preview.amount !== null ? "thinking" : "normal"}
              title="พอดีช่วยอ่านรายการ"
            >
              {previewDescription}
            </MascotTip>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <StepNumber>2</StepNumber>
              <CardTitle>ตรวจรายการ</CardTitle>
            </div>
            <CardDescription>
              พอดีเดาให้ก่อน แก้ชนิด จำนวนเงิน และหมวดได้ทันที
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
                  <p className="text-ink text-sm font-semibold">ประเภท</p>
                  <p className="text-muted mt-1 text-sm">
                    เลือกว่าเป็นเงินเข้า หรือเงินออกจากกระเป๋า
                  </p>
                </div>
                <Badge
                  tone={effectiveKind === "income" ? "teal" : "coral"}
                  className="w-fit"
                >
                  กำลังบันทึกเป็น{" "}
                  {effectiveKind === "income" ? "รายรับ" : "รายจ่าย"}
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
                  รายจ่าย
                </KindToggle>
                <KindToggle
                  active={effectiveKind === "income"}
                  tone="teal"
                  onClick={() => {
                    setKindOverride("income");
                    setCategoryOverride(null);
                  }}
                >
                  รายรับ
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
                    ? "จำนวนเงินก่อนส่วนลด"
                    : "จำนวนเงิน"}
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
                    {actionData.errors.amount}
                  </p>
                )}
                {!canSubmit && (
                  <p id="amount-hint" className="text-muted text-sm">
                    ต้องมีจำนวนเงินมากกว่า 0 ก่อนบันทึก
                  </p>
                )}
              </div>

              {effectiveKind === "expense" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="discountAmount">ส่วนลด</Label>
                  <Input
                    id="discountAmount"
                    name="discountAmount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    placeholder="0"
                    aria-describedby="discount-hint"
                  />
                  {actionData &&
                    !actionData.ok &&
                    actionData.errors.discountAmount && (
                      <p className="text-coral-strong text-sm">
                        {actionData.errors.discountAmount}
                      </p>
                    )}
                  {hasDiscountInput && hasValidDiscount && (
                    <p id="discount-hint" className="text-muted text-sm">
                      ยอดสุทธิ {formatNumber(netAmount)} บาท
                    </p>
                  )}
                  {hasDiscountInput && !hasValidDiscount && (
                    <p id="discount-hint" className="text-coral-strong text-sm">
                      ส่วนลดต้องน้อยกว่าจำนวนเงิน
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="category">หมวด</Label>
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
                    <SelectValue placeholder="— ไม่ระบุ —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY_VALUE}>
                      — ไม่ระบุ —
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
              <Label htmlFor="occurredAt">วันที่ของรายการ</Label>
              <DatePicker
                id="occurredAt"
                value={occurredDate}
                max={todayDayValue()}
                onChange={setOccurredDate}
                aria-describedby="occurred-hint"
              />
              <input type="hidden" name="occurredAt" value={occurredDate} />
              <p id="occurred-hint" className="text-muted text-sm">
                ค่าเริ่มต้นเป็นวันนี้ เลือกย้อนหลังได้ถ้าบันทึกรายการที่ผ่านมา
              </p>
            </div>

            <div className="border-line bg-sky/35 flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <StepNumber>3</StepNumber>
                  <p className="text-ink text-sm font-semibold">
                    บันทึกเมื่อข้อมูลตรงแล้ว
                  </p>
                </div>
                <p className="text-muted mt-1 text-sm">
                  {canSubmit
                    ? `พร้อมบันทึก “${previewTitle}” ${formatNumber(netAmount)} บาท`
                    : "พอดีจะเปิดปุ่มบันทึกเมื่อมีชื่อรายการและจำนวนเงิน"}
                </p>
              </div>
              <Button type="submit" disabled={!canSubmit} className="sm:w-44">
                บันทึกรายการ
              </Button>
            </div>
          </CardContent>
        </Card>
      </Form>
    </div>
  );
}

function StepRail({ currentStep }: { currentStep: number }) {
  const steps = ["พิมพ์รายการ", "ตรวจรายการ", "บันทึก"];
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
                isActive ? "bg-ink text-white" : "bg-sky text-muted"
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
}

function StepNumber({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-ink flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
      {children}
    </span>
  );
}

function ParsedPreview({
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
}) {
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
          title={hasAmount ? "พอดีอ่านให้แล้ว" : "พอดีกำลังรอจำนวนเงิน"}
          className="border-0 bg-transparent p-0 sm:max-w-md"
        >
          {hasAmount
            ? "ตรวจรายการด้านล่างอีกครั้ง ถ้าตรงแล้วบันทึกได้เลย"
            : "เพิ่มจำนวนเงินท้ายรายการหรือกรอกเองในช่องจำนวนเงิน"}
        </MascotTip>
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:w-80">
          <PreviewChip label="ประเภท">
            {kind === "income" ? "รายรับ" : "รายจ่าย"}
          </PreviewChip>
          <PreviewChip label="จำนวน">
            {hasAmount ? `฿${formatNumber(displayAmount)}` : "รอจำนวน"}
          </PreviewChip>
          {kind === "expense" && discountAmount > 0 ? (
            <PreviewChip label="ส่วนลด">
              ฿{formatNumber(discountAmount)}
            </PreviewChip>
          ) : null}
          <PreviewChip label="รายการ">{title}</PreviewChip>
          <PreviewChip label="หมวด">{categoryName}</PreviewChip>
          <PreviewChip label="วันที่">{dateLabel}</PreviewChip>
        </div>
      </div>
    </div>
  );
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function PreviewChip({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="border-line bg-surface min-w-0 rounded-xs border px-3 py-2">
      <p className="text-muted text-xs">{label}</p>
      <p className="text-ink truncate text-sm font-semibold">{children}</p>
    </div>
  );
}

function KindToggle({
  active,
  onClick,
  tone,
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone: "coral" | "teal";
  children: React.ReactNode;
}) {
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
}
