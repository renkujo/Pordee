import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useSearchParams,
} from "react-router";
import type { ComponentType } from "react";
import {
  Boxes,
  CheckCircle2,
  CloudOff,
  Database,
  KeyRound,
  Link2,
  LogOut,
  Mail,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  WifiOff,
} from "lucide-react";
import type { Route } from "./+types/settings";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
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
import { AccountAvatar } from "~/components/brand/account-avatar";
import { MascotTip } from "~/components/brand/mascot-state";
import { repo } from "~/lib/db";
import { auth, requireUser } from "~/lib/auth.server";
import type { AuthUser } from "~/lib/auth.server";
import type { Category, TransactionKind } from "~/lib/db";
import { cn } from "~/lib/cn";
import {
  createCategorySchema,
  deleteCategorySchema,
  updateCategorySchema,
} from "~/lib/validators/category";

type SettingsIntent = "createCategory" | "updateCategory" | "deleteCategory";
type SettingsTab = "categories" | "account";

type AccountMethod = {
  description: string;
  label: string;
  providerId: string;
};

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

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const categories = await repo.listCategories(user.id);
  const accountMethods = await listAccountMethods(request, user.email);
  const usageByCategoryId = Object.fromEntries(
    await Promise.all(
      categories.map(async (category) => [
        category.id,
        await repo.countTransactionsByCategory(user.id, category.id),
      ])
    )
  );

  return { accountMethods, categories, usageByCategoryId, user };
}

export async function action({
  request,
}: Route.ActionArgs): Promise<ActionResult | Response> {
  const user = await requireUser(request);
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
      user.id,
      parsed.data.name,
      parsed.data.kind
    );
    if (duplicate) {
      return fieldError(intent, { name: "มีหมวดชื่อนี้แล้ว" }, form);
    }

    await repo.createCategory(user.id, parsed.data);
    return redirect("/settings?tab=categories");
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

    const categories = await repo.listCategories(user.id);
    const category = categories.find((c) => c.id === parsed.data.id);
    if (!category) {
      return fieldError(intent, { general: "ไม่พบหมวดนี้" }, form);
    }

    const duplicate = await findDuplicateCategory(
      user.id,
      parsed.data.name,
      category.kind,
      category.id
    );
    if (duplicate) {
      return fieldError(intent, { name: "มีหมวดชื่อนี้แล้ว" }, form);
    }

    await repo.updateCategory(user.id, category.id, { name: parsed.data.name });
    return redirect("/settings?tab=categories");
  }

  const raw = { id: form.get("categoryId") };
  const parsed = deleteCategorySchema.safeParse(raw);
  if (!parsed.success) {
    return zodFieldError(intent, parsed.error.issues, form);
  }

  const usage = await repo.countTransactionsByCategory(user.id, parsed.data.id);
  if (usage > 0) {
    return fieldError(
      intent,
      { general: "หมวดนี้มีรายการใช้งานอยู่ ลบไม่ได้ แต่แก้ชื่อได้" },
      form
    );
  }

  const ok = await repo.deleteCategory(user.id, parsed.data.id);
  if (!ok) {
    return fieldError(intent, { general: "ไม่พบหมวดนี้" }, form);
  }

  return redirect("/settings?tab=categories");
}

export default function Settings() {
  const { accountMethods, categories, usageByCategoryId, user } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<ActionResult>();
  const [searchParams] = useSearchParams();
  const selectedTab = actionData?.intent
    ? "categories"
    : getSettingsTab(searchParams);
  const expenseCategories = categories.filter((c) => c.kind === "expense");
  const incomeCategories = categories.filter((c) => c.kind === "income");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 lg:gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-ink text-3xl font-semibold tracking-tight">
            ตั้งค่า
          </h1>
          <p className="text-muted max-w-2xl text-sm leading-6">
            จัดการหมวดหมู่การเงินและข้อมูลบัญชีโดยแยกเป็นสองส่วนชัดเจน
          </p>
        </div>
        <SettingsTabNav
          accountMethodCount={accountMethods.length}
          categoryCount={categories.length}
          selectedTab={selectedTab}
        />
      </header>

      {selectedTab === "account" ? (
        <AccountSection accountMethods={accountMethods} user={user} />
      ) : (
        <CategoriesSection
          actionData={actionData}
          expenseCategories={expenseCategories}
          incomeCategories={incomeCategories}
          usageByCategoryId={usageByCategoryId}
        />
      )}
    </div>
  );
}

