import { data, Form, Link, redirect, useLoaderData } from "react-router";
import type { Route } from "./+types/history";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { MascotState, MascotTip } from "~/components/brand/mascot-state";
import { repo } from "~/lib/db";
import { fmtSignedBaht } from "~/lib/format/baht";

export function meta(_: Route.MetaArgs) {
  return [{ title: "พอดี — ประวัติรายการ" }];
}

export async function loader() {
  const [transactions, categories] = await Promise.all([
    repo.listTransactions(),
    repo.listCategories(),
  ]);
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  return {
    transactions,
    categoryNameById: Object.fromEntries(categoryNameById),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = form.get("intent");
  const id = form.get("id");

  if (intent !== "delete" || typeof id !== "string") {
    throw data("คำสั่งไม่ถูกต้อง", { status: 400 });
  }

  const ok = await repo.deleteTransaction(id);
  if (!ok) {
    throw data("ไม่พบรายการ", { status: 404 });
  }

  return redirect("/history");
}

const fmtDate = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
});

export default function History() {
  const { transactions, categoryNameById } = useLoaderData<typeof loader>();
  const latest = transactions[0];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-ink text-2xl font-semibold">ประวัติรายการ</h1>
        <p className="text-muted text-sm">
          ย้อนดู แก้ไข หรือลบรายการที่บันทึกไว้
        </p>
      </div>
      {latest && (
        <MascotTip mood="thinking" title="พอดีช่วยดูย้อนหลัง">
          รายการล่าสุดคือ “{latest.title}” ถ้าจำนวนหรือหมวดไม่ตรง
          กดแก้ไขจากแถวนี้ได้ทันที
        </MascotTip>
      )}
      <Card>
        <CardHeader>
          <CardTitle>ทุกเดือน</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <MascotState
              mood="thinking"
              title="ยังไม่มีรายการบันทึกไว้"
              description="เมื่อเริ่มบันทึก คุณจะค้นหา กรอง และกลับมาแก้รายการได้จากหน้านี้"
            />
          ) : (
            <ul className="divide-line divide-y" data-testid="history-list">
              {transactions.map((t) => (
                <li
                  key={t.id}
                  className="hover:bg-sky/40 -mx-2 flex items-center gap-2 rounded-md px-2 py-3 transition-colors"
                >
                  <Link
                    to={`/history/${t.id}`}
                    className="flex min-w-0 flex-1 items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-ink truncate text-sm font-medium">
                        {t.title}
                      </p>
                      <p className="text-muted mt-0.5 text-xs">
                        {fmtDate.format(new Date(t.occurredAt))}
                        {t.categoryId && categoryNameById[t.categoryId] ? (
                          <>
                            {" · "}
                            {categoryNameById[t.categoryId]}
                          </>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={t.kind === "income" ? "teal" : "coral"}>
                        {fmtSignedBaht(t.amount, t.kind)}
                      </Badge>
                    </div>
                  </Link>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/history/${t.id}`}>แก้ไข</Link>
                    </Button>
                    <Form method="post">
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="id" value={t.id} />
                      <Button
                        type="submit"
                        variant="secondary"
                        size="sm"
                        className="text-coral-strong border-coral/40 hover:bg-coral/10"
                        aria-label={`ลบ ${t.title}`}
                      >
                        ลบ
                      </Button>
                    </Form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
