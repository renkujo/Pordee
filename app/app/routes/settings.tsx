import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from "react-router";
import { useState } from "react";
import type { ComponentType, InputHTMLAttributes } from "react";
import {
  Bell,
  Boxes,
  Check,
  CheckCircle2,
  Circle,
  CloudOff,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Languages,
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
import { ThemeToggle } from "~/components/shell/theme-toggle";
import { repo } from "~/lib/db";
import { auth, requireUser } from "~/lib/auth.server";
import type { AuthUser } from "~/lib/auth.server";
import type { Category, TransactionKind } from "~/lib/db";
import { cn } from "~/lib/cn";
import { usePordeeLocale, usePordeeTranslation } from "~/lib/i18n/provider";
import { localeOptions } from "~/lib/i18n/messages";
import {
  createCategorySchema,
  deleteCategorySchema,
  updateCategorySchema,
} from "~/lib/validators/category";
import { changePasswordSchema, passwordRules } from "~/lib/validators/auth";

type Translate = ReturnType<typeof usePordeeTranslation>;

type CategoryIntent = "createCategory" | "updateCategory" | "deleteCategory";
type PasswordIntent = "changePassword";
type SettingsIntent = CategoryIntent | PasswordIntent;
type SettingsTab =
  | "account"
  | "notifications"
  | "security"
  | "language"
  | "categories";

type AccountMethod = {
  description: string;
  label: string;
  providerId: string;
};

interface ActionErrors {
  categoryId?: string;
  confirmPassword?: string;
  currentPassword?: string;
  general?: string;
  kind?: string;
  name?: string;
  newPassword?: string;
}

type ActionResult =
  | {
      ok: false;
      intent: SettingsIntent;
      errors: ActionErrors;
      values: Record<string, string>;
    }
  | {
      ok: true;
      intent: PasswordIntent;
      message: string;
    }
  | undefined;

type CategoryActionData =
  | {
      ok: false;
      intent: CategoryIntent;
      errors: ActionErrors;
      values: Record<string, string>;
    }
  | undefined;

type PasswordActionData =
  | (
      | {
          ok: false;
          intent: PasswordIntent;
          errors: ActionErrors;
          values: Record<string, string>;
        }
      | {
          ok: true;
          intent: PasswordIntent;
          message: string;
        }
    )
  | undefined;

export const meta = (_: Route.MetaArgs) => {
  return [{ title: "พอดี — ตั้งค่า" }];
};

export const loader = async ({ request }: Route.LoaderArgs) => {
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
};

export const action = async ({
  request,
}: Route.ActionArgs): Promise<ActionResult | Response> => {
  const user = await requireUser(request);
  const form = await request.formData();
  const intent = form.get("intent");

  if (!isSettingsIntent(intent)) {
    return fieldError(
      "createCategory",
      { general: "settings.error.invalidIntent" },
      form
    );
  }

  if (intent === "changePassword") {
    const raw = {
      currentPassword: form.get("currentPassword"),
      newPassword: form.get("newPassword"),
      confirmPassword: form.get("confirmPassword"),
    };
    const parsed = changePasswordSchema.safeParse(raw);
    if (!parsed.success) {
      return zodFieldError(intent, parsed.error.issues, form);
    }

    try {
      await auth.api.changePassword({
        headers: request.headers,
        body: {
          currentPassword: parsed.data.currentPassword,
          newPassword: parsed.data.newPassword,
          revokeOtherSessions: false,
        },
      });
    } catch {
      return fieldError(
        intent,
        {
          currentPassword: "settings.error.currentPasswordInvalid",
        },
        form
      );
    }

    return {
      ok: true,
      intent,
      message: "settings.security.success",
    };
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
      return fieldError(
        intent,
        { name: "settings.category.error.duplicate" },
        form
      );
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
      return fieldError(
        intent,
        { general: "settings.category.error.notFound" },
        form
      );
    }

    const duplicate = await findDuplicateCategory(
      user.id,
      parsed.data.name,
      category.kind,
      category.id
    );
    if (duplicate) {
      return fieldError(
        intent,
        { name: "settings.category.error.duplicate" },
        form
      );
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
      { general: "settings.category.error.inUse" },
      form
    );
  }

  const ok = await repo.deleteCategory(user.id, parsed.data.id);
  if (!ok) {
    return fieldError(
      intent,
      { general: "settings.category.error.notFound" },
      form
    );
  }

  return redirect("/settings?tab=categories");
};