function SettingsTabNav({
  accountMethodCount,
  categoryCount,
  selectedTab,
}: {
  accountMethodCount: number;
  categoryCount: number;
  selectedTab: SettingsTab;
}) {
  return (
    <nav
      aria-label="ส่วนตั้งค่า"
      className="border-line bg-surface grid gap-1 rounded-[14px] border p-1 sm:max-w-xl sm:grid-cols-2"
    >
      <SettingsTabLink
        active={selectedTab === "categories"}
        countLabel={`${categoryCount} หมวด`}
        icon={Boxes}
        to="/settings?tab=categories"
      >
        หมวดหมู่
      </SettingsTabLink>
      <SettingsTabLink
        active={selectedTab === "account"}
        countLabel={`${Math.max(accountMethodCount, 1)} วิธีเข้าใช้`}
        icon={UserRound}
        to="/settings?tab=account"
      >
        บัญชี
      </SettingsTabLink>
    </nav>
  );
}

function SettingsTabLink({
  active,
  children,
  countLabel,
  icon: Icon,
  to,
}: {
  active: boolean;
  children: string;
  countLabel: string;
  icon: ComponentType<{ className?: string }>;
  to: string;
}) {
  return (
    <Link
      aria-label={`${children} ${countLabel}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-[10px] px-3 py-3 text-left transition-colors",
        active ? "bg-sky text-ink" : "text-muted hover:bg-sky/60 hover:text-ink"
      )}
      to={to}
    >
      <Icon
        className={cn("h-5 w-5 shrink-0", active ? "text-teal" : "text-muted")}
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{children}</span>
        <span className="text-muted mt-0.5 block text-xs">{countLabel}</span>
      </span>
    </Link>
  );
}

function CategoriesSection({
  actionData,
  expenseCategories,
  incomeCategories,
  usageByCategoryId,
}: {
  actionData: ActionResult;
  expenseCategories: Category[];
  incomeCategories: Category[];
  usageByCategoryId: Record<string, number>;
}) {
  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle>หมวดหมู่</CardTitle>
        <p className="text-muted text-sm leading-6">
          เพิ่ม แก้ชื่อ หรือลบหมวดที่ยังไม่มีรายการใช้งานได้จากส่วนนี้
        </p>
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
  );
}

function AccountSection({
  accountMethods,
  user,
}: {
  accountMethods: AccountMethod[];
  user: AuthUser;
}) {
  const displayName = user.name || "ผู้ใช้พอดี";
  const providerSummary =
    accountMethods.length > 1
      ? `${accountMethods.length} วิธีเข้าสู่ระบบ`
      : accountMethods[0]?.label || "อีเมลและรหัสผ่าน";

  return (
    <div className="flex flex-col gap-5">
      <MascotTip mood="normal" title="พอดีเก็บข้อมูลไว้ในฐานข้อมูลของแอป">
        รายการเงิน หมวดหมู่ และเป้าหมายผูกกับบัญชีที่เข้าสู่ระบบอยู่
        แต่ยังไม่ได้เชื่อมธนาคารหรือซิงก์กับคลาวด์ภายนอก
      </MascotTip>
      <Card className="overflow-hidden rounded-[18px]">
        <CardHeader className="border-line border-b p-0">
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_19rem]">
            <div className="flex min-w-0 flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <AccountAvatar user={user} size="lg" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg">บัญชี</CardTitle>
                    <Badge tone="teal" className="rounded-md">
                      พร้อมใช้งาน
                    </Badge>
                  </div>
                  <p className="text-ink mt-3 truncate text-base font-semibold">
                    {displayName}
                  </p>
                  <p className="text-muted mt-1 flex min-w-0 items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </p>
                </div>
              </div>
              <div
                aria-hidden="true"
                className="border-line bg-sky/50 hidden min-w-[11rem] rounded-[14px] border px-4 py-3 text-sm sm:block"
              >
                <p className="text-muted">เข้าสู่ระบบด้วย</p>
                <p className="text-ink mt-1 font-semibold">{providerSummary}</p>
              </div>
            </div>
            <div className="border-line bg-sky/35 flex flex-col justify-center gap-3 border-t p-5 xl:border-t-0 xl:border-l">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-teal h-4 w-4" />
                <p className="text-ink text-sm font-semibold">
                  ข้อมูลผูกกับบัญชีนี้
                </p>
              </div>
              <p className="text-muted text-sm leading-6">
                รายการเงิน หมวดหมู่ และเป้าหมายถูกอ่าน/เขียนผ่านฐานข้อมูลของแอป
                โดยแยกตามผู้ใช้ที่เข้าสู่ระบบ
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-0 p-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="border-line border-b p-5 lg:border-r lg:border-b-0">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="text-teal h-5 w-5" />
              <h2 className="text-ink text-sm font-semibold">
                วิธีเข้าสู่ระบบที่ผูกไว้
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              {accountMethods.map((method) => (
                <AccountMethodRow key={method.providerId} method={method} />
              ))}
            </div>
          </div>

          <div className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Database className="text-teal h-5 w-5" />
              <h2 className="text-ink text-sm font-semibold">
                ข้อมูลและการเชื่อมต่อ
              </h2>
            </div>
            <div className="grid gap-3">
              <AccountStatusItem
                icon={Database}
                title="ฐานข้อมูลของแอป"
                description="ข้อมูลการเงินบันทึกแยกตามบัญชีผู้ใช้ในระบบพอดี"
              />
              <AccountStatusItem
                icon={CloudOff}
                title="ยังไม่ซิงก์ภายนอก"
                description="ยังไม่ได้เชื่อมธนาคาร คลาวด์ หรืออุปกรณ์อื่น"
              />
              <AccountStatusItem
                icon={WifiOff}
                title="ใช้งานจาก session นี้"
                description="เมื่อออกจากระบบ เครื่องนี้จะต้องเข้าสู่ระบบใหม่"
              />
            </div>
          </div>

          <div className="border-line flex flex-col gap-3 border-t p-5 md:flex-row md:items-center md:justify-between lg:col-span-2">
            <div className="min-w-0">
              <p className="text-ink text-sm font-semibold">ออกจากบัญชีนี้</p>
              <p className="text-muted mt-1 text-sm leading-6">
                ใช้เมื่อจบงานบนเครื่องร่วมกัน ครั้งถัดไปต้องเข้าสู่ระบบใหม่
              </p>
            </div>
            <Form method="post" action="/logout" className="shrink-0">
              <Button
                type="submit"
                variant="secondary"
                className="w-full md:w-auto"
              >
                <LogOut className="h-4 w-4" />
                ออกจากระบบ
              </Button>
            </Form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getSettingsTab(searchParams: URLSearchParams): SettingsTab {
  return searchParams.get("tab") === "account" ? "account" : "categories";
}

function AccountMethodRow({ method }: { method: AccountMethod }) {
  return (
    <div className="border-line bg-surface flex min-w-0 items-start gap-3 rounded-[12px] border p-3">
      <div className="bg-sky text-teal flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]">
        <AccountMethodIcon providerId={method.providerId} />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-ink text-sm font-semibold">{method.label}</p>
          <Badge tone="muted" className="rounded-md">
            ผูกแล้ว
          </Badge>
        </div>
        <p className="text-muted mt-1 text-sm leading-6 break-words">
          {method.description}
        </p>
      </div>
    </div>
  );
}

function AccountMethodIcon({ providerId }: { providerId: string }) {
  if (providerId === "google") return <Link2 className="h-5 w-5" />;
  if (providerId === "credential") return <KeyRound className="h-5 w-5" />;
  return <ShieldCheck className="h-5 w-5" />;
}

function AccountStatusItem({
  description,
  icon: Icon,
  title,
}: {
  description: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex min-w-0 gap-3">
      <div className="border-line flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border">
        <Icon className="text-teal h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-ink text-sm font-semibold">{title}</p>
        <p className="text-muted mt-1 text-sm leading-6">{description}</p>
      </div>
    </div>
  );
}

async function listAccountMethods(
  request: Request,
  email: string
): Promise<AccountMethod[]> {
  try {
    const accounts = await auth.api.listUserAccounts({
      headers: request.headers,
    });
    return mapAccountMethods(accounts, email);
  } catch {
    return mapAccountMethods([], email);
  }
}

function mapAccountMethods(
  accounts: Array<{ providerId: string }>,
  email: string
): AccountMethod[] {
  const providerIds = [
    ...new Set(accounts.map((account) => account.providerId)),
  ];
  const fallbackProviderIds =
    providerIds.length > 0 ? providerIds : ["credential"];

  return fallbackProviderIds.map((providerId) => {
    if (providerId === "google") {
      return {
        providerId,
        label: "Google",
        description: "ใช้บัญชี Google เพื่อเข้าสู่ระบบพอดี",
      };
    }

    if (providerId === "credential") {
      return {
        providerId,
        label: "อีเมลและรหัสผ่าน",
        description: email,
      };
    }

    return {
      providerId,
      label: providerId,
      description: "provider นี้ผูกอยู่กับบัญชีพอดี",
    };
  });
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
  userId: string,
  name: string,
  kind: TransactionKind,
  exceptId?: string
) {
  const normalizedName = normalizeCategoryName(name);
  const categories = await repo.listCategories(userId);
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
