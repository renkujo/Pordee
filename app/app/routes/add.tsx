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
import { cn } from "~/lib/cn";
import { repo } from "~/lib/db";
import type { Category } from "~/lib/db";
import { createTransactionSchema } from "~/lib/validators/transaction";
import { parseQuickEntry } from "~/lib/parse/quick-entry";

export function meta(_: Route.MetaArgs) {
  return [{ title: "พอดี — บันทึกรายการ" }];
}

export async function loader() {
  const categories = await repo.listCategories();
  return { categories };
}

interface ActionFieldErrors {
  title?: string;
  amount?: string;
  kind?: string;
}

type ActionResult =
  | { ok: false; errors: ActionFieldErrors; values: Record<string, string> }
  | undefined;

export async function action({
  request,
}: Route.ActionArgs): Promise<ActionResult | Response> {
  const form = await request.formData();
  const raw = {
    kind: form.get("kind"),
    title: form.get("title"),
    amount: form.get("amount"),
    categoryId: form.get("categoryId") || null,
    note: form.get("note") || null,
  };

  const parsed = createTransactionSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: ActionFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "title" || key === "amount" || key === "kind") {
        errors[key] = issue.message;
      }
    }
    return {
      ok: false,
      errors,
      values: {
        kind: String(raw.kind ?? "expense"),
        title: String(raw.title ?? ""),
        amount: String(raw.amount ?? ""),
        categoryId: String(form.get("categoryId") ?? ""),
        note: String(form.get("note") ?? ""),
      },
    };
  }

  await repo.createTransaction({
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

  const [amountOverride, setAmountOverride] = useState<string | null>(null);
  const [kindOverride, setKindOverride] = useState<"expense" | "income" | null>(
    null
  );
  const [categoryOverride, setCategoryOverride] = useState<string | null>(null);

  const effectiveKind = kindOverride ?? preview.kind;
  const effectiveCategory =
    categoryOverride !== null ? categoryOverride : preview.categoryId;
  const effectiveAmount =
    amountOverride !== null
      ? amountOverride
      : preview.amount !== null
        ? String(preview.amount)
        : "";

  const filteredCategories = categories.filter((c) => c.kind === effectiveKind);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-ink text-2xl font-semibold">บันทึกรายการ</h1>
        <p className="text-muted text-sm">ตรวจรายการก่อนบันทึก</p>
      </div>

      <Form method="post" className="contents">
        <Card>
          <CardHeader>
            <CardTitle>พิมพ์รายการแบบเร็ว</CardTitle>
            <CardDescription>
              เช่น “กาแฟ 65” หรือ “เงินเดือน 25000”
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
              }}
              placeholder="กาแฟ 65"
              autoComplete="off"
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ตรวจรายการก่อนบันทึก</CardTitle>
            <CardDescription>
              ระบบเดาให้ก่อน แก้ได้ทุกช่องตามจริง
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Badge tone={effectiveKind === "income" ? "teal" : "coral"}>
                {effectiveKind === "income" ? "รายรับ" : "รายจ่าย"}
              </Badge>
              <div className="flex gap-1">
                <KindToggle
                  active={effectiveKind === "expense"}
                  onClick={() => {
                    setKindOverride("expense");
                    setCategoryOverride(null);
                  }}
                >
                  รายจ่าย
                </KindToggle>
                <KindToggle
                  active={effectiveKind === "income"}
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

            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">จำนวนเงิน (บาท)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={effectiveAmount}
                onChange={(e) => setAmountOverride(e.target.value)}
                placeholder="0"
                required
              />
              {actionData && !actionData.ok && actionData.errors.amount && (
                <p className="text-coral-strong text-sm">
                  {actionData.errors.amount}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="category">หมวด</Label>
              <select
                id="category"
                name="categoryId"
                value={effectiveCategory ?? ""}
                onChange={(e) => setCategoryOverride(e.target.value || null)}
                className="border-line bg-surface text-ink focus-visible:ring-coral/30 h-11 rounded-[12px] border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
              >
                <option value="">— ไม่ระบุ —</option>
                {filteredCategories.map((c: Category) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit">บันทึกรายการ</Button>
          </CardContent>
        </Card>
      </Form>
    </div>
  );
}

function KindToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-ink bg-ink text-white"
          : "border-line text-muted hover:bg-sky"
      )}
    >
      {children}
    </button>
  );
}
