import { Form, redirect, useActionData, useLoaderData } from "react-router";
import { LogOut, Plus, Save, Trash2 } from "lucide-react";
import type { Route } from "./+types/settings";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { MascotTip } from "~/components/brand/mascot-state";
import { repo } from "~/lib/db";
import type { Category, TransactionKind } from "~/lib/db";
import {
  createCategorySchema,
  deleteCategorySchema,
  updateCategorySchema,
} from "~/lib/validators/category";

type SettingsIntent = "createCategory" | "updateCategory" | "deleteCategory";

interface ActionErrors {
  categoryId?: string;
  general?: string;
  kind?: string;
  name?: string;
}

type ActionResult =
  | {
      ok: false;
      intent: SettingsIntent;
      errors: ActionErrors;
      values: Record<string, string>;
    }
  | undefined;

export function meta(_: Route.MetaArgs) {
  return [{ title: "พอดี — ตั้งค่า" }];
}

export async function loader() {
  const categories = await repo.listCategories();
  const usageByCategoryId = Object.fromEntries(
    await Promise.all(
      categories.map(async (category) => [
        category.id,
        await repo.countTransactionsByCategory(category.id),
      ])
    )
  );

  return { categories, usageByCategoryId };
}

export async function action({
  request,
}: Route.ActionArgs): Promise<ActionResult | Response> {
  const form = await request.formData();
  const intent = form.get("intent");

  if (
    intent !== "createCategory" &&
    intent !== "updateCategory" &&
    intent !== "deleteCategory"
  ) {
    return fieldError("createCategory", { general: "คำสั่งไม่ถูกต้อง" }, form);
  }

  if (intent === "createCategory") {
    const raw = {
      name: form.get("name"),
      kind: form.get("kind"),
    };
    const parsed = createCategorySchema.safeParse(raw);
    if (!parsed.success) {
      return zodFieldError(intent, parsed.error.issues, form);
    }

    const duplicate = await findDuplicateCategory(
      parsed.data.name,
      parsed.data.kind
    );
    if (duplicate) {
      return fieldError(intent, { name: "มีหมวดชื่อนี้แล้ว" }, form);
    }

    await repo.createCategory(parsed.data);
    return redirect("/settings");
  }

  if (intent === "updateCategory") {
    const raw = {
      id: form.get("categoryId"),
      name: form.get("name"),
    };
    const parsed = updateCategorySchema.safeParse(raw);
    if (!parsed.success) {
      return zodFieldError(intent, parsed.error.issues, form);
    }

    const categories = await repo.listCategories();
    const category = categories.find((c) => c.id === parsed.data.id);
    if (!category) {
      return fieldError(intent, { general: "ไม่พบหมวดนี้" }, form);
    }

    const duplicate = await findDuplicateCategory(
      parsed.data.name,
      category.kind,
      category.id
    );
    if (duplicate) {
      return fieldError(intent, { name: "มีหมวดชื่อนี้แล้ว" }, form);
    }

    await repo.updateCategory(category.id, { name: parsed.data.name });
    return redirect("/settings");
  }

  const raw = { id: form.get("categoryId") };
  const parsed = deleteCategorySchema.safeParse(raw);
  if (!parsed.success) {
    return zodFieldError(intent, parsed.error.issues, form);
  }

  const usage = await repo.countTransactionsByCategory(parsed.data.id);
  if (usage > 0) {
    return fieldError(
      intent,
      { general: "หมวดนี้มีรายการใช้งานอยู่ ลบไม่ได้ แต่แก้ชื่อได้" },
      form
    );
  }

  const ok = await repo.deleteCategory(parsed.data.id);
  if (!ok) {
    return fieldError(intent, { general: "ไม่พบหมวดนี้" }, form);
  }

  return redirect("/settings");
}

