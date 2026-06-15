import * as React from "react";
import {
  Form,
  Link,
  redirect,
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigation,
} from "react-router";
import type { Route } from "./+types/wallet";
import {
  ArrowRight,
  CalendarDays,
  Edit3,
  GripVertical,
  Landmark,
  Plus,
  Shuffle,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge, type BadgeProps } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Progress } from "~/components/ui/progress";
import { Separator } from "~/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  repo,
  type Category,
  type RecurringTemplate,
  type Transaction,
  type WalletPocket,
  type WalletTransfer,
} from "~/lib/db";
import { requireUser } from "~/lib/auth.server";
import { getMonthRange } from "~/lib/date/month-range";
import { fmtBaht } from "~/lib/format/baht";
import { getSharePercent } from "~/lib/format/progress";
import { cn } from "~/lib/cn";
import { usePordeeLocale, usePordeeTranslation } from "~/lib/i18n/provider";
import {
  archiveWalletPocketSchema,
  reorderWalletPocketsSchema,
  walletAllocationSchema,
  walletPocketInputSchema,
  walletTransferSchema,
} from "~/lib/validators/wallet";

export const meta = (_: Route.MetaArgs) => {
  return [
    { title: "พอดี — กระเป๋า" },
    {
      name: "description",
      content: "จัดสรรเงินเป็นกระเป๋าย่อย พร้อมแผนรายเดือนและการย้ายเงิน",
    },
  ];
};

type PocketStatus = "empty" | "low" | "normal" | "over";
type ActionResult = {
  intent?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
};
type WalletSummary = {
  monthIncome: number;
  monthExpense: number;
  reserved: number;
  available: number;
  dailySafe: number;
  daysLeft: number;
  allocatedTotal: number;
  unallocated: number;
};
type SpendBreakdownRow = {
  categoryId: string;
  name: string | null;
  amount: number;
};
type LoaderPocket = WalletPocket & {
  amount: number;
  allocation: number;
  recommended: number;
  spent: number;
  transferIn: number;
  transferOut: number;
  target: number;
  percent: number;
  status: PocketStatus;
  dailySafe: number;
  relatedTransactions: Transaction[];
};
type LoaderData = {
  monthKey: string;
  monthDate: string;
  summary: WalletSummary;
  categories: Category[];
  pockets: LoaderPocket[];
  spendBreakdown: SpendBreakdownRow[];
  transfers: WalletTransfer[];
  billsDueSoon: RecurringTemplate[];
  monthExpense: number;
  hasAnyData: boolean;
  hasMonthData: boolean;
};

const NO_POCKET_VALUE = "__unallocated";

