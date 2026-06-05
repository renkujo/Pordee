import { useState } from "react";
import { data, Form, Link, redirect, useLoaderData } from "react-router";
import type { Route } from "./+types/history";
import {
  CalendarRange,
  MoreHorizontal,
  Pencil,
  PlusCircle,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { MascotState, MascotTip } from "~/components/brand/mascot-state";
import { DatePicker } from "~/components/ui/date-picker";
import { repo } from "~/lib/db";
import { requireUser } from "~/lib/auth.server";
import type { Transaction, TransactionKind } from "~/lib/db";
import { fmtSignedBaht } from "~/lib/format/baht";
import { isoToDayValue, todayDayValue } from "~/lib/date/day-value";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const [transactions, categories] = await Promise.all([
    repo.listTransactions(user.id),
    repo.listCategories(user.id),
  ]);
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  return {
    categories,
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

  const user = await requireUser(request);
  const ok = await repo.deleteTransaction(user.id, id);
  if (!ok) {
    throw data("ไม่พบรายการ", { status: 404 });
  }

  return redirect("/history");
}

const fmtDate = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
});

const ALL_KINDS_VALUE = "__all_kinds__";
const ALL_CATEGORIES_VALUE = "__all_categories__";

type KindFilter = typeof ALL_KINDS_VALUE | TransactionKind;
type MonthPreset = "all" | "this-month" | "last-month" | "custom";

