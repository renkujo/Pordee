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
import { DiscountAmountField } from "~/components/transactions/discount-amount-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { DatePicker } from "~/components/ui/date-picker";
import { cn } from "~/lib/cn";
import { repo } from "~/lib/db";
import { requireUser } from "~/lib/auth.server";
import type { Category } from "~/lib/db";
import {
  getTransactionDiscountState,
  updateTransactionSchema,
} from "~/lib/validators/transaction";
import { fmtSignedBaht } from "~/lib/format/baht";
import {
  dayValueToIso,
  formatDayLabel,
  isoToDayValue,
  todayDayValue,
} from "~/lib/date/day-value";
import { usePordeeTranslation } from "~/lib/i18n/provider";

const NO_CATEGORY_VALUE = "__none__";

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const meta = (_: Route.MetaArgs) => {
  return [{ title: "พอดี — แก้ไขรายการ" }];
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const user = await requireUser(request);
  const tx = await repo.getTransaction(user.id, params.id);
  if (!tx) {
    throw data("ไม่พบรายการ", { status: 404 });
  }
  const categories = await repo.listCategories(user.id);
  return { tx, categories };
};

interface ActionFieldErrors {
  title?: string;
  amount?: string;
  discountAmount?: string;
  kind?: string;
}

type ActionResult =
  | { ok: false; errors: ActionFieldErrors; values: Record<string, string> }
  | undefined;

export const action = async ({
  params,
  request,
}: Route.ActionArgs): Promise<ActionResult | Response> => {
  const user = await requireUser(request);
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "delete") {
    const ok = await repo.deleteTransaction(user.id, params.id);
    if (!ok) {
      throw data("ไม่พบรายการ", { status: 404 });
    }
    return redirect("/history");
  }

  const categoryValue = form.get("categoryId");
  const rawOccurredAt = form.get("occurredAt");
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

  const raw = {
    kind: rawKind,
    title: form.get("title"),
    amount: discountState.canUseNetAmount ? discountState.netAmount : rawAmount,
    categoryId:
      typeof categoryValue === "string" && categoryValue !== NO_CATEGORY_VALUE
        ? categoryValue
        : null,
    note: form.get("note") || null,
    occurredAt:
      dayValueToIso(typeof rawOccurredAt === "string" ? rawOccurredAt : null) ??
      rawOccurredAt,
  };

  const parsed = updateTransactionSchema.safeParse(raw);
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
        kind: String(rawKind ?? "expense"),
        title: String(raw.title ?? ""),
        amount: String(rawAmount ?? ""),
        discountAmount: String(rawDiscountAmount ?? ""),
        categoryId: String(categoryValue ?? NO_CATEGORY_VALUE),
        note: String(form.get("note") ?? ""),
        occurredAt: typeof rawOccurredAt === "string" ? rawOccurredAt : "",
      },
    };
  }

  const updated = await repo.updateTransaction(user.id, params.id, parsed.data);
  if (!updated) {
    throw data("ไม่พบรายการ", { status: 404 });
  }
  return redirect("/history");
};

