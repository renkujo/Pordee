import { useState } from "react";
import { data, Form, Link, redirect, useLoaderData } from "react-router";
import type { Route } from "./+types/history";
import {
  MoreHorizontal,
  Pencil,
  PlusCircle,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { MascotState, MascotTip } from "~/components/brand/mascot-state";
import { DatePicker } from "~/components/ui/date-picker";
import { repo } from "~/lib/db";
import type { Transaction } from "~/lib/db";
import { fmtSignedBaht } from "~/lib/format/baht";
import { isoToDayValue, todayDayValue } from "~/lib/date/day-value";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const normalizedSearchQuery = normalizeSearch(searchQuery);
  const hasDateRange = fromDate !== "" || toDate !== "";
  const filteredTransactions = transactions.filter((transaction) => {
    if (
      normalizedSearchQuery &&
      !getTransactionSearchText(transaction, categoryNameById).includes(
        normalizedSearchQuery
      )
    ) {
      return false;
    }
    const day = isoToDayValue(transaction.occurredAt);
    if (fromDate && day < fromDate) return false;
    if (toDate && day > toDate) return false;
    return true;
  });
  const latest = transactions[0];
  const totals = transactions.reduce(
    (sum, transaction) => {
      if (transaction.kind === "income") {
        sum.income += transaction.amount;
      } else {
        sum.expense += transaction.amount;
      }
      return sum;
    },
    { expense: 0, income: 0 }
  );
  const net = totals.income - totals.expense;
  const hasSearch = normalizedSearchQuery.length > 0;
  const hasFilter = hasSearch || hasDateRange;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-ink text-2xl font-semibold">ประวัติรายการ</h1>
          <p className="text-muted text-sm">
            ย้อนดูรายการทั้งหมด และจัดการแต่ละแถวจากเมนูเดียว
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/add">
            <PlusCircle className="h-4 w-4" />
            บันทึกรายการ
          </Link>
        </Button>
      </div>

      {latest && (
        <MascotTip mood="thinking" title="พอดีช่วยดูย้อนหลัง">
          รายการล่าสุดคือ “{latest.title}” ถ้าจำนวนหรือหมวดไม่ตรง
          เปิดเมนูท้ายแถวเพื่อแก้ไขหรือลบได้ทันที
        </MascotTip>
      )}

      <section
        aria-label="สรุปประวัติ"
        className="border-line bg-surface grid gap-3 rounded-md border p-4 sm:grid-cols-3"
      >
        <SummaryCell label="รายรับทั้งหมด" tone="teal" value={totals.income} />
        <SummaryCell
          label="รายจ่ายทั้งหมด"
          tone="coral"
          value={totals.expense}
        />
        <SummaryCell
          label="สุทธิ"
          tone={net >= 0 ? "teal" : "coral"}
          value={Math.abs(net)}
        />
      </section>

      <Card>
        <CardHeader className="border-line gap-3 border-b">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>รายการทั้งหมด</CardTitle>
            <span className="text-muted shrink-0 text-sm">
              {hasFilter
                ? `${filteredTransactions.length} / ${transactions.length} รายการ`
                : `${transactions.length} รายการ`}
            </span>
          </div>
          {transactions.length > 0 ? (
            <div className="border-line focus-within:ring-coral/35 flex h-11 items-center gap-2 rounded-sm border bg-white px-3 focus-within:ring-2">
              <Search className="text-muted h-4 w-4 shrink-0" />
              <Input
                aria-label="ค้นหารายการ"
                className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                inputMode="search"
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
                placeholder="ค้นหาชื่อรายการ หมวด ประเภท หรือยอดเงิน"
                role="searchbox"
                type="text"
                value={searchQuery}
              />
              {hasSearch ? (
                <Button
                  aria-label="ล้างคำค้นหา"
                  className="h-8 w-8 rounded-xs"
                  onClick={() => setSearchQuery("")}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ) : null}
          {transactions.length > 0 ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <span className="text-muted text-xs">ตั้งแต่วันที่</span>
                <DatePicker
                  value={fromDate}
                  max={toDate || todayDayValue()}
                  onChange={setFromDate}
                  placeholder="ไม่จำกัด"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <span className="text-muted text-xs">ถึงวันที่</span>
                <DatePicker
                  value={toDate}
                  max={todayDayValue()}
                  onChange={setToDate}
                  placeholder="ไม่จำกัด"
                />
              </div>
              {hasDateRange ? (
                <Button
                  className="rounded-sm sm:w-auto"
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                  }}
                  type="button"
                  variant="secondary"
                >
                  <X className="h-4 w-4" />
                  ล้างช่วงวันที่
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="p-5">
              <MascotState
                mood="thinking"
                title="ยังไม่มีรายการบันทึกไว้"
                description="เมื่อเริ่มบันทึก คุณจะค้นหา กรอง และกลับมาแก้รายการได้จากหน้านี้"
              />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-5">
              <MascotState
                mood="thinking"
                title="ไม่พบรายการที่ตรงกับตัวกรอง"
                description="ลองปรับคำค้นหา หรือขยายช่วงวันที่ให้กว้างขึ้น"
              />
            </div>
          ) : (
            <ul className="divide-line divide-y" data-testid="history-list">
              <li className="text-muted hidden grid-cols-[minmax(0,1fr)_8rem_6rem_8rem_3rem] gap-3 px-4 py-3 text-xs font-medium md:grid">
                <span>รายการ</span>
                <span>หมวด</span>
                <span>ประเภท</span>
                <span className="text-right">จำนวน</span>
                <span className="sr-only">เมนู</span>
              </li>
              {filteredTransactions.map((t) => (
                <TransactionRow
                  categoryNameById={categoryNameById}
                  key={t.id}
                  transaction={t}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function normalizeSearch(value: string) {
  return value.toLocaleLowerCase("th-TH").replace(/\s+/g, " ").trim();
}

function getTransactionSearchText(
  transaction: Transaction,
  categoryNameById: Record<string, string>
) {
  const categoryName =
    transaction.categoryId && categoryNameById[transaction.categoryId]
      ? categoryNameById[transaction.categoryId]
      : "ไม่ระบุหมวด";
  const kindLabel = transaction.kind === "income" ? "รายรับ" : "รายจ่าย";

  return normalizeSearch(
    [
      transaction.title,
      categoryName,
      kindLabel,
      transaction.amount.toString(),
      fmtSignedBaht(transaction.amount, transaction.kind),
      fmtDate.format(new Date(transaction.occurredAt)),
    ].join(" ")
  );
}

function SummaryCell({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "coral" | "teal";
  value: number;
}) {
  return (
    <div className="border-line rounded-sm border px-3 py-2">
      <p className="text-muted text-xs">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold tabular-nums ${
          tone === "teal" ? "text-teal" : "text-coral"
        }`}
      >
        {fmtSignedBaht(value, tone === "teal" ? "income" : "expense")}
      </p>
    </div>
  );
}

function TransactionRow({
  categoryNameById,
  transaction,
}: {
  categoryNameById: Record<string, string>;
  transaction: Transaction;
}) {
  const categoryName =
    transaction.categoryId && categoryNameById[transaction.categoryId]
      ? categoryNameById[transaction.categoryId]
      : "ไม่ระบุหมวด";
  const date = fmtDate.format(new Date(transaction.occurredAt));
  const kindLabel = transaction.kind === "income" ? "รายรับ" : "รายจ่าย";
  const amountTone = transaction.kind === "income" ? "teal" : "coral";

  return (
    <li className="hover:bg-sky/35 grid grid-cols-[minmax(0,1fr)_2.5rem] gap-2 px-4 py-3 transition-colors md:grid-cols-[minmax(0,1fr)_3rem]">
      <Link
        to={`/history/${transaction.id}`}
        className="focus-visible:ring-coral/40 grid min-w-0 gap-3 rounded-sm focus-visible:ring-2 focus-visible:outline-none md:grid-cols-[minmax(0,1fr)_8rem_6rem_8rem] md:items-center"
      >
        <div className="min-w-0">
          <p className="text-ink truncate text-sm font-medium">
            {transaction.title}
          </p>
          <p className="text-muted mt-0.5 text-xs md:hidden">
            {date} · {categoryName}
          </p>
        </div>
        <p className="text-muted hidden truncate text-sm md:block">
          {categoryName}
        </p>
        <div className="hidden md:block">
          <Badge tone={amountTone}>{kindLabel}</Badge>
        </div>
        <div className="flex items-center justify-between gap-2 md:justify-end">
          <span className="text-muted text-xs md:hidden">{kindLabel}</span>
          <Badge tone={amountTone} className="tabular-nums">
            {fmtSignedBaht(transaction.amount, transaction.kind)}
          </Badge>
        </div>
      </Link>
      <div className="flex items-start justify-end md:items-center">
        <RowActions transaction={transaction} />
      </div>
    </li>
  );
}

function RowActions({ transaction }: { transaction: Transaction }) {
  const deleteFormId = `delete-transaction-${transaction.id}`;
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <>
      <Form id={deleteFormId} method="post" className="hidden">
        <input type="hidden" name="intent" value="delete" />
        <input type="hidden" name="id" value={transaction.id} />
      </Form>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-sm"
            aria-label={`เปิดเมนู ${transaction.title}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>จัดการรายการ</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link to={`/history/${transaction.id}`}>
              <Pencil className="h-4 w-4" />
              ดู / แก้ไข
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <button
            type="button"
            role="menuitem"
            onClick={() => setIsDeleteOpen(true)}
            className="focus:bg-sky text-coral-strong relative flex w-full cursor-default items-center gap-2 rounded-xs px-2 py-2 text-sm transition-colors outline-none select-none"
            aria-label={`ลบ ${transaction.title}`}
          >
            <Trash2 className="h-4 w-4" />
            ลบรายการ
          </button>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบรายการนี้?</AlertDialogTitle>
            <AlertDialogDescription>
              รายการ “{transaction.title}” จะถูกลบออกจากประวัติ
              การลบนี้ย้อนกลับไม่ได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction asChild>
              <button
                type="button"
                onClick={() =>
                  (
                    document.getElementById(
                      deleteFormId
                    ) as HTMLFormElement | null
                  )?.requestSubmit()
                }
                className="focus-visible:ring-coral/40 bg-coral hover:bg-coral-strong inline-flex h-10 items-center justify-center rounded-[12px] px-4 text-sm font-medium whitespace-nowrap text-white transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
              >
                ลบรายการ
              </button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