export default function History() {
  const { categories, transactions, categoryNameById } =
    useLoaderData<typeof loader>();
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>(ALL_KINDS_VALUE);
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES_VALUE);
  const [monthPreset, setMonthPreset] = useState<MonthPreset>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const normalizedSearchQuery = normalizeSearch(searchQuery);
  const hasDateRange = fromDate !== "" || toDate !== "";
  const availableCategories = categories.filter((category) =>
    kindFilter === ALL_KINDS_VALUE ? true : category.kind === kindFilter
  );
  const filteredTransactions = transactions.filter((transaction) => {
    if (kindFilter !== ALL_KINDS_VALUE && transaction.kind !== kindFilter) {
      return false;
    }
    if (
      categoryFilter !== ALL_CATEGORIES_VALUE &&
      transaction.categoryId !== categoryFilter
    ) {
      return false;
    }
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
  const totals = filteredTransactions.reduce(
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
  const hasKindFilter = kindFilter !== ALL_KINDS_VALUE;
  const hasCategoryFilter = categoryFilter !== ALL_CATEGORIES_VALUE;
  const hasFilter =
    hasSearch || hasDateRange || hasKindFilter || hasCategoryFilter;

  function clearFilters() {
    setSearchQuery("");
    setKindFilter(ALL_KINDS_VALUE);
    setCategoryFilter(ALL_CATEGORIES_VALUE);
    setMonthPreset("all");
    setFromDate("");
    setToDate("");
  }

  function applyMonthPreset(value: MonthPreset) {
    setMonthPreset(value);
    if (value === "custom") return;
    const range = getMonthPresetRange(value);
    setFromDate(range.from);
    setToDate(range.to);
  }

  function updateKindFilter(value: KindFilter) {
    setKindFilter(value);
    if (
      categoryFilter !== ALL_CATEGORIES_VALUE &&
      value !== ALL_KINDS_VALUE &&
      categories.find((category) => category.id === categoryFilter)?.kind !==
        value
    ) {
      setCategoryFilter(ALL_CATEGORIES_VALUE);
    }
  }

  function updateFromDate(value: string) {
    setFromDate(value);
    setMonthPreset("custom");
  }

  function updateToDate(value: string) {
    setToDate(value);
    setMonthPreset("custom");
  }

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
        <SummaryCell
          label={hasFilter ? "รายรับตามตัวกรอง" : "รายรับทั้งหมด"}
          tone="teal"
          value={totals.income}
        />
        <SummaryCell
          label={hasFilter ? "รายจ่ายตามตัวกรอง" : "รายจ่ายทั้งหมด"}
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
            <div className="flex flex-col gap-3">
              <div className="border-line bg-surface focus-within:ring-coral/35 flex h-11 items-center gap-2 rounded-sm border px-3 focus-within:ring-2">
                <Search className="text-muted h-4 w-4 shrink-0" />
                <Input
                  id="history-search"
                  name="historySearch"
                  aria-label="ค้นหารายการ"
                  className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                  inputMode="search"
                  onChange={(event) =>
                    setSearchQuery(event.currentTarget.value)
                  }
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

              <div className="border-line bg-sky/30 grid gap-3 rounded-sm border p-3 md:grid-cols-2 xl:grid-cols-4 xl:items-end">
                <div className="flex flex-col gap-1.5">
                  <Label
                    className="text-muted flex items-center gap-1.5 text-xs"
                    htmlFor="history-month-preset"
                  >
                    <CalendarRange className="h-3.5 w-3.5" />
                    ช่วงเวลา
                  </Label>
                  <Select
                    name="historyMonthPreset"
                    value={monthPreset}
                    onValueChange={(value) =>
                      applyMonthPreset(value as MonthPreset)
                    }
                  >
                    <SelectTrigger
                      id="history-month-preset"
                      aria-label="ช่วงเวลา"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทั้งหมด</SelectItem>
                      <SelectItem value="this-month">เดือนนี้</SelectItem>
                      <SelectItem value="last-month">เดือนก่อน</SelectItem>
                      <SelectItem value="custom">กำหนดเอง</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label
                    className="text-muted flex items-center gap-1.5 text-xs"
                    htmlFor="history-kind-filter"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    ประเภท
                  </Label>
                  <Select
                    name="historyKindFilter"
                    value={kindFilter}
                    onValueChange={(value) =>
                      updateKindFilter(value as KindFilter)
                    }
                  >
                    <SelectTrigger id="history-kind-filter" aria-label="ประเภท">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_KINDS_VALUE}>ทั้งหมด</SelectItem>
                      <SelectItem value="expense">รายจ่าย</SelectItem>
                      <SelectItem value="income">รายรับ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label
                    className="text-muted text-xs"
                    htmlFor="history-category-filter"
                  >
                    หมวด
                  </Label>
                  <Select
                    name="historyCategoryFilter"
                    value={categoryFilter}
                    onValueChange={setCategoryFilter}
                  >
                    <SelectTrigger
                      id="history-category-filter"
                      aria-label="หมวด"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_CATEGORIES_VALUE}>
                        ทุกหมวด
                      </SelectItem>
                      {availableCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label
                    className="text-muted text-xs"
                    htmlFor="history-from-date"
                  >
                    ตั้งแต่วันที่
                  </Label>
                  <DatePicker
                    id="history-from-date"
                    value={fromDate}
                    max={toDate || todayDayValue()}
                    onChange={updateFromDate}
                    placeholder="ไม่จำกัด"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label
                    className="text-muted text-xs"
                    htmlFor="history-to-date"
                  >
                    ถึงวันที่
                  </Label>
                  <DatePicker
                    id="history-to-date"
                    value={toDate}
                    max={todayDayValue()}
                    onChange={updateToDate}
                    placeholder="ไม่จำกัด"
                  />
                </div>

                <div className="flex flex-col gap-2 md:col-span-2 xl:col-span-1">
                  <Button
                    className="rounded-sm"
                    disabled={!hasFilter}
                    onClick={clearFilters}
                    type="button"
                    variant="secondary"
                  >
                    <X className="h-4 w-4" />
                    ล้างตัวกรอง
                  </Button>
                </div>
              </div>

              {hasFilter ? (
                <p className="text-muted text-xs">
                  กำลังแสดง {filteredTransactions.length} จาก{" "}
                  {transactions.length} รายการ และสรุปยอดตามตัวกรองนี้
                </p>
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

function getMonthPresetRange(value: MonthPreset) {
  if (value === "all" || value === "custom") {
    return { from: "", to: "" };
  }

  const now = new Date();
  const monthOffset = value === "last-month" ? -1 : 0;
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0);

  return {
    from: todayDayValue(start),
    to: todayDayValue(end),
  };
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