const EditTransaction = () => {
  const { tx, categories } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionResult>();
  const t = usePordeeTranslation();

  const [kind, setKind] = useState<"expense" | "income">(tx.kind);
  const [amount, setAmount] = useState(
    actionData?.values?.amount ?? String(tx.amount)
  );
  const [discountAmount, setDiscountAmount] = useState(
    actionData?.values?.discountAmount ?? ""
  );
  const [categoryId, setCategoryId] = useState<string>(tx.categoryId ?? "");
  const [occurredDate, setOccurredDate] = useState(
    isoToDayValue(tx.occurredAt)
  );

  const filteredCategories = useMemo(
    () => categories.filter((c: Category) => c.kind === kind),
    [categories, kind]
  );
  const selectedCategory =
    categories.find((c: Category) => c.id === categoryId)?.name ??
    t("transaction.noCategory.long");
  const createdDate = dateFormatter.format(new Date(tx.createdAt));
  const occurredLabel = formatDayLabel(occurredDate);
  const originalOccurredLabel = dateFormatter.format(new Date(tx.occurredAt));
  const discountState = getTransactionDiscountState({
    kind,
    amount,
    discountAmount,
  });
  const { hasDiscountInput, hasValidDiscount, netAmount } = discountState;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-3">
            <Link to="/history">
              <ArrowLeft className="h-4 w-4" />
              {t("edit.backToHistory")}
            </Link>
          </Button>
          <h1 className="text-ink text-2xl font-semibold">{t("edit.title")}</h1>
          <p className="text-muted text-sm">{t("edit.description")}</p>
        </div>
        <Badge tone={kind === "income" ? "teal" : "coral"} className="w-fit">
          {t(
            kind === "income"
              ? "transaction.kind.income"
              : "transaction.kind.expense"
          )}{" "}
          {fmtSignedBaht(tx.amount, kind)}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <Form method="post" className="contents">
            <Card>
              <CardHeader>
                <CardTitle>{t("edit.form.title")}</CardTitle>
                <CardDescription>{t("edit.form.description")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="border-line bg-sky/45 rounded-md border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-ink text-sm font-semibold">
                        {t("transaction.kind.label")}
                      </p>
                      <p className="text-muted mt-1 text-sm leading-6">
                        {t("edit.kind.description")}
                      </p>
                    </div>
                    <Badge
                      tone={kind === "income" ? "teal" : "coral"}
                      className="w-fit"
                    >
                      {t("transaction.kind.savingAs", {
                        kind: t(
                          kind === "income"
                            ? "transaction.kind.income"
                            : "transaction.kind.expense"
                        ),
                      })}
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
                      {t("transaction.kind.expense")}
                    </KindToggle>
                    <KindToggle
                      active={kind === "income"}
                      tone="teal"
                      onClick={() => {
                        setKind("income");
                        setCategoryId("");
                      }}
                    >
                      {t("transaction.kind.income")}
                    </KindToggle>
                  </div>
                </div>

                <input type="hidden" name="kind" value={kind} />
                <input type="hidden" name="occurredAt" value={occurredDate} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="title">
                      {t("transaction.title.editLabel")}
                    </Label>
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
                          {t(actionData.errors.title)}
                        </p>
                      )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="amount">
                      {kind === "expense"
                        ? t("transaction.amount.beforeDiscount")
                        : t("transaction.amount.label")}
                    </Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      required
                    />
                    {actionData &&
                      !actionData.ok &&
                      actionData.errors.amount && (
                        <p className="text-coral-strong text-sm">
                          {t(actionData.errors.amount)}
                        </p>
                      )}
                  </div>

                  {kind === "expense" && (
                    <DiscountAmountField
                      value={discountAmount}
                      onChange={setDiscountAmount}
                      error={
                        actionData && !actionData.ok
                          ? actionData.errors.discountAmount
                          : undefined
                      }
                      hasDiscountInput={hasDiscountInput}
                      hasValidDiscount={hasValidDiscount}
                      netAmount={netAmount}
                    />
                  )}

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="category">
                      {t("transaction.category.label")}
                    </Label>
                    <Select
                      name="categoryId"
                      value={categoryId || NO_CATEGORY_VALUE}
                      onValueChange={(value) =>
                        setCategoryId(value === NO_CATEGORY_VALUE ? "" : value)
                      }
                    >
                      <SelectTrigger id="category">
                        <SelectValue
                          placeholder={t("transaction.noCategory")}
                        />
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

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="occurredAt">
                      {t("transaction.date.label")}
                    </Label>
                    <DatePicker
                      id="occurredAt"
                      value={occurredDate}
                      max={todayDayValue()}
                      onChange={setOccurredDate}
                      showPresets
                    />
                  </div>

                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="note">{t("transaction.note.label")}</Label>
                    <Input
                      id="note"
                      name="note"
                      defaultValue={tx.note ?? ""}
                      placeholder={t("transaction.note.placeholder")}
                    />
                  </div>
                </div>

                <div className="border-line flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-muted text-sm leading-6">
                    {t("edit.saveDate", { date: occurredLabel })}
                  </p>
                  <Button type="submit" className="w-full sm:w-auto">
                    <Save className="h-4 w-4" />
                    {t("edit.submit")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Form>
        </section>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("edit.currentCard.title")}</CardTitle>
              <CardDescription>
                {t("edit.currentCard.description")}
              </CardDescription>
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
                    {t(
                      kind === "income"
                        ? "transaction.kind.income"
                        : "transaction.kind.expense"
                    )}
                  </Badge>
                </div>
              </div>

              <dl className="grid gap-3 text-sm">
                <InfoRow
                  label={t("edit.currentCard.selectedCategory")}
                  value={selectedCategory}
                />
                <InfoRow
                  label={t("edit.currentCard.occurredAt")}
                  value={originalOccurredLabel}
                />
                <InfoRow
                  label={t("edit.currentCard.createdAt")}
                  value={createdDate}
                />
              </dl>
            </CardContent>
          </Card>

          <MascotTip mood="thinking" title={t("edit.mascot.title")}>
            {t("edit.mascot.description")}
          </MascotTip>

          <Card className="border-coral/30">
            <CardHeader>
              <CardTitle>{t("edit.deleteCard.title")}</CardTitle>
              <CardDescription>
                {t("edit.deleteCard.description")}
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
                  {t("edit.deleteCard.button")}
                </Button>
              </Form>
            </CardContent>
          </Card>
        </aside>
      </div>

      <div className="lg:hidden">
        <MascotTip
          mood="warning"
          title={t("edit.mobileDeleteWarning.title")}
          className="bg-coral/5"
        >
          {t("edit.mobileDeleteWarning.description")}
        </MascotTip>
      </div>
    </div>
  );
};

export default EditTransaction;

const InfoRow = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-ink min-w-0 truncate font-medium">{value}</dd>
    </div>
  );
};

const KindToggle = ({
  active,
  onClick,
  tone,
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone: "coral" | "teal";
  children: React.ReactNode;
}) => {
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
};