export default function Settings() {
  const { categories, usageByCategoryId } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionResult>();
  const expenseCategories = categories.filter((c) => c.kind === "expense");
  const incomeCategories = categories.filter((c) => c.kind === "income");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-ink text-2xl font-semibold">ตั้งค่า</h1>
      <MascotTip mood="normal" title="พอดียังเก็บทุกอย่างไว้ในเครื่องนี้">
        ตอนนี้เป็นโหมดผู้ใช้คนเดียว ข้อมูลทดลองจะอยู่ใน session ของแอป
        ยังไม่มีการซิงก์บัญชีหรือเชื่อมธนาคาร
      </MascotTip>

      <Card>
        <CardHeader>
          <CardTitle>หมวดหมู่</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <CreateCategoryForm actionData={actionData} />

          {actionData?.intent === "deleteCategory" &&
            actionData.errors.general && (
              <p className="text-coral-strong text-sm">
                {actionData.errors.general}
              </p>
            )}

          <div className="grid gap-4 lg:grid-cols-2">
            <CategoryGroup
              actionData={actionData}
              categories={expenseCategories}
              kind="expense"
              title="หมวดรายจ่าย"
              usageByCategoryId={usageByCategoryId}
            />
            <CategoryGroup
              actionData={actionData}
              categories={incomeCategories}
              kind="income"
              title="หมวดรายรับ"
              usageByCategoryId={usageByCategoryId}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>บัญชี</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-muted text-sm">
            เข้าสู่ระบบแล้ว ข้อมูลการเงินจะผูกกับบัญชีในเฟสฐานข้อมูลถัดไป
          </p>
          <Form method="post" action="/logout">
            <Button type="submit" variant="secondary">
              <LogOut className="h-4 w-4" />
              ออกจากระบบ
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

function CreateCategoryForm({ actionData }: { actionData: ActionResult }) {
  const isCreateError = actionData?.intent === "createCategory";

  return (
    <Form
      method="post"
      className="border-line bg-sky/35 grid gap-3 rounded-md border p-4 md:grid-cols-[1fr_180px_auto]"
    >
      <input type="hidden" name="intent" value="createCategory" />
      <div className="flex flex-col gap-2">
        <Label htmlFor="new-category-name">ชื่อหมวดใหม่</Label>
        <Input
          id="new-category-name"
          name="name"
          defaultValue={isCreateError ? actionData.values.name : ""}
          placeholder="เช่น ของใช้บ้าน"
        />
        {isCreateError && actionData.errors.name && (
          <p className="text-coral-strong text-sm">{actionData.errors.name}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="new-category-kind">ประเภท</Label>
        <Select
          name="kind"
          defaultValue={isCreateError ? actionData.values.kind : "expense"}
        >
          <SelectTrigger id="new-category-kind">
            <SelectValue placeholder="รายจ่าย" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">รายจ่าย</SelectItem>
            <SelectItem value="income">รายรับ</SelectItem>
          </SelectContent>
        </Select>
        {isCreateError && actionData.errors.kind && (
          <p className="text-coral-strong text-sm">{actionData.errors.kind}</p>
        )}
      </div>
      <div className="flex items-end">
        <Button type="submit" className="w-full md:w-auto">
          <Plus className="h-4 w-4" />
          เพิ่มหมวด
        </Button>
      </div>
    </Form>
  );
}

function CategoryGroup({
  actionData,
  categories,
  kind,
  title,
  usageByCategoryId,
}: {
  actionData: ActionResult;
  categories: Category[];
  kind: TransactionKind;
  title: string;
  usageByCategoryId: Record<string, number>;
}) {
  return (
    <section className="border-line bg-surface rounded-md border">
      <div className="border-line flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-ink text-base font-semibold">{title}</h2>
        <span className="text-muted text-sm">{categories.length} หมวด</span>
      </div>
      <div className="divide-line divide-y">
        {categories.length === 0 ? (
          <p className="text-muted px-4 py-4 text-sm">
            ยังไม่มีหมวด{labelKind(kind)}
          </p>
        ) : (
          categories.map((category) => (
            <CategoryRow
              actionData={actionData}
              category={category}
              key={category.id}
              usageCount={usageByCategoryId[category.id] ?? 0}
            />
          ))
        )}
      </div>
    </section>
  );
}

function CategoryRow({
  actionData,
  category,
  usageCount,
}: {
  actionData: ActionResult;
  category: Category;
  usageCount: number;
}) {
  const isRowError =
    actionData?.values.categoryId === category.id &&
    actionData.intent !== "createCategory";
  const canDelete = usageCount === 0;
  const deleteFormId = `delete-category-${category.id}`;

  return (
    <div className="flex flex-col gap-2 px-4 py-3" data-testid="category-row">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Form method="post" className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input type="hidden" name="intent" value="updateCategory" />
          <input type="hidden" name="categoryId" value={category.id} />
          <Input
            aria-label={`ชื่อหมวด ${category.name}`}
            name="name"
            defaultValue={
              isRowError && actionData?.values.name
                ? actionData.values.name
                : category.name
            }
          />
          <Button type="submit" variant="secondary">
            <Save className="h-4 w-4" />
            บันทึก
          </Button>
        </Form>
        <Form id={deleteFormId} method="post" className="hidden">
          <input type="hidden" name="intent" value="deleteCategory" />
          <input type="hidden" name="categoryId" value={category.id} />
        </Form>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              disabled={!canDelete}
              className="text-coral-strong border-coral/40 hover:bg-coral/10 w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4" />
              ลบ
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ลบหมวดนี้?</AlertDialogTitle>
              <AlertDialogDescription>
                หมวด “{category.name}” จะถูกลบออกจากรายการหมวดหมู่
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
                  ลบหมวด
                </button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted text-sm">
          {usageCount > 0 ? `ใช้กับ ${usageCount} รายการ` : "ยังไม่มีรายการใช้"}
        </p>
        {!canDelete && (
          <p className="text-muted text-sm">ลบไม่ได้ แต่แก้ชื่อได้</p>
        )}
      </div>
      {isRowError && actionData?.errors.name && (
        <p className="text-coral-strong text-sm">{actionData.errors.name}</p>
      )}
      {isRowError && actionData?.errors.general && (
        <p className="text-coral-strong text-sm">{actionData.errors.general}</p>
      )}
    </div>
  );
}

async function findDuplicateCategory(
  name: string,
  kind: TransactionKind,
  exceptId?: string
) {
  const normalizedName = normalizeCategoryName(name);
  const categories = await repo.listCategories();
  return categories.find(
    (category) =>
      category.id !== exceptId &&
      category.kind === kind &&
      normalizeCategoryName(category.name) === normalizedName
  );
}

function fieldError(
  intent: SettingsIntent,
  errors: ActionErrors,
  form: FormData
): Exclude<ActionResult, undefined> {
  return {
    ok: false,
    intent,
    errors,
    values: formValues(form),
  };
}

function formValues(form: FormData) {
  return {
    categoryId: String(form.get("categoryId") ?? ""),
    kind: String(form.get("kind") ?? "expense"),
    name: String(form.get("name") ?? ""),
  };
}

function labelKind(kind: TransactionKind) {
  return kind === "income" ? "รายรับ" : "รายจ่าย";
}

function normalizeCategoryName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("th-TH");
}

function zodFieldError(
  intent: SettingsIntent,
  issues: Array<{ path: PropertyKey[]; message: string }>,
  form: FormData
): Exclude<ActionResult, undefined> {
  const errors: ActionErrors = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (
      key === "id" ||
      key === "categoryId" ||
      key === "general" ||
      key === "kind" ||
      key === "name"
    ) {
      errors[key === "id" ? "categoryId" : key] = issue.message;
    }
  }
  return fieldError(intent, errors, form);
}