export const loader = async ({
  request,
}: Route.LoaderArgs): Promise<LoaderData> => {
  const user = await requireUser(request);
  await repo.processDueRecurring(user.id);

  const now = new Date();
  const { from, to } = getMonthRange(now);
  const monthKey = getMonthKey(now);
  const [
    allTx,
    monthTx,
    categories,
    goals,
    recurringTemplates,
    pockets,
    allocations,
    transfers,
  ] = await Promise.all([
    repo.listTransactions(user.id),
    repo.listTransactions(user.id, { from, to }),
    repo.listCategories(user.id),
    repo.listGoals(user.id),
    repo.listRecurringTemplates(user.id),
    repo.listWalletPockets(user.id),
    repo.listWalletAllocations(user.id, monthKey),
    repo.listWalletTransfers(user.id, { from, to }),
  ]);

  let totalIncome = 0;
  let totalExpense = 0;
  let monthIncome = 0;
  let monthExpense = 0;
  const monthExpenseByCategory = new Map<string, number>();

  for (const transaction of allTx) {
    if (transaction.kind === "income") totalIncome += transaction.amount;
    else totalExpense += transaction.amount;
  }

  for (const transaction of monthTx) {
    if (transaction.kind === "income") {
      monthIncome += transaction.amount;
      continue;
    }
    monthExpense += transaction.amount;
    const categoryId = transaction.categoryId ?? "uncategorized";
    monthExpenseByCategory.set(
      categoryId,
      (monthExpenseByCategory.get(categoryId) ?? 0) + transaction.amount
    );
  }

  const reserved = goals.reduce((sum, goal) => sum + goal.saved, 0);
  const available = totalIncome - totalExpense - reserved;
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft = Math.max(1, monthEnd.getDate() - now.getDate() + 1);
  const dailySafe = available > 0 ? Math.floor(available / daysLeft) : 0;
  const allocationByPocketId = new Map(
    allocations.map((allocation) => [allocation.pocketId, allocation.amount])
  );
  const recommendedByPocketId = getRecommendedAllocations(pockets, monthIncome);
  const transferTotals = getTransferTotals(transfers);

  const walletPockets: LoaderPocket[] = pockets.map((pocket) => {
    const spent = getPocketSpent({
      categoryIds: pocket.categoryIds,
      expenseByCategory: monthExpenseByCategory,
      reserveSpent: pocket.type === "reserve" ? reserved : 0,
    });
    const allocation =
      allocationByPocketId.get(pocket.id) ??
      (pocket.monthlyLimit > 0
        ? pocket.monthlyLimit
        : (recommendedByPocketId.get(pocket.id) ?? 0));
    const transferIn = transferTotals.inByPocketId.get(pocket.id) ?? 0;
    const transferOut = transferTotals.outByPocketId.get(pocket.id) ?? 0;
    const amount = allocation + transferIn - transferOut - spent;
    const target = Math.max(allocation, pocket.monthlyLimit, spent);
    const percent =
      target > 0
        ? Math.min(100, Math.round((Math.max(0, amount) / target) * 100))
        : 0;
    const relatedTransactions = monthTx
      .filter(
        (transaction) =>
          transaction.kind === "expense" &&
          transaction.categoryId &&
          pocket.categoryIds.includes(transaction.categoryId)
      )
      .slice(0, 5);

    return {
      ...pocket,
      amount,
      allocation,
      recommended: recommendedByPocketId.get(pocket.id) ?? 0,
      spent,
      transferIn,
      transferOut,
      target,
      percent,
      status: getPocketStatus(amount, target, spent),
      dailySafe: amount > 0 ? Math.floor(amount / daysLeft) : 0,
      relatedTransactions,
    };
  });

  const allocatedTotal = walletPockets.reduce(
    (sum, pocket) => sum + pocket.allocation,
    0
  );
  const unallocated = monthIncome - allocatedTotal;
  const categoryNameById = Object.fromEntries(
    categories.map((category) => [category.id, category.name])
  );
  const spendBreakdown: SpendBreakdownRow[] = Array.from(
    monthExpenseByCategory.entries()
  )
    .map(([categoryId, amount]) => ({
      categoryId,
      name:
        categoryId === "uncategorized"
          ? null
          : (categoryNameById[categoryId] ?? null),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  const billsDueSoon = recurringTemplates
    .filter(
      (template) =>
        template.kind === "expense" &&
        template.status === "active" &&
        template.nextRunOn
    )
    .slice(0, 3);

  return {
    monthKey,
    monthDate: now.toISOString(),
    summary: {
      monthIncome,
      monthExpense,
      reserved,
      available,
      dailySafe,
      daysLeft,
      allocatedTotal,
      unallocated,
    },
    categories: categories.filter((category) => category.kind === "expense"),
    pockets: walletPockets,
    spendBreakdown,
    transfers: transfers.slice(0, 5),
    billsDueSoon,
    monthExpense,
    hasAnyData: allTx.length > 0 || goals.length > 0,
    hasMonthData: monthTx.length > 0,
  };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const user = await requireUser(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  try {
    if (intent === "create-pocket" || intent === "update-pocket") {
      const raw = {
        id: getOptionalFormString(form, "id"),
        name: form.get("name"),
        description: form.get("description"),
        type: form.get("type"),
        monthlyLimit: form.get("monthlyLimit"),
        mascot: form.get("mascot"),
        surface: form.get("surface"),
        rolloverRule: form.get("rolloverRule"),
        categoryIds: form.getAll("categoryIds"),
      };
      const parsed = walletPocketInputSchema.safeParse(raw);
      if (!parsed.success) {
        return walletActionError(intent, parsed.error.issues[0]?.message);
      }
      if (intent === "update-pocket") {
        if (!parsed.data.id) return walletActionError(intent, "ไม่พบกระเป๋า");
        await repo.updateWalletPocket(user.id, parsed.data.id, parsed.data);
      } else {
        await repo.createWalletPocket(user.id, parsed.data);
      }
      return redirect("/wallet");
    }

    if (intent === "archive-pocket") {
      const parsed = archiveWalletPocketSchema.safeParse({
        id: form.get("id"),
      });
      if (!parsed.success) return walletActionError(intent, "ไม่พบกระเป๋า");
      await repo.archiveWalletPocket(user.id, parsed.data.id);
      return redirect("/wallet");
    }

    if (intent === "reorder-pockets") {
      const parsed = reorderWalletPocketsSchema.safeParse({
        pocketIds: String(form.get("pocketIds") ?? "")
          .split(",")
          .filter(Boolean),
      });
      if (!parsed.success)
        return walletActionError(intent, "เรียงกระเป๋าไม่สำเร็จ");
      await repo.reorderWalletPockets(user.id, parsed.data.pocketIds);
      return { intent };
    }

    if (intent === "apply-plan") {
      const parsed = walletAllocationSchema.safeParse({
        monthKey: form.get("monthKey"),
        allocations: form.getAll("allocation").map(parseAllocationValue),
      });
      if (!parsed.success) {
        return walletActionError(intent, "ตรวจจำนวนเงินในแผนรายเดือนอีกครั้ง");
      }
      await repo.setWalletAllocations(
        user.id,
        parsed.data.monthKey,
        parsed.data.allocations
      );
      return redirect("/wallet");
    }

    if (intent === "transfer") {
      const parsed = walletTransferSchema.safeParse({
        fromPocketId: normalizePocketFormValue(form.get("fromPocketId")),
        toPocketId: normalizePocketFormValue(form.get("toPocketId")),
        amount: form.get("amount"),
        note: form.get("note"),
        occurredAt: new Date().toISOString(),
      });
      if (!parsed.success) {
        return walletActionError(intent, parsed.error.issues[0]?.message);
      }
      await repo.createWalletTransfer(user.id, parsed.data);
      return redirect("/wallet");
    }
  } catch {
    return walletActionError(intent, "บันทึกไม่สำเร็จ ลองอีกครั้ง");
  }

  return walletActionError(intent, "ไม่พบคำสั่งที่ต้องการ");
};

const Wallet = () => {
  const {
    monthDate,
    monthKey,
    summary,
    categories,
    pockets,
    spendBreakdown,
    transfers,
    billsDueSoon,
    monthExpense,
    hasAnyData,
    hasMonthData,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as ActionResult | undefined;
  const { locale } = usePordeeLocale();
  const t = usePordeeTranslation();
  const monthLabel = new Intl.DateTimeFormat(
    locale === "th" ? "th-TH" : "en-US",
    { month: "long", year: "numeric" }
  ).format(new Date(monthDate));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 lg:gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-muted text-sm">
            {t("wallet.header.kicker", { month: monthLabel })}
          </p>
          <h1 className="text-ink text-3xl font-semibold tracking-tight">
            {t("wallet.title")}
          </h1>
          <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
            จัดเงินเดือนนี้ให้เห็นชัดว่าเงินอยู่ในกระเป๋าไหน ใช้ไปเท่าไร
            และควรย้ายเงินตรงไหนก่อนเดือนจบ
          </p>
        </div>
        <CreatePocketDialog categories={categories} />
      </header>

      {actionData?.errors?.general ? (
        <Card className="border-coral/25 bg-coral/10 text-coral rounded-lg px-4 py-3 text-sm">
          {actionData.errors.general}
        </Card>
      ) : null}

      <Card
        aria-label={t("wallet.summary.ariaLabel")}
        className="overflow-hidden rounded-lg"
      >
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_28rem]">
          <CardContent className="bg-teal/10 flex flex-col gap-4 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-ink text-sm font-semibold">
                  {t("wallet.summary.available")}
                </p>
                <p
                  className={cn(
                    "mt-2 text-4xl font-semibold tracking-tight sm:text-5xl",
                    summary.available < 0 ? "text-coral" : "text-teal"
                  )}
                  data-testid="available"
                >
                  {fmtBaht(summary.available)}
                </p>
                <p className="text-muted mt-2 text-sm">
                  หลังหักรายจ่าย เงินเก็บในเป้าหมาย และดูแผนกระเป๋าเดือนนี้
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <TransferDialog
                  pockets={pockets}
                  triggerClassName="h-10 sm:w-auto"
                  triggerSize="md"
                />
                <Button
                  asChild
                  className="h-10 w-full sm:w-auto"
                  variant="teal"
                >
                  <Link to="/add">
                    <Plus className="h-4 w-4" />
                    {t("shell.addTransaction")}
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="border-line bg-surface rounded-md border p-3 sm:p-4">
                <p className="text-ink text-sm font-semibold">
                  {getDailySafeTitle(summary.available, summary.daysLeft, t)}
                </p>
                <p className="text-muted mt-1 text-sm leading-6">
                  {getDailySafeCopy(summary, t)}
                </p>
              </div>
              <div className="border-line bg-surface rounded-md border p-3 sm:p-4">
                <p className="text-ink text-sm font-semibold">
                  เงินยังไม่ได้จัดสรร
                </p>
                <p
                  className={cn(
                    "mt-1 text-2xl font-semibold tabular-nums",
                    summary.unallocated < 0 ? "text-coral" : "text-ink"
                  )}
                >
                  {fmtBaht(summary.unallocated)}
                </p>
                <p className="text-muted mt-1 text-xs leading-5">
                  เทียบจากรายรับเดือนนี้กับเงินที่ใส่ในกระเป๋าทั้งหมด
                </p>
              </div>
            </div>
          </CardContent>

          <div className="border-line grid grid-cols-2 gap-0 border-t xl:border-t-0 xl:border-l">
            <SummaryTile
              label={t("wallet.summary.monthIncome")}
              value={fmtBaht(summary.monthIncome)}
              tone="teal"
            />
            <SummaryTile
              label={t("wallet.summary.monthExpense")}
              value={fmtBaht(summary.monthExpense)}
              tone="coral"
            />
            <SummaryTile
              label="จัดสรรแล้ว"
              value={fmtBaht(summary.allocatedTotal)}
            />
            <SummaryTile
              label={t("wallet.summary.reserved")}
              value={fmtBaht(summary.reserved)}
            />
          </div>
        </div>
      </Card>

      <MonthlyPlanPanel
        monthKey={monthKey}
        pockets={pockets}
        summary={summary}
      />

      <PocketGrid
        ariaLabel={t("wallet.pockets.ariaLabel")}
        categories={categories}
        pockets={pockets}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        {hasAnyData ? (
          <SpendBreakdown
            rows={spendBreakdown}
            totalExpense={monthExpense}
            hasMonthData={hasMonthData}
          />
        ) : (
          <Card className="rounded-lg p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <img
                  alt=""
                  className="h-16 w-16 shrink-0 object-contain"
                  loading="lazy"
                  src="/brand/mascots/normal.png"
                />
                <div>
                  <h2 className="text-ink text-base font-semibold">
                    {t("wallet.empty.title")}
                  </h2>
                  <p className="text-muted mt-1 max-w-2xl text-sm leading-6">
                    เริ่มจากเพิ่มรายรับก่อน แล้วกด “ใช้แผนแนะนำ”
                    เพื่อให้พอดีแบ่งเงินลงกระเป๋า
                  </p>
                </div>
              </div>
              <Button asChild className="w-full sm:w-auto">
                <Link to="/add">
                  {t("shell.addTransaction")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>
        )}

        <WalletInsightPanel
          billsDueSoon={billsDueSoon}
          pockets={pockets}
          transfers={transfers}
        />
      </div>
    </div>
  );
};

export default Wallet;

const SummaryTile = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "teal" | "coral";
}) => {
  return (
    <div className="border-line flex min-h-24 flex-col justify-between border-r border-b p-4 even:border-r-0 sm:p-5">
      <p className="text-muted text-xs">{label}</p>
      <p
        className={cn(
          "mt-2 text-lg font-semibold tabular-nums",
          tone === "teal" && "text-teal",
          tone === "coral" && "text-coral",
          !tone && "text-ink"
        )}
      >
        {value}
      </p>
    </div>
  );
};

const MonthlyPlanPanel = ({
  monthKey,
  pockets,
  summary,
}: {
  monthKey: string;
  pockets: LoaderPocket[];
  summary: WalletSummary;
}) => {
  const navigation = useNavigation();
  const isSubmitting =
    navigation.formData?.get("intent") === "apply-plan" &&
    navigation.state !== "idle";
  const planPercent =
    summary.monthIncome > 0
      ? Math.min(
          100,
          Math.round((summary.allocatedTotal / summary.monthIncome) * 100)
        )
      : 0;

  return (
    <Card className="rounded-lg">
      <CardHeader className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="text-teal h-4 w-4" />
            <CardTitle>จัดเงินเดือนนี้</CardTitle>
          </div>
          <CardDescription className="mt-1 leading-6">
            ใช้แผนแนะนำเป็นจุดเริ่ม แล้วปรับจำนวนเงินในแต่ละกระเป๋าได้ทันที
          </CardDescription>
        </div>
        <div className="text-muted text-sm tabular-nums">
          จัดสรรแล้ว {planPercent}% ของรายรับเดือนนี้
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="p-4 sm:p-5">
        <Form method="post">
          <input type="hidden" name="intent" value="apply-plan" />
          <input type="hidden" name="monthKey" value={monthKey} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {pockets.map((pocket) => (
              <label
                className="border-line bg-sky/35 block rounded-md border p-3"
                key={pocket.id}
              >
                <span className="text-ink block text-sm font-semibold">
                  {pocket.name}
                </span>
                <span className="text-muted mt-1 block text-xs">
                  แนะนำ {fmtBaht(pocket.recommended)}
                </span>
                <Input
                  className="mt-3"
                  defaultValue={Math.round(pocket.allocation)}
                  min={0}
                  name="allocationAmount"
                  onChange={(event) => {
                    const hidden = event.currentTarget
                      .closest("label")
                      ?.querySelector<HTMLInputElement>(
                        'input[name="allocation"]'
                      );
                    if (hidden) {
                      hidden.value = `${pocket.id}:${event.currentTarget.value}`;
                    }
                  }}
                  type="number"
                />
                <input
                  type="hidden"
                  name="allocation"
                  value={`${pocket.id}:${Math.round(pocket.allocation)}`}
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted text-sm">
              เหลือยังไม่ได้จัดสรร {fmtBaht(summary.unallocated)}
            </p>
            <Button className="w-full sm:w-auto" type="submit" variant="teal">
              <SlidersHorizontal className="h-4 w-4" />
              {isSubmitting ? "กำลังใช้แผน" : "ใช้แผนนี้"}
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
};

const statusMeta: Record<
  PocketStatus,
  { label: string; tone: BadgeProps["tone"] }
> = {
  empty: { label: "ยังไม่ได้กันเงิน", tone: "neutral" },
  low: { label: "ใกล้หมด", tone: "coral" },
  over: { label: "ใช้เกินแล้ว", tone: "coral" },
  normal: { label: "กำลังพอดี", tone: "teal" },
};

const PocketGrid = ({
  ariaLabel,
  categories,
  pockets,
}: {
  ariaLabel: string;
  categories: Category[];
  pockets: LoaderPocket[];
}) => {
  const fetcher = useFetcher();
  const [draggingPocketId, setDraggingPocketId] = React.useState<string | null>(
    null
  );
  const [overPocketId, setOverPocketId] = React.useState<string | null>(null);

  const submitOrder = (fromPocketId: string, toPocketId: string) => {
    if (fromPocketId === toPocketId) return;
    const currentIds = pockets.map((pocket) => pocket.id);
    const fromIndex = currentIds.indexOf(fromPocketId);
    const toIndex = currentIds.indexOf(toPocketId);
    if (fromIndex < 0 || toIndex < 0) return;

    const nextIds = [...currentIds];
    const [movedId] = nextIds.splice(fromIndex, 1);
    nextIds.splice(toIndex, 0, movedId);

    fetcher.submit(
      { intent: "reorder-pockets", pocketIds: nextIds.join(",") },
      { method: "post", preventScrollReset: true }
    );
  };

  return (
    <section
      aria-label={ariaLabel}
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => {
        setDraggingPocketId(null);
        setOverPocketId(null);
      }}
    >
      {pockets.map((pocket) => (
        <PocketCard
          categories={categories}
          isDragOver={overPocketId === pocket.id}
          isDragging={draggingPocketId === pocket.id}
          key={pocket.id}
          onDragEnd={() => {
            setDraggingPocketId(null);
            setOverPocketId(null);
          }}
          onDragEnter={() => {
            if (draggingPocketId && draggingPocketId !== pocket.id) {
              setOverPocketId(pocket.id);
            }
          }}
          onDragStart={(event) => {
            setDraggingPocketId(pocket.id);
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", pocket.id);
          }}
          onDrop={(event) => {
            event.preventDefault();
            const draggedId =
              event.dataTransfer.getData("text/plain") || draggingPocketId;
            if (draggedId) submitOrder(draggedId, pocket.id);
            setDraggingPocketId(null);
            setOverPocketId(null);
          }}
          pocket={pocket}
          pockets={pockets}
        />
      ))}
    </section>
  );
};

const PocketCard = ({
  categories,
  isDragging,
  isDragOver,
  onDragEnd,
  onDragEnter,
  onDragStart,
  onDrop,
  pocket,
  pockets,
}: {
  categories: Category[];
  isDragging: boolean;
  isDragOver: boolean;
  onDragEnd: () => void;
  onDragEnter: () => void;
  onDragStart: (event: React.DragEvent<HTMLElement>) => void;
  onDrop: (event: React.DragEvent<HTMLElement>) => void;
  pocket: LoaderPocket;
  pockets: LoaderPocket[];
}) => {
  const status = statusMeta[pocket.status];
  const surface = surfaceMeta[pocket.surface];

  return (
    <Card
      aria-grabbed={isDragging}
      className={cn(
        "flex min-h-[28rem] flex-col overflow-hidden rounded-lg transition",
        isDragging && "scale-[0.99] opacity-60",
        isDragOver && "border-teal ring-teal/30 ring-2"
      )}
      data-testid="wallet-pocket-card"
      draggable
      onDragEnd={onDragEnd}
      onDragEnter={onDragEnter}
      onDragStart={onDragStart}
      onDrop={onDrop}
    >
      <div className={cn("flex h-28 items-center justify-center", surface.bg)}>
        <img
          alt=""
          className="h-20 w-20 object-contain sm:h-24 sm:w-24"
          loading="lazy"
          src={getMascotSrc(pocket.mascot)}
        />
      </div>

      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span
                aria-label={`ลากเพื่อเรียง ${pocket.name}`}
                className="border-line text-muted flex h-7 w-7 cursor-grab items-center justify-center rounded-xs border active:cursor-grabbing"
                role="img"
              >
                <GripVertical className="h-4 w-4" />
              </span>
              <h2 className="text-ink text-base font-semibold">
                {pocket.name}
              </h2>
            </div>
            <p className="text-muted mt-1 line-clamp-2 text-sm leading-6">
              {pocket.description}
            </p>
          </div>
          <Badge className="shrink-0" tone={status.tone}>
            {status.label}
          </Badge>
        </div>

        <div className="mt-auto pt-5">
          <p className="text-muted text-sm font-semibold">เหลือใช้ได้</p>
          <p
            className={cn(
              "mt-1 text-2xl font-semibold tracking-tight tabular-nums",
              pocket.amount < 0 ? "text-coral" : surface.text
            )}
          >
            {fmtBaht(pocket.amount)}
          </p>
          <Progress
            className="mt-2 rounded-xs"
            indicatorClassName={cn("rounded-xs", surface.bar)}
            value={pocket.percent}
          />
          <div className="mt-2 flex items-center justify-between gap-3 text-xs">
            <span className="text-muted">จาก {fmtBaht(pocket.target)}</span>
            <span className={cn("font-semibold", surface.text)}>
              {pocket.percent}%
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <PocketMetric label="ใช้ไป" value={fmtBaht(pocket.spent)} />
            <PocketMetric
              label="ใช้ได้/วัน"
              value={fmtBaht(pocket.dailySafe)}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <PocketDetailDialog pocket={pocket} />
            <TransferDialog
              pockets={pockets}
              triggerPocketId={pocket.id}
              triggerVariant="secondary"
            />
          </div>
          <EditPocketDialog categories={categories} pocket={pocket} />
        </div>
      </CardContent>
    </Card>
  );
};

const PocketMetric = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-sky/45 rounded-md px-2.5 py-2">
    <p className="text-muted">{label}</p>
    <p className="text-ink mt-1 font-semibold tabular-nums">{value}</p>
  </div>
);

const PocketDetailDialog = ({ pocket }: { pocket: LoaderPocket }) => (
  <Dialog>
    <DialogTrigger asChild>
      <Button className="w-full" size="sm" variant="secondary">
        รายละเอียด
      </Button>
    </DialogTrigger>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{pocket.name}</DialogTitle>
        <DialogDescription>{pocket.description}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-3 sm:grid-cols-3">
        <PocketMetric label="จัดสรร" value={fmtBaht(pocket.allocation)} />
        <PocketMetric label="ใช้ไป" value={fmtBaht(pocket.spent)} />
        <PocketMetric label="ย้ายเข้า" value={fmtBaht(pocket.transferIn)} />
      </div>
      <div>
        <h3 className="text-ink text-sm font-semibold">รายการล่าสุด</h3>
        {pocket.relatedTransactions.length === 0 ? (
          <p className="text-muted mt-2 text-sm">
            ยังไม่มีรายการที่ผูกกับกระเป๋านี้ในเดือนนี้
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {pocket.relatedTransactions.map((transaction) => (
              <li
                className="border-line flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                key={transaction.id}
              >
                <span className="text-ink">{transaction.title}</span>
                <span className="text-coral tabular-nums">
                  {fmtBaht(transaction.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <DialogFooter>
        <Button asChild variant="secondary">
          <Link to="/history">
            เปิดประวัติ
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const PocketDialogShell = ({
  children,
  intent,
}: {
  children: (state: {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  }) => React.ReactNode;
  intent: string;
}) => {
  const [open, setOpen] = React.useState(false);
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>() as ActionResult | undefined;
  const submittedRef = React.useRef(false);

  React.useEffect(() => {
    const activeIntent = navigation.formData?.get("intent");
    if (open && navigation.state !== "idle" && activeIntent === intent) {
      submittedRef.current = true;
    }

    if (open && navigation.state === "idle" && submittedRef.current) {
      const hasError =
        actionData?.intent === intent && Boolean(actionData.errors);
      if (!hasError) {
        window.setTimeout(() => setOpen(false), 0);
      }
      submittedRef.current = false;
    }
  }, [actionData, intent, navigation.formData, navigation.state, open]);

  return children({ open, setOpen });
};

const CreatePocketDialog = ({ categories }: { categories: Category[] }) => (
  <PocketDialogShell intent="create-pocket">
    {({ open, setOpen }) => (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="teal">
            <Plus className="h-4 w-4" />
            เพิ่มกระเป๋า
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>เพิ่มกระเป๋า</DialogTitle>
            <DialogDescription>
              สร้างกระเป๋าใหม่ แล้วเลือกหมวดที่เข้ากับเงินก้อนนี้
            </DialogDescription>
          </DialogHeader>
          <PocketForm categories={categories} intent="create-pocket" />
        </DialogContent>
      </Dialog>
    )}
  </PocketDialogShell>
);

const EditPocketDialog = ({
  categories,
  pocket,
}: {
  categories: Category[];
  pocket: LoaderPocket;
}) => (
  <PocketDialogShell intent="update-pocket">
    {({ open, setOpen }) => (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            className="mt-2 w-full justify-between"
            size="sm"
            variant="ghost"
          >
            <span className="inline-flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              แก้ไขกระเป๋า
            </span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>แก้ไข {pocket.name}</DialogTitle>
            <DialogDescription>
              เปลี่ยนชื่อ วงเงิน มาสคอต และหมวดที่ผูกกับกระเป๋านี้
            </DialogDescription>
          </DialogHeader>
          <PocketForm
            categories={categories}
            intent="update-pocket"
            pocket={pocket}
          />
          <Form method="post" className="border-line mt-4 border-t pt-4">
            <input type="hidden" name="intent" value="archive-pocket" />
            <input type="hidden" name="id" value={pocket.id} />
            <Button type="submit" variant="secondary">
              <Trash2 className="h-4 w-4" />
              พักกระเป๋านี้
            </Button>
          </Form>
        </DialogContent>
      </Dialog>
    )}
  </PocketDialogShell>
);

const PocketForm = ({
  categories,
  intent,
  pocket,
}: {
  categories: Category[];
  intent: "create-pocket" | "update-pocket";
  pocket?: LoaderPocket;
}) => {
  const navigation = useNavigation();
  const isSubmitting =
    navigation.formData?.get("intent") === intent &&
    navigation.state !== "idle";
  const defaults = pocket ?? pocketTemplateOptions[0];
  const [name, setName] = React.useState(defaults.name);
  const [description, setDescription] = React.useState(defaults.description);
  const [monthlyLimit, setMonthlyLimit] = React.useState(
    String(Math.round(defaults.monthlyLimit))
  );
  const [type, setType] = React.useState(defaults.type);
  const [mascot, setMascot] = React.useState(defaults.mascot);
  const [surface, setSurface] = React.useState(defaults.surface);
  const [rolloverRule, setRolloverRule] = React.useState(defaults.rolloverRule);
  const [selectedCategoryIds, setSelectedCategoryIds] = React.useState(
    defaults.categoryIds as string[]
  );
  const actionData = useActionData<typeof action>() as ActionResult | undefined;
  const formError =
    actionData?.intent === intent ? actionData.errors?.general : undefined;

  const applyTemplate = (template: (typeof pocketTemplateOptions)[number]) => {
    setName(template.name);
    setDescription(template.description);
    setMonthlyLimit(String(template.monthlyLimit));
    setType(template.type);
    setMascot(template.mascot);
    setSurface(template.surface);
    setRolloverRule(template.rolloverRule);
    setSelectedCategoryIds(template.categoryIds as string[]);
  };

  const toggleCategory = (categoryId: string, checked: boolean) => {
    setSelectedCategoryIds((current) =>
      checked
        ? Array.from(new Set([...current, categoryId]))
        : current.filter((id) => id !== categoryId)
    );
  };

  return (
    <Form method="post" className="flex flex-col gap-4">
      <input type="hidden" name="intent" value={intent} />
      {pocket ? <input type="hidden" name="id" value={pocket.id} /> : null}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="mascot" value={mascot} />
      <input type="hidden" name="surface" value={surface} />
      <input type="hidden" name="rolloverRule" value={rolloverRule} />
      {selectedCategoryIds.map((categoryId) => (
        <input
          key={categoryId}
          type="hidden"
          name="categoryIds"
          value={categoryId}
        />
      ))}

      {formError ? (
        <div className="border-coral/25 bg-coral/10 text-coral rounded-md border px-3 py-2 text-sm">
          {formError}
        </div>
      ) : null}

      {!pocket ? (
        <div>
          <Label>เลือก template</Label>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {pocketTemplateOptions.map((template) => (
              <button
                className="border-line hover:bg-sky focus-visible:ring-coral/30 rounded-md border p-3 text-left transition focus-visible:ring-2 focus-visible:outline-none"
                key={template.name}
                type="button"
                onClick={() => applyTemplate(template)}
              >
                <img
                  alt=""
                  className="h-12 w-12 object-contain"
                  src={getMascotSrc(template.mascot)}
                />
                <span className="text-ink mt-2 block text-sm font-semibold">
                  {template.name}
                </span>
                <span className="text-muted text-xs">
                  {template.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="ชื่อกระเป๋า">
          <Input
            name="name"
            onChange={(event) => setName(event.currentTarget.value)}
            placeholder="เช่น ค่าอาหาร หรือ เงินเที่ยว"
            required
            value={name}
          />
        </Field>
        <Field label="วงเงินเดือนนี้">
          <Input
            min={0}
            name="monthlyLimit"
            onChange={(event) => setMonthlyLimit(event.currentTarget.value)}
            type="number"
            value={monthlyLimit}
          />
        </Field>
      </div>

      <Field label="คำอธิบาย">
        <Textarea
          name="description"
          onChange={(event) => setDescription(event.currentTarget.value)}
          placeholder="บอกไว้สั้น ๆ ว่ากระเป๋านี้ใช้กับอะไร"
          value={description}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="ประเภท">
          <Select
            onValueChange={(value) => setType(value as WalletPocket["type"])}
            value={type}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกประเภท" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">ใช้ประจำวัน</SelectItem>
              <SelectItem value="travel">เดินทาง</SelectItem>
              <SelectItem value="bills">บิล</SelectItem>
              <SelectItem value="reserve">สำรอง</SelectItem>
              <SelectItem value="custom">กำหนดเอง</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="มาสคอต">
          <Select
            onValueChange={(value) =>
              setMascot(value as WalletPocket["mascot"])
            }
            value={mascot}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกมาสคอต" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="happy">ถือเหรียญ</SelectItem>
              <SelectItem value="normal">ยิ้มเบา ๆ</SelectItem>
              <SelectItem value="thinking">เตือนบิล</SelectItem>
              <SelectItem value="saving">เก็บเงิน</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="สีพื้น">
          <Select
            onValueChange={(value) =>
              setSurface(value as WalletPocket["surface"])
            }
            value={surface}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกสีพื้น" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="teal">เขียวพอดี</SelectItem>
              <SelectItem value="lime">ไลม์อ่อน</SelectItem>
              <SelectItem value="coral">คอรัล</SelectItem>
              <SelectItem value="sky">ฟ้าอ่อน</SelectItem>
              <SelectItem value="neutral">เรียบ</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="ปลายเดือนถ้าเหลือเงิน">
        <Select
          onValueChange={(value) =>
            setRolloverRule(value as WalletPocket["rolloverRule"])
          }
          value={rolloverRule}
        >
          <SelectTrigger>
            <SelectValue placeholder="เลือกวิธีจัดการเงินเหลือ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="keep">เก็บไว้ในกระเป๋านี้</SelectItem>
            <SelectItem value="reset">เริ่มใหม่เดือนหน้า</SelectItem>
            <SelectItem value="move_to_reserve">ย้ายเข้าเงินสำรอง</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <fieldset>
        <legend className="text-ink text-sm font-medium">
          หมวดรายจ่ายที่ผูกกับกระเป๋านี้
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {categories.map((category) => (
            <div
              className="border-line flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
              key={category.id}
            >
              <Checkbox
                checked={selectedCategoryIds.includes(category.id)}
                id={`wallet-category-${category.id}`}
                onCheckedChange={(checked) =>
                  toggleCategory(category.id, checked === true)
                }
              />
              <Label
                className="flex-1 cursor-pointer"
                htmlFor={`wallet-category-${category.id}`}
              >
                {category.name}
              </Label>
            </div>
          ))}
        </div>
      </fieldset>

      <DialogFooter>
        <Button type="submit" variant="teal">
          {isSubmitting ? "กำลังบันทึก" : "บันทึกกระเป๋า"}
        </Button>
      </DialogFooter>
    </Form>
  );
};

const TransferDialog = ({
  pockets,
  triggerClassName,
  triggerPocketId,
  triggerSize = "sm",
  triggerVariant = "secondary",
}: {
  pockets: LoaderPocket[];
  triggerClassName?: string;
  triggerPocketId?: string;
  triggerSize?: "sm" | "md";
  triggerVariant?: "secondary" | "teal";
}) => {
  const navigation = useNavigation();
  const isSubmitting =
    navigation.formData?.get("intent") === "transfer" &&
    navigation.state !== "idle";

  return (
    <PocketDialogShell intent="transfer">
      {({ open, setOpen }) => (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              className={cn("w-full", triggerClassName)}
              size={triggerSize}
              variant={triggerVariant}
            >
              <Shuffle className="h-4 w-4" />
              ย้ายเงิน
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ย้ายเงินระหว่างกระเป๋า</DialogTitle>
              <DialogDescription>
                ใช้เมื่อต้องเติมกระเป๋าที่ใกล้หมด หรือนำเงินเหลือกลับมากองกลาง
              </DialogDescription>
            </DialogHeader>
            <Form method="post" className="flex flex-col gap-4">
              <input type="hidden" name="intent" value="transfer" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="จาก">
                  <Select
                    defaultValue={triggerPocketId ?? NO_POCKET_VALUE}
                    name="fromPocketId"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกต้นทาง" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_POCKET_VALUE}>
                        เงินที่ยังไม่ได้จัดสรร
                      </SelectItem>
                      {pockets.map((pocket) => (
                        <SelectItem key={pocket.id} value={pocket.id}>
                          {pocket.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="ไปที่">
                  <Select
                    defaultValue={
                      triggerPocketId
                        ? NO_POCKET_VALUE
                        : (pockets[0]?.id ?? NO_POCKET_VALUE)
                    }
                    name="toPocketId"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกปลายทาง" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_POCKET_VALUE}>
                        เงินที่ยังไม่ได้จัดสรร
                      </SelectItem>
                      {pockets.map((pocket) => (
                        <SelectItem key={pocket.id} value={pocket.id}>
                          {pocket.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="จำนวนเงิน">
                <Input min={1} name="amount" required type="number" />
              </Field>
              <Field label="บันทึก">
                <Input
                  name="note"
                  placeholder="เช่น เติมค่าเดินทางสัปดาห์นี้"
                />
              </Field>
              <DialogFooter>
                <Button type="submit" variant="teal">
                  {isSubmitting ? "กำลังย้ายเงิน" : "ย้ายเงิน"}
                </Button>
              </DialogFooter>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </PocketDialogShell>
  );
};

const WalletInsightPanel = ({
  billsDueSoon,
  pockets,
  transfers,
}: {
  billsDueSoon: RecurringTemplate[];
  pockets: LoaderPocket[];
  transfers: WalletTransfer[];
}) => {
  const riskyPockets = pockets.filter(
    (pocket) => pocket.status === "low" || pocket.status === "over"
  );

  return (
    <aside className="flex flex-col gap-4">
      <Card className="rounded-lg">
        <CardHeader className="flex-row items-center gap-2 p-4 pb-0">
          <Landmark className="text-teal h-4 w-4 shrink-0" />
          <CardTitle>สัญญาณเดือนนี้</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 p-4">
          {riskyPockets.length === 0 ? (
            <p className="text-muted text-sm leading-6">
              ตอนนี้กระเป๋าหลักยังอยู่ในระดับที่ควบคุมได้
            </p>
          ) : (
            riskyPockets.slice(0, 3).map((pocket) => (
              <div className="bg-coral/10 rounded-md p-3" key={pocket.id}>
                <p className="text-coral text-sm font-semibold">
                  {pocket.name}
                </p>
                <p className="text-muted mt-1 text-xs">
                  เหลือ {fmtBaht(pocket.amount)} ลองย้ายเงินหรือปรับวงเงิน
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader className="p-4 pb-0">
          <CardTitle>บิลใกล้ถึง</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {billsDueSoon.length === 0 ? (
            <p className="text-muted text-sm">
              ยังไม่มีรายการประจำที่รอจ่ายในระบบ
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {billsDueSoon.map((bill) => (
                <li className="text-sm" key={bill.id}>
                  <span className="text-ink font-medium">{bill.title}</span>
                  <span className="text-muted block text-xs">
                    กำหนด {bill.nextRunOn} · {fmtBaht(bill.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader className="p-4 pb-0">
          <CardTitle>การย้ายเงินล่าสุด</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {transfers.length === 0 ? (
            <p className="text-muted text-sm">
              ยังไม่มีการย้ายเงินระหว่างกระเป๋า
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {transfers.map((transfer) => (
                <li
                  className="border-line rounded-md border px-3 py-2 text-sm"
                  key={transfer.id}
                >
                  <span className="text-ink font-medium">
                    {fmtBaht(transfer.amount)}
                  </span>
                  <span className="text-muted block text-xs">
                    {transfer.note || "ย้ายเงิน"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </aside>
  );
};

const SpendBreakdown = ({
  rows,
  totalExpense,
  hasMonthData,
}: {
  rows: SpendBreakdownRow[];
  totalExpense: number;
  hasMonthData: boolean;
}) => {
  const t = usePordeeTranslation();

  return (
    <Card aria-label={t("wallet.breakdown.ariaLabel")} className="rounded-lg">
      <CardHeader className="flex-row items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div>
          <CardTitle>{t("wallet.breakdown.title")}</CardTitle>
          <CardDescription>{t("wallet.breakdown.description")}</CardDescription>
        </div>
        <Link to="/history" className="text-muted hover:text-ink text-xs">
          {t("wallet.breakdown.openHistory")}
        </Link>
      </CardHeader>
      <Separator />

      <CardContent className="p-4 sm:p-5">
        {rows.length === 0 ? (
          <div className="border-line bg-sky/45 flex items-center gap-4 rounded-md border p-4">
            <img
              alt=""
              className="h-12 w-12 shrink-0 object-contain"
              loading="lazy"
              src="/brand/mascots/thinking.png"
            />
            <div>
              <p className="text-ink text-sm font-semibold">
                {hasMonthData
                  ? t("wallet.breakdown.emptyExpense")
                  : t("wallet.breakdown.emptyMonth")}
              </p>
              <p className="text-muted mt-1 text-sm leading-6">
                {t("wallet.breakdown.emptyDescription")}
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((row) => {
              const pct = getSharePercent(row.amount, totalExpense);
              const rowName = row.name ?? t("transaction.noCategory.long");
              return (
                <li key={row.categoryId}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-ink font-medium">{rowName}</span>
                    <span className="text-muted shrink-0 text-xs tabular-nums">
                      {fmtBaht(row.amount)}
                      <span className="block text-right text-[11px]">
                        {t("wallet.breakdown.share", { pct })}
                      </span>
                    </span>
                  </div>
                  <Progress
                    aria-label={t("wallet.breakdown.shareAriaLabel", {
                      name: rowName,
                      pct,
                    })}
                    className="mt-2"
                    indicatorClassName="bg-coral"
                    value={pct}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

const Field = ({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) => (
  <div className="block">
    <Label className="mb-2 block">{label}</Label>
    {children}
  </div>
);

const surfaceMeta: Record<
  WalletPocket["surface"],
  { bg: string; bar: string; text: string }
> = {
  teal: { bg: "bg-teal/10", bar: "bg-teal", text: "text-teal" },
  lime: { bg: "bg-lime/25", bar: "bg-lime-strong", text: "text-ink" },
  coral: { bg: "bg-coral/10", bar: "bg-coral", text: "text-coral" },
  sky: { bg: "bg-sky", bar: "bg-teal/70", text: "text-ink" },
  neutral: { bg: "bg-line/35", bar: "bg-teal/70", text: "text-teal" },
};

const pocketTemplateOptions = [
  {
    name: "กินข้าว",
    description: "ค่าอาหาร กาแฟ และของกินระหว่างวัน",
    type: "daily",
    monthlyLimit: 0,
    mascot: "happy",
    surface: "teal",
    rolloverRule: "reset",
    categoryIds: [],
  },
  {
    name: "เดินทาง",
    description: "รถไฟฟ้า แท็กซี่ น้ำมัน และค่าเดินทาง",
    type: "travel",
    monthlyLimit: 0,
    mascot: "normal",
    surface: "lime",
    rolloverRule: "reset",
    categoryIds: [],
  },
  {
    name: "เตือนบิล",
    description: "ค่าเน็ต ค่าไฟ subscription และบิลบ้าน",
    type: "bills",
    monthlyLimit: 0,
    mascot: "thinking",
    surface: "coral",
    rolloverRule: "keep",
    categoryIds: [],
  },
  {
    name: "เงินสำรอง",
    description: "เงินกันไว้ก่อนใช้กับเรื่องไม่คาดคิด",
    type: "reserve",
    monthlyLimit: 0,
    mascot: "saving",
    surface: "neutral",
    rolloverRule: "keep",
    categoryIds: [],
  },
] satisfies Array<
  Pick<
    WalletPocket,
    | "name"
    | "description"
    | "type"
    | "monthlyLimit"
    | "mascot"
    | "surface"
    | "rolloverRule"
    | "categoryIds"
  >
>;

const getMascotSrc = (mascot: WalletPocket["mascot"]) => {
  const srcByMascot: Record<WalletPocket["mascot"], string> = {
    happy: "/brand/mascots/happy.png",
    normal: "/brand/mascots/normal.png",
    thinking: "/brand/mascots/thinking.png",
    saving: "/brand/mascots/saving.png",
  };
  return srcByMascot[mascot];
};

const getRecommendedAllocations = (
  pockets: WalletPocket[],
  monthIncome: number
) => {
  const weights: Record<WalletPocket["type"], number> = {
    daily: 0.38,
    travel: 0.12,
    bills: 0.22,
    reserve: 0.18,
    custom: 0.1,
  };
  const totalWeight = pockets.reduce(
    (sum, pocket) => sum + weights[pocket.type],
    0
  );
  const recommended = new Map<string, number>();
  for (const pocket of pockets) {
    const amount =
      pocket.monthlyLimit > 0
        ? pocket.monthlyLimit
        : roundToHundred((monthIncome * weights[pocket.type]) / totalWeight);
    recommended.set(pocket.id, amount);
  }
  return recommended;
};

const getTransferTotals = (transfers: WalletTransfer[]) => {
  const inByPocketId = new Map<string, number>();
  const outByPocketId = new Map<string, number>();
  for (const transfer of transfers) {
    if (transfer.toPocketId) {
      inByPocketId.set(
        transfer.toPocketId,
        (inByPocketId.get(transfer.toPocketId) ?? 0) + transfer.amount
      );
    }
    if (transfer.fromPocketId) {
      outByPocketId.set(
        transfer.fromPocketId,
        (outByPocketId.get(transfer.fromPocketId) ?? 0) + transfer.amount
      );
    }
  }
  return { inByPocketId, outByPocketId };
};

const getPocketSpent = ({
  categoryIds,
  expenseByCategory,
  reserveSpent,
}: {
  categoryIds: string[];
  expenseByCategory: Map<string, number>;
  reserveSpent: number;
}) => {
  return (
    reserveSpent +
    categoryIds.reduce(
      (sum, categoryId) => sum + (expenseByCategory.get(categoryId) ?? 0),
      0
    )
  );
};

const getPocketStatus = (
  amount: number,
  target: number,
  spent: number
): PocketStatus => {
  if (target <= 0) return "empty";
  if (amount < 0 || spent > target) return "over";
  if (amount / target <= 0.15) return "low";
  return "normal";
};

const getDailySafeTitle = (
  available: number,
  daysLeft: number,
  t: ReturnType<typeof usePordeeTranslation>
) => {
  if (available < 0) return t("wallet.dailySafe.overTitle");
  return t("wallet.dailySafe.daysLeftTitle", { daysLeft });
};

const getDailySafeCopy = (
  summary: WalletSummary,
  t: ReturnType<typeof usePordeeTranslation>
) => {
  if (summary.monthIncome === 0 && summary.monthExpense === 0) {
    return t("wallet.dailySafe.noDataCopy");
  }
  if (summary.available < 0) {
    return t("wallet.dailySafe.overCopy");
  }
  return t("wallet.dailySafe.normalCopy", {
    amount: fmtBaht(summary.dailySafe),
  });
};

const getMonthKey = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
};

const roundToHundred = (amount: number): number => {
  if (amount <= 0) return 0;
  return Math.ceil(amount / 100) * 100;
};

const parseAllocationValue = (value: FormDataEntryValue) => {
  const [pocketId, amount] = String(value).split(":");
  return { pocketId, amount: Number(amount) };
};

const normalizePocketFormValue = (value: FormDataEntryValue | null) => {
  if (!value || value === NO_POCKET_VALUE) return null;
  return String(value);
};

const getOptionalFormString = (form: FormData, name: string) => {
  const value = form.get(name);
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  return value;
};

const walletActionError = (
  intent: string,
  message = "ตรวจข้อมูลอีกครั้ง"
): ActionResult => ({
  intent,
  errors: { general: message },
});
