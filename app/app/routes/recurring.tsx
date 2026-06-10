import { useState } from "react";
import { data, Form, Link, redirect, useLoaderData } from "react-router";
import type { Route } from "./+types/recurring";
import {
  CalendarCheck,
  Pause,
  Pencil,
  Play,
  PlusCircle,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { DatePicker } from "~/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { MascotState, MascotTip } from "~/components/brand/mascot-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { repo } from "~/lib/db";
import type {
  Category,
  RecurringOccurrence,
  RecurringTemplate,
} from "~/lib/db";
import { requireUser } from "~/lib/auth.server";
import {
  dayValueToIso,
  formatDayLabel,
  todayDayValue,
} from "~/lib/date/day-value";
import { describeRecurringFrequency } from "~/lib/date/recurrence";
import { fmtBaht } from "~/lib/format/baht";
import {
  createTransactionSchema,
  recurringTemplateSchema,
} from "~/lib/validators/transaction";

const NO_CATEGORY_VALUE = "__none__";

export const meta = (_: Route.MetaArgs) => {
  return [{ title: "พอดี — รายการประจำ" }];
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await requireUser(request);
  await repo.processDueRecurring(user.id);
  const [templates, pending, categories] = await Promise.all([
    repo.listRecurringTemplates(user.id),
    repo.listPendingRecurringOccurrences(user.id),
    repo.listCategories(user.id),
  ]);
  return {
    templates,
    pending,
    categories,
    categoryNameById: Object.fromEntries(
      categories.map((category) => [category.id, category.name])
    ),
  };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const user = await requireUser(request);
  const form = await request.formData();
  const intent = form.get("intent");
  const id = form.get("id");

  if (typeof intent !== "string") {
    throw data("คำสั่งไม่ถูกต้อง", { status: 400 });
  }

  if (
    (intent === "pause" ||
      intent === "resume" ||
      intent === "delete-template") &&
    typeof id === "string"
  ) {
    const ok =
      intent === "pause"
        ? await repo.pauseRecurringTemplate(user.id, id)
        : intent === "resume"
          ? await repo.resumeRecurringTemplate(user.id, id)
          : await repo.deleteRecurringTemplate(user.id, id);
    if (!ok) throw data("ไม่พบรายการประจำ", { status: 404 });
    return redirect("/recurring");
  }

  if (intent === "update-template" && typeof id === "string") {
    const parsed = recurringTemplateSchema.safeParse(
      readRecurringTemplateForm(form)
    );
    if (!parsed.success) {
      throw data("ข้อมูลรายการประจำไม่ถูกต้อง", { status: 400 });
    }
    const updated = await repo.updateRecurringTemplate(
      user.id,
      id,
      parsed.data
    );
    if (!updated) throw data("ไม่พบรายการประจำ", { status: 404 });
    await repo.processDueRecurring(user.id);
    return redirect("/recurring");
  }

  if (intent === "confirm-occurrence" && typeof id === "string") {
    const scheduledOn = form.get("scheduledOn");
    const occurredAt = dayValueToIso(
      typeof scheduledOn === "string" ? scheduledOn : todayDayValue()
    );
    const categoryId = form.get("categoryId");
    const parsed = createTransactionSchema.safeParse({
      kind: form.get("kind"),
      title: form.get("title"),
      amount: form.get("amount"),
      categoryId:
        typeof categoryId === "string" && categoryId !== NO_CATEGORY_VALUE
          ? categoryId
          : null,
      note: form.get("note") || null,
      occurredAt: occurredAt ?? new Date().toISOString(),
    });
    if (!parsed.success) {
      throw data("ข้อมูลรายการรอยืนยันไม่ถูกต้อง", { status: 400 });
    }
    const tx = await repo.confirmRecurringOccurrence(user.id, id, parsed.data);
    if (!tx) throw data("ไม่พบรายการรอยืนยัน", { status: 404 });
    return redirect("/history?source=recurring");
  }

  throw data("คำสั่งไม่ถูกต้อง", { status: 400 });
};

const Recurring = () => {
  const { templates, pending, categories, categoryNameById } =
    useLoaderData<typeof loader>();
  const templateById = new Map(
    templates.map((template) => [template.id, template])
  );
  const activeCount = templates.filter(
    (item) => item.status === "active"
  ).length;
  const pausedCount = templates.filter(
    (item) => item.status === "paused"
  ).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-ink text-2xl font-semibold">รายการประจำ</h1>
          <p className="text-muted text-sm">
            ตั้งครั้งเดียว แล้วให้พอดีเตือนหรือบันทึกตามรอบที่กำหนด
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/add">
            <PlusCircle className="h-4 w-4" />
            เพิ่มจากรายการใหม่
          </Link>
        </Button>
      </div>

      {pending.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>รายการรอยืนยัน</CardTitle>
            <CardDescription>
              ตรวจจำนวนจริงก่อนบันทึกเข้าประวัติ
              รายการเหล่านี้ยังไม่กระทบยอดเงิน
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {pending.map((occurrence) => {
              const template = templateById.get(occurrence.templateId);
              if (!template) return null;
              return (
                <PendingOccurrenceCard
                  categories={categories}
                  key={occurrence.id}
                  occurrence={occurrence}
                  template={template}
                />
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <MascotTip mood="happy" title="ไม่มีรายการรอยืนยันตอนนี้">
          รายการประจำแบบบันทึกอัตโนมัติจะเข้าประวัติเอง
          ส่วนรายการที่ต้องตรวจยอดจะขึ้นตรงนี้เมื่อถึงรอบ
        </MascotTip>
      )}

      <section
        aria-label="ภาพรวมรายการประจำ"
        className="border-line bg-surface grid gap-3 rounded-md border p-4 sm:grid-cols-3"
      >
        <SummaryCell label="ทั้งหมด" value={`${templates.length} รายการ`} />
        <SummaryCell label="กำลังทำงาน" value={`${activeCount} รายการ`} />
        <SummaryCell label="พักไว้" value={`${pausedCount} รายการ`} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>แม่แบบรายการประจำ</CardTitle>
          <CardDescription>
            Pause แล้ว resume จะเริ่มจากรอบถัดไป ไม่สร้างย้อนหลัง
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {templates.length === 0 ? (
            <div className="p-5">
              <MascotState
                mood="thinking"
                title="ยังไม่มีรายการประจำ"
                description="เริ่มจากหน้าเพิ่มรายการ แล้วเปิดตั้งเป็นรายการประจำ"
              />
            </div>
          ) : (
            <ul className="divide-line divide-y">
              {templates.map((template) => (
                <TemplateRow
                  categories={categories}
                  categoryNameById={categoryNameById}
                  key={template.id}
                  template={template}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Recurring;

const readRecurringTemplateForm = (form: FormData) => {
  const categoryId = form.get("categoryId");
  const endDate = form.get("endDate");
  return {
    kind: form.get("kind"),
    title: form.get("title"),
    amount: form.get("amount"),
    categoryId:
      typeof categoryId === "string" && categoryId !== NO_CATEGORY_VALUE
        ? categoryId
        : null,
    note: form.get("note") || null,
    frequency: form.get("frequency"),
    weeklyDay: nullableNumber(form.get("weeklyDay")),
    monthlyDay: nullableNumber(form.get("monthlyDay")),
    yearlyMonth: nullableNumber(form.get("yearlyMonth")),
    yearlyDay: nullableNumber(form.get("yearlyDay")),
    startDate: form.get("startDate"),
    endDate: typeof endDate === "string" && endDate ? endDate : null,
    postMode: form.get("postMode"),
  };
};

const nullableNumber = (value: FormDataEntryValue | null) => {
  return typeof value === "string" && value.length > 0 ? value : null;
};

const PendingOccurrenceCard = ({
  categories,
  occurrence,
  template,
}: {
  categories: Category[];
  occurrence: RecurringOccurrence;
  template: RecurringTemplate;
}) => {
  const filteredCategories = categories.filter(
    (category) => category.kind === template.kind
  );
  return (
    <Form
      method="post"
      className="border-line bg-sky/35 grid gap-3 rounded-md border p-4 lg:grid-cols-[minmax(0,1fr)_10rem_12rem_auto] lg:items-end"
    >
      <input type="hidden" name="intent" value="confirm-occurrence" />
      <input type="hidden" name="id" value={occurrence.id} />
      <input type="hidden" name="kind" value={template.kind} />
      <input type="hidden" name="scheduledOn" value={occurrence.scheduledOn} />
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={template.kind === "income" ? "teal" : "coral"}>
            {template.kind === "income" ? "รายรับ" : "รายจ่าย"}
          </Badge>
          <Badge tone="neutral">{formatDayLabel(occurrence.scheduledOn)}</Badge>
        </div>
        <Label htmlFor={`pending-title-${occurrence.id}`}>รายการ</Label>
        <Input
          id={`pending-title-${occurrence.id}`}
          name="title"
          defaultValue={template.title}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`pending-amount-${occurrence.id}`}>จำนวนเงิน</Label>
        <Input
          id={`pending-amount-${occurrence.id}`}
          name="amount"
          defaultValue={template.amount}
          inputMode="decimal"
          step="0.01"
          type="number"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`pending-category-${occurrence.id}`}>หมวด</Label>
        <Select
          name="categoryId"
          defaultValue={template.categoryId ?? NO_CATEGORY_VALUE}
        >
          <SelectTrigger id={`pending-category-${occurrence.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_CATEGORY_VALUE}>ไม่ระบุหมวด</SelectItem>
            {filteredCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="lg:mb-0.5">
        <CalendarCheck className="h-4 w-4" />
        ยืนยันบันทึก
      </Button>
      <input type="hidden" name="note" value={template.note ?? ""} />
    </Form>
  );
};

const TemplateRow = ({
  categories,
  categoryNameById,
  template,
}: {
  categories: Category[];
  categoryNameById: Record<string, string>;
  template: RecurringTemplate;
}) => {
  const categoryName = template.categoryId
    ? (categoryNameById[template.categoryId] ?? "ไม่ระบุหมวด")
    : "ไม่ระบุหมวด";
  const statusTone = template.status === "active" ? "teal" : "muted";
  return (
    <li className="grid gap-4 p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-ink min-w-0 truncate text-sm font-semibold">
              {template.title}
            </p>
            <Badge tone={template.kind === "income" ? "teal" : "coral"}>
              {template.kind === "income" ? "รายรับ" : "รายจ่าย"}
            </Badge>
            <Badge tone={statusTone}>
              {template.status === "active"
                ? "ทำงาน"
                : template.status === "paused"
                  ? "พักไว้"
                  : "ครบกำหนดแล้ว"}
            </Badge>
          </div>
          <p className="text-muted mt-1 text-sm">
            {fmtBaht(template.amount)} · {categoryName} ·{" "}
            {describeRecurringFrequency(template)}
          </p>
          <p className="text-muted mt-1 text-xs">
            รอบถัดไป:{" "}
            {template.nextRunOn ? formatDayLabel(template.nextRunOn) : "ไม่มี"}
            {template.postMode === "auto"
              ? " · บันทึกอัตโนมัติ"
              : " · รอยืนยันก่อนบันทึก"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <TemplateIntentButton
            icon={template.status === "paused" ? Play : Pause}
            intent={template.status === "paused" ? "resume" : "pause"}
            templateId={template.id}
          >
            {template.status === "paused" ? "ทำต่อ" : "พัก"}
          </TemplateIntentButton>
          <TemplateIntentButton
            icon={Trash2}
            intent="delete-template"
            templateId={template.id}
            variant="destructive"
          >
            ลบ
          </TemplateIntentButton>
        </div>
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <Button type="button" size="sm" variant="secondary" className="w-fit">
            <Pencil className="h-4 w-4" />
            แก้ไขแม่แบบ
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขแม่แบบ {template.title}</DialogTitle>
            <DialogDescription>
              เปลี่ยนข้อมูลแม่แบบนี้โดยไม่กระทบรายการจริงที่สร้างไปแล้ว
            </DialogDescription>
          </DialogHeader>
          <TemplateEditForm categories={categories} template={template} />
        </DialogContent>
      </Dialog>
    </li>
  );
};

const TemplateIntentButton = ({
  children,
  icon: Icon,
  intent,
  templateId,
  variant = "secondary",
}: {
  children: React.ReactNode;
  icon: LucideIcon;
  intent: string;
  templateId: string;
  variant?: "secondary" | "destructive";
}) => {
  return (
    <Form method="post">
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="id" value={templateId} />
      <Button
        type="submit"
        size="sm"
        variant="secondary"
        className={
          variant === "destructive" ? "text-coral-strong hover:bg-coral/10" : ""
        }
      >
        <Icon className="h-4 w-4" />
        {children}
      </Button>
    </Form>
  );
};

const TemplateEditForm = ({
  categories,
  template,
}: {
  categories: Category[];
  template: RecurringTemplate;
}) => {
  const [startDate, setStartDate] = useState(template.startDate);
  const [endDate, setEndDate] = useState(template.endDate ?? "");

  return (
    <Form method="post" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <input type="hidden" name="intent" value="update-template" />
      <input type="hidden" name="id" value={template.id} />
      <Field label="ชื่อรายการ" id={`title-${template.id}`}>
        <Input
          id={`title-${template.id}`}
          name="title"
          defaultValue={template.title}
          required
        />
      </Field>
      <Field label="จำนวนเงิน" id={`amount-${template.id}`}>
        <Input
          id={`amount-${template.id}`}
          name="amount"
          defaultValue={template.amount}
          inputMode="decimal"
          step="0.01"
          type="number"
          required
        />
      </Field>
      <Field label="ประเภท" id={`kind-${template.id}`}>
        <Select name="kind" defaultValue={template.kind}>
          <SelectTrigger id={`kind-${template.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">รายจ่าย</SelectItem>
            <SelectItem value="income">รายรับ</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="หมวด" id={`category-${template.id}`}>
        <Select
          name="categoryId"
          defaultValue={template.categoryId ?? NO_CATEGORY_VALUE}
        >
          <SelectTrigger id={`category-${template.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_CATEGORY_VALUE}>ไม่ระบุหมวด</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="ความถี่" id={`frequency-${template.id}`}>
        <Select name="frequency" defaultValue={template.frequency}>
          <SelectTrigger id={`frequency-${template.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">รายวัน</SelectItem>
            <SelectItem value="weekly">รายสัปดาห์</SelectItem>
            <SelectItem value="monthly">รายเดือน</SelectItem>
            <SelectItem value="yearly">รายปี</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="วันในสัปดาห์" id={`weekly-${template.id}`}>
        <Select name="weeklyDay" defaultValue={String(template.weeklyDay ?? 1)}>
          <SelectTrigger id={`weekly-${template.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WEEKDAYS.map((day) => (
              <SelectItem key={day.value} value={String(day.value)}>
                {day.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="วันที่ของเดือน" id={`monthly-${template.id}`}>
        <Input
          id={`monthly-${template.id}`}
          name="monthlyDay"
          defaultValue={template.monthlyDay ?? 1}
          min={1}
          max={31}
          type="number"
        />
      </Field>
      <Field label="รายปี: เดือน/วัน" id={`yearly-month-${template.id}`}>
        <div className="grid grid-cols-2 gap-2">
          <Input
            id={`yearly-month-${template.id}`}
            name="yearlyMonth"
            defaultValue={template.yearlyMonth ?? 1}
            min={1}
            max={12}
            type="number"
          />
          <Input
            aria-label="วันที่ของปี"
            name="yearlyDay"
            defaultValue={template.yearlyDay ?? 1}
            min={1}
            max={31}
            type="number"
          />
        </div>
      </Field>
      <Field label="วันเริ่ม" id={`start-${template.id}`}>
        <DatePicker
          id={`start-${template.id}`}
          value={startDate}
          onChange={setStartDate}
        />
        <input type="hidden" name="startDate" value={startDate} />
      </Field>
      <Field label="วันสิ้นสุด" id={`end-${template.id}`}>
        <DatePicker
          id={`end-${template.id}`}
          value={endDate}
          min={startDate}
          onChange={setEndDate}
          placeholder="ไม่กำหนด"
        />
        <input type="hidden" name="endDate" value={endDate} />
      </Field>
      <Field label="วิธีบันทึก" id={`mode-${template.id}`}>
        <Select name="postMode" defaultValue={template.postMode}>
          <SelectTrigger id={`mode-${template.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="confirm">รอยืนยัน</SelectItem>
            <SelectItem value="auto">บันทึกอัตโนมัติ</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <input type="hidden" name="note" value={template.note ?? ""} />
      <div className="flex items-end">
        <Button type="submit" className="w-full">
          บันทึกแม่แบบ
        </Button>
      </div>
    </Form>
  );
};

const SummaryCell = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className="border-line rounded-sm border px-3 py-2">
      <p className="text-muted text-xs">{label}</p>
      <p className="text-ink mt-1 text-lg font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
};

const Field = ({
  children,
  id,
  label,
}: {
  children: React.ReactNode;
  id: string;
  label: string;
}) => {
  return (
    <div className="grid gap-1.5">
      <Label className="text-muted text-xs" htmlFor={id}>
        {label}
      </Label>
      {children}
    </div>
  );
};

const WEEKDAYS: Array<{ label: string; value: number }> = [
  { label: "อาทิตย์", value: 0 },
  { label: "จันทร์", value: 1 },
  { label: "อังคาร", value: 2 },
  { label: "พุธ", value: 3 },
  { label: "พฤหัสบดี", value: 4 },
  { label: "ศุกร์", value: 5 },
  { label: "เสาร์", value: 6 },
];