const Settings = () => {
  const { accountMethods, categories, usageByCategoryId, user } =
    useLoaderData<typeof loader>();
  const t = usePordeeTranslation();
  const actionData = useActionData<ActionResult>();
  const [searchParams] = useSearchParams();
  const selectedTab = getSelectedTab(actionData, searchParams);
  const categoryActionData = getCategoryActionData(actionData);
  const passwordActionData = getPasswordActionData(actionData);
  const expenseCategories = categories.filter((c) => c.kind === "expense");
  const incomeCategories = categories.filter((c) => c.kind === "income");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 pb-24 lg:gap-6 lg:pb-0">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-ink text-3xl font-semibold tracking-tight">
            {t("settings.title")}
          </h1>
          <p className="text-muted max-w-2xl text-sm leading-6">
            {t("settings.description")}
          </p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
        <SettingsTabNav
          accountMethodCount={accountMethods.length}
          categoryCount={categories.length}
          selectedTab={selectedTab}
        />

        <div className="min-w-0">
          {selectedTab === "account" ? (
            <AccountSection accountMethods={accountMethods} user={user} />
          ) : selectedTab === "security" ? (
            <SecuritySection actionData={passwordActionData} />
          ) : selectedTab === "notifications" ? (
            <SettingsPlaceholderSection
              icon={Bell}
              title={t("settings.notifications.title")}
              description={t("settings.notifications.description")}
            />
          ) : selectedTab === "language" ? (
            <LanguageSection />
          ) : (
            <CategoriesSection
              actionData={categoryActionData}
              expenseCategories={expenseCategories}
              incomeCategories={incomeCategories}
              usageByCategoryId={usageByCategoryId}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;

const SettingsTabNav = ({
  accountMethodCount,
  categoryCount,
  selectedTab,
}: {
  accountMethodCount: number;
  categoryCount: number;
  selectedTab: SettingsTab;
}) => {
  const t = usePordeeTranslation();
  const accountCount = Math.max(accountMethodCount, 1);

  return (
    <nav
      aria-label={t("settings.navLabel")}
      className="border-line bg-surface grid grid-cols-2 gap-1 rounded-[14px] border p-1 sm:grid-cols-3 lg:sticky lg:top-5 lg:flex lg:flex-col"
    >
      <SettingsTabLink
        active={selectedTab === "account"}
        countLabel={`${accountCount} ${t("nav.profile.countSuffix")}`}
        icon={UserRound}
        to="/settings?tab=account"
      >
        {t("settings.tab.account")}
      </SettingsTabLink>
      <SettingsTabLink
        active={selectedTab === "notifications"}
        countLabel={t("nav.notifications.count")}
        icon={Bell}
        to="/settings?tab=notifications"
      >
        {t("settings.tab.notifications")}
      </SettingsTabLink>
      <SettingsTabLink
        active={selectedTab === "security"}
        countLabel={t("nav.security.count")}
        icon={KeyRound}
        to="/settings?tab=security"
      >
        {t("settings.tab.security")}
      </SettingsTabLink>
      <SettingsTabLink
        active={selectedTab === "language"}
        countLabel={t("settings.tab.language")}
        icon={Languages}
        to="/settings?tab=language"
      >
        {t("settings.tab.language")}
      </SettingsTabLink>
      <SettingsTabLink
        active={selectedTab === "categories"}
        countLabel={`${categoryCount} ${t("nav.categories.countSuffix")}`}
        icon={Boxes}
        to="/settings?tab=categories"
      >
        {t("settings.tab.categories")}
      </SettingsTabLink>
    </nav>
  );
};

const SettingsTabLink = ({
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
}) => {
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
};

const LanguageSection = () => {
  const { locale, setLocale } = usePordeeLocale();
  const t = usePordeeTranslation();

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle>{t("language.title")}</CardTitle>
        <p className="text-muted text-sm leading-6">{t("language.helper")}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div
          aria-label={t("language.title")}
          className="grid gap-3 sm:grid-cols-2"
          role="group"
        >
          {localeOptions.map((option) => {
            const active = locale === option.value;

            return (
              <button
                type="button"
                aria-pressed={active}
                className={cn(
                  "border-line bg-surface focus-visible:ring-coral/40 flex min-w-0 flex-col items-start gap-2 rounded-[14px] border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  active
                    ? "border-coral bg-coral/10 text-ink shadow-[inset_0_0_0_1px_var(--color-coral)]"
                    : "text-muted hover:bg-sky/60 hover:text-ink"
                )}
                key={option.value}
                onClick={() => setLocale(option.value)}
              >
                <span className="text-base font-semibold">
                  {t(`language.label.${option.value}`)}
                </span>
                <span className="text-muted text-sm leading-6">
                  {t(`language.description.${option.value}`)}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-muted text-sm">{t("language.saveNote")}</p>
      </CardContent>
    </Card>
  );
};

const CategoriesSection = ({
  actionData,
  expenseCategories,
  incomeCategories,
  usageByCategoryId,
}: {
  actionData: CategoryActionData;
  expenseCategories: Category[];
  incomeCategories: Category[];
  usageByCategoryId: Record<string, number>;
}) => {
  const t = usePordeeTranslation();

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle>{t("settings.categories.title")}</CardTitle>
        <p className="text-muted text-sm leading-6">
          {t("settings.categories.description")}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <CreateCategoryForm actionData={actionData} />

        {actionData?.intent === "deleteCategory" &&
          actionData.errors.general && (
            <p className="text-coral-strong text-sm">
              {t(actionData.errors.general)}
            </p>
          )}

        <div className="grid gap-4 lg:grid-cols-2">
          <CategoryGroup
            actionData={actionData}
            categories={expenseCategories}
            kind="expense"
            title={t("settings.categories.expenseTitle")}
            usageByCategoryId={usageByCategoryId}
          />
          <CategoryGroup
            actionData={actionData}
            categories={incomeCategories}
            kind="income"
            title={t("settings.categories.incomeTitle")}
            usageByCategoryId={usageByCategoryId}
          />
        </div>
      </CardContent>
    </Card>
  );
};

const AccountSection = ({
  accountMethods,
  user,
}: {
  accountMethods: AccountMethod[];
  user: AuthUser;
}) => {
  const t = usePordeeTranslation();
  const displayName = user.name || t("settings.account.defaultName");
  const providerSummary =
    accountMethods.length > 1
      ? t("settings.account.methodCount", { count: accountMethods.length })
      : getAccountMethodLabel(accountMethods[0], t);

  return (
    <div className="flex flex-col gap-5">
      <MascotTip mood="normal" title={t("settings.account.mascotTitle")}>
        {t("settings.account.mascotDescription")}
      </MascotTip>
      <Card>
        <CardHeader className="gap-2">
          <CardTitle>{t("settings.appearance.title")}</CardTitle>
          <p className="text-muted text-sm leading-6">
            {t("settings.appearance.description")}
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
          <ThemeToggle />
          <div
            aria-hidden="true"
            className="border-line bg-sky/45 relative hidden min-h-36 overflow-hidden rounded-[16px] border p-3 lg:block"
          >
            <div className="border-line bg-surface h-full rounded-[12px] border p-3">
              <div className="flex items-center gap-1.5">
                <span className="bg-coral h-2.5 w-2.5 rounded-full" />
                <span className="bg-teal h-2.5 w-2.5 rounded-full" />
                <span className="bg-lime h-2.5 w-2.5 rounded-full" />
              </div>
              <div className="mt-4 space-y-2">
                <div className="bg-ink/85 h-3 w-20 rounded-xs" />
                <div className="bg-muted/45 h-2 w-28 rounded-xs" />
              </div>
              <div className="mt-5 grid grid-cols-[1fr_2.5rem] gap-2">
                <div className="bg-sky rounded-[10px] p-2">
                  <div className="bg-teal/70 h-2 w-12 rounded-xs" />
                  <div className="bg-line mt-2 h-2 w-full rounded-xs" />
                </div>
                <div className="bg-coral/15 rounded-[10px]" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="overflow-hidden rounded-[18px]">
        <CardHeader className="border-line border-b p-0">
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_19rem]">
            <div className="flex min-w-0 flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <AccountAvatar user={user} size="lg" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg">
                      {t("settings.account.title")}
                    </CardTitle>
                    <Badge tone="teal" className="rounded-md">
                      {t("settings.account.ready")}
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
                <p className="text-muted">{t("settings.account.signInWith")}</p>
                <p className="text-ink mt-1 font-semibold">{providerSummary}</p>
              </div>
            </div>
            <div className="border-line bg-sky/35 flex flex-col justify-center gap-3 border-t p-5 xl:border-t-0 xl:border-l">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-teal h-4 w-4" />
                <p className="text-ink text-sm font-semibold">
                  {t("settings.account.scopedDataTitle")}
                </p>
              </div>
              <p className="text-muted text-sm leading-6">
                {t("settings.account.scopedDataDescription")}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-0 p-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="border-line border-b p-5 lg:border-r lg:border-b-0">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="text-teal h-5 w-5" />
              <h2 className="text-ink text-sm font-semibold">
                {t("settings.account.methodsTitle")}
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
                {t("settings.account.dataTitle")}
              </h2>
            </div>
            <div className="grid gap-3">
              <AccountStatusItem
                icon={Database}
                title={t("settings.account.appDatabaseTitle")}
                description={t("settings.account.appDatabaseDescription")}
              />
              <AccountStatusItem
                icon={CloudOff}
                title={t("settings.account.noSyncTitle")}
                description={t("settings.account.noSyncDescription")}
              />
              <AccountStatusItem
                icon={WifiOff}
                title={t("settings.account.sessionTitle")}
                description={t("settings.account.sessionDescription")}
              />
            </div>
          </div>

          <div className="border-line flex flex-col gap-3 border-t p-5 md:flex-row md:items-center md:justify-between lg:col-span-2">
            <div className="min-w-0">
              <p className="text-ink text-sm font-semibold">
                {t("settings.account.logoutTitle")}
              </p>
              <p className="text-muted mt-1 text-sm leading-6">
                {t("settings.account.logoutDescription")}
              </p>
            </div>
            <Form method="post" action="/logout" className="shrink-0">
              <Button
                type="submit"
                variant="secondary"
                className="w-full md:w-auto"
              >
                <LogOut className="h-4 w-4" />
                {t("shell.logout")}
              </Button>
            </Form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const SecuritySection = ({
  actionData,
}: {
  actionData: PasswordActionData;
}) => {
  const t = usePordeeTranslation();
  const navigation = useNavigation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const isSubmitting =
    navigation.state !== "idle" &&
    navigation.formData?.get("intent") === "changePassword";
  const passedRules = passwordRules.every((rule) => rule.test(newPassword));
  const canSubmit =
    currentPassword.length > 0 &&
    passedRules &&
    newPassword === confirmPassword &&
    !isSubmitting;
  const isError = actionData?.ok === false;
  const isSuccess = actionData?.ok === true;

  return (
    <Card className="rounded-[18px]">
      <CardHeader className="gap-2">
        <div className="flex items-start gap-3">
          <div className="bg-sky text-teal flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle>{t("settings.security.title")}</CardTitle>
            <p className="text-muted mt-2 text-sm leading-6">
              {t("settings.security.description")}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form method="post" className="flex flex-col gap-4">
          <input type="hidden" name="intent" value="changePassword" />

          {isSuccess && (
            <div className="border-line bg-sky text-ink flex items-center gap-2 rounded-[12px] border px-3 py-2 text-sm">
              <CheckCircle2 className="text-teal h-4 w-4" />
              {t(actionData.message)}
            </div>
          )}

          {isError && actionData.errors.general && (
            <p className="text-coral-strong text-sm">
              {t(actionData.errors.general)}
            </p>
          )}

          <PasswordField
            autoComplete="current-password"
            error={isError ? actionData.errors.currentPassword : undefined}
            id="current-password"
            label={t("settings.security.currentPassword")}
            name="currentPassword"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.currentTarget.value)}
          />

          <PasswordField
            autoComplete="new-password"
            error={isError ? actionData.errors.newPassword : undefined}
            id="new-password"
            label={t("settings.security.newPassword")}
            name="newPassword"
            value={newPassword}
            onChange={(event) => setNewPassword(event.currentTarget.value)}
          />

          <PasswordRequirementList password={newPassword} />

          <PasswordField
            autoComplete="new-password"
            error={isError ? actionData.errors.confirmPassword : undefined}
            id="confirm-password"
            label={t("settings.security.confirmPassword")}
            name="confirmPassword"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.currentTarget.value)}
          />

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
            <Button type="submit" variant="teal" disabled={!canSubmit}>
              <Save className="h-4 w-4" />
              {isSubmitting
                ? t("settings.security.submitting")
                : t("settings.security.submit")}
            </Button>
            {confirmPassword.length > 0 && newPassword !== confirmPassword && (
              <p className="text-coral-strong text-sm">
                {t("settings.security.confirmMismatch")}
              </p>
            )}
          </div>
        </Form>
      </CardContent>
    </Card>
  );
};

const PasswordField = ({
  error,
  id,
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  id: string;
  label: string;
  name: string;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const t = usePordeeTranslation();

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          {...props}
          id={id}
          type={isVisible ? "text" : "password"}
          className="pr-10"
        />
        <button
          type="button"
          aria-label={
            isVisible
              ? t("settings.security.hidePassword")
              : t("settings.security.showPassword")
          }
          className="text-muted hover:text-ink focus-visible:ring-coral/40 absolute top-1/2 right-3 inline-flex -translate-y-1/2 items-center justify-center rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
          onClick={() => setIsVisible((value) => !value)}
        >
          {isVisible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
      {error && <p className="text-coral-strong text-sm">{t(error)}</p>}
    </div>
  );
};

const PasswordRequirementList = ({ password }: { password: string }) => {
  const t = usePordeeTranslation();

  return (
    <ul
      className="flex flex-col gap-2"
      aria-label={t("settings.security.rulesAriaLabel")}
    >
      {passwordRules.map((rule) => {
        const passed = rule.test(password);
        return (
          <li
            key={rule.id}
            className={cn(
              "flex items-center gap-2 text-sm",
              passed ? "text-teal" : "text-muted"
            )}
          >
            {passed ? (
              <Check className="h-4 w-4 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 shrink-0" />
            )}
            <span>{t(`settings.security.rule.${rule.id}`)}</span>
          </li>
        );
      })}
    </ul>
  );
};

const SettingsPlaceholderSection = ({
  description,
  icon: Icon,
  title,
}: {
  description: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
}) => {
  return (
    <Card className="rounded-[18px]">
      <CardContent className="flex items-start gap-3 p-5">
        <div className="bg-sky text-teal flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-ink text-base font-semibold">{title}</h2>
          <p className="text-muted mt-2 text-sm leading-6">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
};

const getSettingsTab = (searchParams: URLSearchParams): SettingsTab => {
  const tab = searchParams.get("tab");
  if (
    tab === "account" ||
    tab === "notifications" ||
    tab === "security" ||
    tab === "language" ||
    tab === "categories"
  ) {
    return tab;
  }

  return "categories";
};

const getSelectedTab = (
  actionData: ActionResult,
  searchParams: URLSearchParams
): SettingsTab => {
  if (actionData?.intent === "changePassword") return "security";
  if (actionData?.intent && isCategoryIntent(actionData.intent)) {
    return "categories";
  }

  return getSettingsTab(searchParams);
};

const getCategoryActionData = (
  actionData: ActionResult
): CategoryActionData => {
  if (actionData?.ok === false && isCategoryIntent(actionData.intent)) {
    return actionData as CategoryActionData;
  }

  return undefined;
};

const getPasswordActionData = (
  actionData: ActionResult
): PasswordActionData => {
  if (actionData?.intent === "changePassword") {
    return actionData as PasswordActionData;
  }
  return undefined;
};

const isSettingsIntent = (
  value: FormDataEntryValue | null
): value is SettingsIntent => {
  return (
    value === "createCategory" ||
    value === "updateCategory" ||
    value === "deleteCategory" ||
    value === "changePassword"
  );
};

const isCategoryIntent = (intent: SettingsIntent): intent is CategoryIntent => {
  return (
    intent === "createCategory" ||
    intent === "updateCategory" ||
    intent === "deleteCategory"
  );
};

const AccountMethodRow = ({ method }: { method: AccountMethod }) => {
  const t = usePordeeTranslation();

  return (
    <div className="border-line bg-surface flex min-w-0 items-start gap-3 rounded-[12px] border p-3">
      <div className="bg-sky text-teal flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]">
        <AccountMethodIcon providerId={method.providerId} />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-ink text-sm font-semibold">
            {getAccountMethodLabel(method, t)}
          </p>
          <Badge tone="muted" className="rounded-md">
            {t("settings.account.linked")}
          </Badge>
        </div>
        <p className="text-muted mt-1 text-sm leading-6 break-words">
          {getAccountMethodDescription(method, t)}
        </p>
      </div>
    </div>
  );
};

const AccountMethodIcon = ({ providerId }: { providerId: string }) => {
  if (providerId === "google") return <Link2 className="h-5 w-5" />;
  if (providerId === "credential") return <KeyRound className="h-5 w-5" />;
  return <ShieldCheck className="h-5 w-5" />;
};

const AccountStatusItem = ({
  description,
  icon: Icon,
  title,
}: {
  description: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
}) => {
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
};

const listAccountMethods = async (
  request: Request,
  email: string
): Promise<AccountMethod[]> => {
  try {
    const accounts = await auth.api.listUserAccounts({
      headers: request.headers,
    });
    return mapAccountMethods(accounts, email);
  } catch {
    return mapAccountMethods([], email);
  }
};

const mapAccountMethods = (
  accounts: Array<{ providerId: string }>,
  email: string
): AccountMethod[] => {
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
        description: "settings.account.googleDescription",
      };
    }

    if (providerId === "credential") {
      return {
        providerId,
        label: "settings.account.emailPassword",
        description: email,
      };
    }

    return {
      providerId,
      label: providerId,
      description: "settings.account.genericProviderDescription",
    };
  });
};

