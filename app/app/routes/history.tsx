import { useLoaderData } from "react-router";
import type { Route } from "./+types/history";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { MascotState } from "~/components/brand/mascot-state";
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

const fmtDate = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
});

export default function History() {
  const { transactions, categoryNameById } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-ink text-2xl font-semibold">ประวัติรายการ</h1>
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
                  className="flex items-center justify-between gap-3 py-3"
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
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
