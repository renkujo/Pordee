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
import { ArrowLeft, Save, Trash2 } from "lucide-react";
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
import { MascotTip } from "~/components/brand/mascot-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/cn";
import { repo } from "~/lib/db";
import type { Category } from "~/lib/db";
import { updateTransactionSchema } from "~/lib/validators/transaction";
import { fmtSignedBaht } from "~/lib/format/baht";

const NO_CATEGORY_VALUE = "__none__";

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

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

  const categoryValue = form.get("categoryId");
  const raw = {
    kind: form.get("kind"),
    title: form.get("title"),
    amount: form.get("amount"),
    categoryId:
      typeof categoryValue === "string" && categoryValue !== NO_CATEGORY_VALUE
        ? categoryValue
        : null,
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
  const selectedCategory =
    categories.find((c: Category) => c.id === categoryId)?.name ??
    "ไม่ระบุหมวด";
  const createdDate = dateFormatter.format(new Date(tx.createdAt));
  const occurredDate = dateFormatter.format(new Date(tx.occurredAt));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-3">
            <Link to="/history">
              <ArrowLeft className="h-4 w-4" />
              กลับประวัติ
            </Link>
          </Button>
          <h1 className="text-ink text-2xl font-semibold">แก้ไขรายการ</h1>
          <p className="text-muted text-sm">
            ตรวจรายการนี้ก่อนบันทึกการเปลี่ยนแปลง
          </p>
        </div>
        <Badge tone={kind === "income" ? "teal" : "coral"} className="w-fit">
          {kind === "income" ? "รายรับ" : "รายจ่าย"}{" "}
          {fmtSignedBaht(tx.amount, kind)}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <Form method="post" className="contents">
            <Card>
              <CardHeader>
                <CardTitle>ข้อมูลรายการ</CardTitle>
                <CardDescription>
                  แก้ชนิด จำนวนเงิน หมวด หรือบันทึกของรายการนี้
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="border-line bg-sky/45 rounded-md border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-ink text-sm font-semibold">ประเภท</p>
                      <p className="text-muted mt-1 text-sm leading-6">
                        ถ้าเปลี่ยนประเภท หมวดจะถูกล้างให้เลือกใหม่
                      </p>
                    </div>
                    <Badge
                      tone={kind === "income" ? "teal" : "coral"}
                      className="w-fit"
                    >
                      กำลังบันทึกเป็น {kind === "income" ? "รายรับ" : "รายจ่าย"}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <KindToggle
                      active={kind === "expense"}
                      tone="coral"
                      onClick={() => {
                        setKind("expense");
                        setCategoryId("");
                      }}
                    >
                      รายจ่าย
                    </KindToggle>
                    <KindToggle
                      active={kind === "income"}
                      tone="teal"
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="title">ชื่อรายการ</Label>
                    <Input
                      id="title"
                      name="title"
                      defaultValue={tx.title}
                      required
                    />
                    {actionData &&
                      !actionData.ok &&
                      actionData.errors.title && (
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
                    {actionData &&
                      !actionData.ok &&
                      actionData.errors.amount && (
                        <p className="text-coral-strong text-sm">
                          {actionData.errors.amount}
                        </p>
                      )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="category">หมวด</Label>
                    <Select
                      name="categoryId"
                      value={categoryId || NO_CATEGORY_VALUE}
                      onValueChange={(value) =>
                        setCategoryId(value === NO_CATEGORY_VALUE ? "" : value)
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

                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="note">บันทึก (ไม่บังคับ)</Label>
                    <Input
                      id="note"
                      name="note"
                      defaultValue={tx.note ?? ""}
                      placeholder="รายละเอียดเพิ่มเติม"
                    />
                  </div>
                </div>

                <div className="border-line flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-muted text-sm leading-6">
                    รายการเกิดวันที่ {occurredDate}
                  </p>
                  <Button type="submit" className="w-full sm:w-auto">
                    <Save className="h-4 w-4" />
                    บันทึกการแก้ไข
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Form>
        </section>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>รายการนี้</CardTitle>
              <CardDescription>ข้อมูลเดิมก่อนบันทึกการแก้ไข</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="border-line bg-sky/45 rounded-md border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-ink truncate text-sm font-semibold">
                      {tx.title}
                    </p>
                    <p
                      className={cn(
                        "mt-2 text-2xl font-semibold tracking-tight",
                        kind === "income" ? "text-teal" : "text-coral"
                      )}
                    >
                      {fmtSignedBaht(tx.amount, kind)}
                    </p>
                  </div>
                  <Badge tone={kind === "income" ? "teal" : "coral"}>
                    {kind === "income" ? "รายรับ" : "รายจ่าย"}
                  </Badge>
                </div>
              </div>

              <dl className="grid gap-3 text-sm">
                <InfoRow label="หมวดที่เลือก" value={selectedCategory} />
                <InfoRow label="วันที่เกิดรายการ" value={occurredDate} />
                <InfoRow label="บันทึกเข้าระบบ" value={createdDate} />
              </dl>
            </CardContent>
          </Card>

          <MascotTip mood="thinking" title="พอดีช่วยเช็กก่อนแก้">
            เปลี่ยนประเภทได้ แต่ควรเลือกหมวดใหม่ให้ตรงด้วย
            เพื่อให้ภาพรวมเดือนนี้ไม่เพี้ยน
          </MascotTip>

          <Card className="border-coral/30">
            <CardHeader>
              <CardTitle>ลบรายการ</CardTitle>
              <CardDescription>
                ใช้เมื่อรายการนี้บันทึกผิดและไม่ควรอยู่ในประวัติ
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Form method="post">
                <input type="hidden" name="intent" value="delete" />
                <Button
                  type="submit"
                  variant="secondary"
                  className="text-coral-strong border-coral/40 hover:bg-coral/10 w-full"
                  data-testid="delete-button"
                >
                  <Trash2 className="h-4 w-4" />
                  ลบรายการนี้
                </Button>
              </Form>
            </CardContent>
          </Card>
        </aside>
      </div>

      <div className="lg:hidden">
        <MascotTip
          mood="warning"
          title="ลบแล้วรายการนี้จะหายจากภาพรวม"
          className="bg-coral/5"
        >
          ถ้าแค่จำนวนหรือหมวดไม่ตรง แก้จากฟอร์มด้านบนจะเหมาะกว่า
        </MascotTip>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-ink min-w-0 truncate font-medium">{value}</dd>
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