const getAccountMethodLabel = (
  method: AccountMethod | undefined,
  t: Translate
) => {
  if (!method) return t("settings.account.emailPassword");
  if (method.providerId === "google") return "Google";
  if (method.providerId === "credential")
    return t("settings.account.emailPassword");
  return method.label;
};

const getAccountMethodDescription = (method: AccountMethod, t: Translate) => {
  if (method.providerId === "google") return t(method.description);
  if (method.providerId === "credential") return method.description;
  return t(method.description);
};

const CreateCategoryForm = ({
  actionData,
}: {
  actionData: CategoryActionData;
}) => {
  const isCreateError = actionData?.intent === "createCategory";
  const t = usePordeeTranslation();

  return (
    <Form
      method="post"
      className="border-line bg-sky/35 grid gap-3 rounded-md border p-4 md:grid-cols-[1fr_180px_auto]"
    >
      <input type="hidden" name="intent" value="createCategory" />
      <div className="flex flex-col gap-2">
        <Label htmlFor="new-category-name">
          {t("settings.categoryForm.nameLabel")}
        </Label>
        <Input
          id="new-category-name"
          name="name"
          defaultValue={isCreateError ? actionData.values.name : ""}
          placeholder={t("settings.categoryForm.namePlaceholder")}
        />
        {isCreateError && actionData.errors.name && (
          <p className="text-coral-strong text-sm">
            {t(actionData.errors.name)}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="new-category-kind">{t("transaction.kind.label")}</Label>
        <Select
          name="kind"
          defaultValue={isCreateError ? actionData.values.kind : "expense"}
        >
          <SelectTrigger id="new-category-kind">
            <SelectValue placeholder={t("transaction.kind.expense")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">
              {t("transaction.kind.expense")}
            </SelectItem>
            <SelectItem value="income">
              {t("transaction.kind.income")}
            </SelectItem>
          </SelectContent>
        </Select>
        {isCreateError && actionData.errors.kind && (
          <p className="text-coral-strong text-sm">
            {t(actionData.errors.kind)}
          </p>
        )}
      </div>
      <div className="flex items-end">
        <Button type="submit" className="w-full md:w-auto">
          <Plus className="h-4 w-4" />
          {t("settings.categoryForm.submit")}
        </Button>
      </div>
    </Form>
  );
};

const CategoryGroup = ({
  actionData,
  categories,
  kind,
  title,
  usageByCategoryId,
}: {
  actionData: CategoryActionData;
  categories: Category[];
  kind: TransactionKind;
  title: string;
  usageByCategoryId: Record<string, number>;
}) => {
  const t = usePordeeTranslation();

  return (
    <section className="border-line bg-surface rounded-md border">
      <div className="border-line flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-ink text-base font-semibold">{title}</h2>
        <span className="text-muted text-sm">
          {t("settings.categories.count", { count: categories.length })}
        </span>
      </div>
      <div className="divide-line divide-y">
        {categories.length === 0 ? (
          <p className="text-muted px-4 py-4 text-sm">
            {t("settings.categories.emptyKind", {
              kind: labelKind(kind, t),
            })}
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
};

const CategoryRow = ({
  actionData,
  category,
  usageCount,
}: {
  actionData: CategoryActionData;
  category: Category;
  usageCount: number;
}) => {
  const isRowError =
    actionData?.values.categoryId === category.id &&
    actionData.intent !== "createCategory";
  const canDelete = usageCount === 0;
  const deleteFormId = `delete-category-${category.id}`;
  const t = usePordeeTranslation();

  return (
    <div className="flex flex-col gap-2 px-4 py-3" data-testid="category-row">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Form method="post" className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input type="hidden" name="intent" value="updateCategory" />
          <input type="hidden" name="categoryId" value={category.id} />
          <Input
            aria-label={t("settings.categoryRow.nameAriaLabel", {
              name: category.name,
            })}
            name="name"
            defaultValue={
              isRowError && actionData?.values.name
                ? actionData.values.name
                : category.name
            }
          />
          <Button type="submit" variant="secondary">
            <Save className="h-4 w-4" />
            {t("common.save")}
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
              {t("common.delete")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("settings.categoryDelete.title")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("settings.categoryDelete.description", {
                  name: category.name,
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
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
                  {t("settings.categoryDelete.confirm")}
                </button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted text-sm">
          {usageCount > 0
            ? t("settings.categoryRow.usage", { count: usageCount })
            : t("settings.categoryRow.noUsage")}
        </p>
        {!canDelete && (
          <p className="text-muted text-sm">
            {t("settings.categoryRow.cannotDelete")}
          </p>
        )}
      </div>
      {isRowError && actionData?.errors.name && (
        <p className="text-coral-strong text-sm">{t(actionData.errors.name)}</p>
      )}
      {isRowError && actionData?.errors.general && (
        <p className="text-coral-strong text-sm">
          {t(actionData.errors.general)}
        </p>
      )}
    </div>
  );
};

const findDuplicateCategory = async (
  userId: string,
  name: string,
  kind: TransactionKind,
  exceptId?: string
) => {
  const normalizedName = normalizeCategoryName(name);
  const categories = await repo.listCategories(userId);
  return categories.find(
    (category) =>
      category.id !== exceptId &&
      category.kind === kind &&
      normalizeCategoryName(category.name) === normalizedName
  );
};

const fieldError = (
  intent: SettingsIntent,
  errors: ActionErrors,
  form: FormData
): Exclude<ActionResult, undefined> => {
  return {
    ok: false,
    intent,
    errors,
    values: formValues(form),
  };
};

const formValues = (form: FormData) => {
  return {
    categoryId: String(form.get("categoryId") ?? ""),
    kind: String(form.get("kind") ?? "expense"),
    name: String(form.get("name") ?? ""),
  };
};

const labelKind = (kind: TransactionKind, t: Translate) => {
  return kind === "income"
    ? t("transaction.kind.income")
    : t("transaction.kind.expense");
};

const normalizeCategoryName = (name: string) => {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("th-TH");
};

const zodFieldError = (
  intent: SettingsIntent,
  issues: Array<{ path: PropertyKey[]; message: string }>,
  form: FormData
): Exclude<ActionResult, undefined> => {
  const errors: ActionErrors = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (
      key === "id" ||
      key === "categoryId" ||
      key === "confirmPassword" ||
      key === "currentPassword" ||
      key === "general" ||
      key === "kind" ||
      key === "name" ||
      key === "newPassword"
    ) {
      errors[key === "id" ? "categoryId" : key] = issue.message;
    }
  }
  return fieldError(intent, errors, form);
};
