import { useMemo, useState } from "react";
import {
  data,
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
} from "react-router";
import type { Route } from "./+types/history.$id";
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
import { updateTransactionSchema } from "~/lib/validators/transaction";

export function meta(_: Route.MetaArgs) {
  return [{ title: "พอดี — แก้ไขรายการ" }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const tx = await repo.getTransaction(params.id);
  if (!tx) {
    throw data("ไม่พบรายการ", { status: 404 });
  }
  const categories = await repo.listCategories();
  return { tx, categories };
}

interface ActionFieldErrors {
  title?: string;
  amount?: string;
  kind?: string;
}

type ActionResult = { ok: false; errors: ActionFieldErrors } | undefined;

export async function action({
  params,
  request,
}: Route.ActionArgs): Promise<ActionResult | Response> {
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "delete") {
    const ok = await repo.deleteTransaction(params.id);
    if (!ok) {
      throw data("ไม่พบรายการ", { status: 404 });
    }
    return redirect("/history");
  }

  const raw = {
    kind: form.get("kind"),
    title: form.get("title"),
    amount: form.get("amount"),
    categoryId: form.get("categoryId") || null,
    note: form.get("note") || null,
    occurredAt: form.get("occurredAt"),
  };

  const parsed = updateTransactionSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: ActionFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "title" || key === "amount" || key === "kind") {
        errors[key] = issue.message;
      }
    }
    return { ok: false, errors };
  }

  const updated = await repo.updateTransaction(params.id, parsed.data);
  if (!updated) {
    throw data("ไม่พบรายการ", { status: 404 });
  }
  return redirect("/history");
}

export default function EditTransaction() {
  const { tx, categories } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionResult>();

  const [kind, setKind] = useState<"expense" | "income">(tx.kind);
  const [categoryId, setCategoryId] = useState<string>(tx.categoryId ?? "");

  const filteredCategories = useMemo(
    () => categories.filter((c: Category) => c.kind === kind),
    [categories, kind]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/history">← กลับ</Link>
        </Button>
        <div>
          <h1 className="text-ink text-2xl font-semibold">แก้ไขรายการ</h1>
          <p className="text-muted text-sm">
            บันทึกเมื่อ {tx.createdAt.slice(0, 10)}
          </p>
        </div>
      </div>

      <Form method="post" className="contents">
        <Card>
          <CardHeader>
            <CardTitle>รายละเอียด</CardTitle>
            <CardDescription>แก้ค่าที่ผิดหรือลบรายการนี้</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Badge tone={kind === "income" ? "teal" : "coral"}>
                {kind === "income" ? "รายรับ" : "รายจ่าย"}
              </Badge>
              <div className="flex gap-1">
                <KindToggle
                  active={kind === "expense"}
                  onClick={() => {
                    setKind("expense");
                    setCategoryId("");
                  }}
                >
                  รายจ่าย
                </KindToggle>
                <KindToggle
                  active={kind === "income"}
                  onClick={() => {
                    setKind("income");
                    setCategoryId("");
                  }}
                >
                  รายรับ
                </KindToggle>
              </div>
            </div>
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="occurredAt" value={tx.occurredAt} />

            <div className="flex flex-col gap-2">
              <Label htmlFor="title">รายการ</Label>
              <Input id="title" name="title" defaultValue={tx.title} required />
              {actionData && !actionData.ok && actionData.errors.title && (
                <p className="text-coral-strong text-sm">
                  {actionData.errors.title}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">จำนวนเงิน (บาท)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                defaultValue={tx.amount}
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
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
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

            <div className="flex flex-col gap-2">
              <Label htmlFor="note">บันทึก (ไม่บังคับ)</Label>
              <Input
                id="note"
                name="note"
                defaultValue={tx.note ?? ""}
                placeholder="รายละเอียดเพิ่มเติม"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                บันทึกการแก้ไข
              </Button>
            </div>
          </CardContent>
        </Card>
      </Form>

      <Form method="post">
        <input type="hidden" name="intent" value="delete" />
        <Card className="border-coral/30">
          <CardHeader>
            <CardTitle>ลบรายการ</CardTitle>
            <CardDescription>
              การลบเป็นการเอารายการออกจากประวัติถาวร
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="submit"
              variant="secondary"
              className="text-coral-strong border-coral/40 hover:bg-coral/10 w-full"
              data-testid="delete-button"
            >
              ลบรายการนี้
            </Button>
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
