import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from "react-router";
import { useState, useSyncExternalStore } from "react";
import type { ComponentType, InputHTMLAttributes, ReactNode } from "react";
import {
  Bell,
  Banknote,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  Bus,
  Car,
  Check,
  CheckCircle2,
  Circle,
  CloudOff,
  Coffee,
  CreditCard,
  Database,
  Dumbbell,
  Eye,
  EyeOff,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  KeyRound,
  Landmark,
  Languages,
  Link2,
  ListChecks,
  LockKeyhole,
  LogOut,
  Mail,
  PencilLine,
  PiggyBank,
  Plane,
  Plus,
  Receipt,
  RotateCcw,
  Save,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Smartphone,
  Tags,
  Trash2,
  Utensils,
  UserRound,
  Wifi,
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
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
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
import {
  AccountAvatar,
  getAccountAvatarVariant,
} from "~/components/brand/account-avatar";
import {
  accountAvatarPresets,
  getAccountAvatarPresetById,
  isAccountAvatarPresetId,
} from "~/components/brand/account-avatar-presets";
import { MascotTip } from "~/components/brand/mascot-state";
import { ThemeToggle } from "~/components/shell/theme-toggle";
import { repo } from "~/lib/db";
import {
  DEFAULT_CATEGORY_ICON_ID,
  isCategoryIconId,
  type CategoryIconId,
} from "~/lib/db/category-icons";
import { auth, redirectWithAuthCookies, requireUser } from "~/lib/auth.server";
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
type ProfileIntent = "updateProfile" | "updateAvatarPreset";
type PasswordIntent = "changePassword";
type SettingsIntent = ProfileIntent | CategoryIntent | PasswordIntent;
type SettingsTab =
  | "account"
  | "notifications"
  | "security"
  | "language"
  | "categories";
type CategoryIconComponent = ComponentType<{ className?: string }>;
type CategoryGroupTone = {
  badgeClassName: string;
  countClassName: string;
  headerClassName: string;
  iconClassName: string;
  rowIconClassName: string;
  sectionClassName: string;
};

const categoryIconOptions: Array<{
  icon: CategoryIconComponent;
  id: CategoryIconId;
  labelKey: string;
}> = [
  {
    id: "utensils",
    icon: Utensils,
    labelKey: "settings.categoryIcon.utensils",
  },
  { id: "bus", icon: Bus, labelKey: "settings.categoryIcon.bus" },
  { id: "receipt", icon: Receipt, labelKey: "settings.categoryIcon.receipt" },
  { id: "coffee", icon: Coffee, labelKey: "settings.categoryIcon.coffee" },
  {
    id: "banknote",
    icon: Banknote,
    labelKey: "settings.categoryIcon.banknote",
  },
  {
    id: "briefcase",
    icon: BriefcaseBusiness,
    labelKey: "settings.categoryIcon.briefcase",
  },
  { id: "home", icon: Home, labelKey: "settings.categoryIcon.home" },
  { id: "car", icon: Car, labelKey: "settings.categoryIcon.car" },
  { id: "fuel", icon: Fuel, labelKey: "settings.categoryIcon.fuel" },
  {
    id: "smartphone",
    icon: Smartphone,
    labelKey: "settings.categoryIcon.smartphone",
  },
  { id: "wifi", icon: Wifi, labelKey: "settings.categoryIcon.wifi" },
  {
    id: "shopping-bag",
    icon: ShoppingBag,
    labelKey: "settings.categoryIcon.shoppingBag",
  },
  { id: "shirt", icon: Shirt, labelKey: "settings.categoryIcon.shirt" },
  { id: "heart", icon: HeartPulse, labelKey: "settings.categoryIcon.heart" },
  {
    id: "dumbbell",
    icon: Dumbbell,
    labelKey: "settings.categoryIcon.dumbbell",
  },
  {
    id: "graduation-cap",
    icon: GraduationCap,
    labelKey: "settings.categoryIcon.graduationCap",
  },
  {
    id: "book-open",
    icon: BookOpen,
    labelKey: "settings.categoryIcon.bookOpen",
  },
  { id: "plane", icon: Plane, labelKey: "settings.categoryIcon.plane" },
  { id: "gift", icon: Gift, labelKey: "settings.categoryIcon.gift" },
  {
    id: "piggy-bank",
    icon: PiggyBank,
    labelKey: "settings.categoryIcon.piggyBank",
  },
  {
    id: "landmark",
    icon: Landmark,
    labelKey: "settings.categoryIcon.landmark",
  },
  {
    id: "credit-card",
    icon: CreditCard,
    labelKey: "settings.categoryIcon.creditCard",
  },
  { id: "gamepad", icon: Gamepad2, labelKey: "settings.categoryIcon.gamepad" },
  { id: "tags", icon: Tags, labelKey: "settings.categoryIcon.tags" },
];

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
  icon?: string;
  kind?: string;
  name?: string;
  newPassword?: string;
  avatarPresetId?: string;
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
      intent: ProfileIntent | PasswordIntent;
      message: string;
    }
  | undefined;

type AccountActionData =
  | (
      | {
          ok: false;
          intent: ProfileIntent;
          errors: ActionErrors;
          values: Record<string, string>;
        }
      | {
          ok: true;
          intent: ProfileIntent;
          message: string;
        }
    )
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

  if (intent === "updateProfile" || intent === "updateAvatarPreset") {
    const avatarPresetId = String(form.get("avatarPresetId") ?? "");
    const nextAvatarPresetId = avatarPresetId || null;
    const nextName = normalizeProfileName(
      String(form.get("name") ?? user.name)
    );

    if (nextAvatarPresetId && !isAccountAvatarPresetId(nextAvatarPresetId)) {
      return fieldError(
        intent,
        { avatarPresetId: "settings.avatar.error.invalidPreset" },
        form
      );
    }

    if (intent === "updateProfile") {
      if (!nextName) {
        return fieldError(
          intent,
          { name: "settings.profile.error.nameRequired" },
          form
        );
      }

      if (nextName.length > 80) {
        return fieldError(
          intent,
          { name: "settings.profile.error.nameTooLong" },
          form
        );
      }
    }

    const { headers } = await auth.api.updateUser({
      body:
        intent === "updateProfile"
          ? { avatarPresetId: nextAvatarPresetId, name: nextName }
          : { avatarPresetId: nextAvatarPresetId },
      headers: request.headers,
      returnHeaders: true,
    });

    return redirectWithAuthCookies("/settings?tab=account", headers);
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
      icon: form.get("icon"),
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
      icon: form.get("icon"),
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

    await repo.updateCategory(user.id, category.id, {
      icon: parsed.data.icon,
      name: parsed.data.name,
    });
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
  const accountActionData = getAccountActionData(actionData);
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
            <AccountSection
              accountMethods={accountMethods}
              actionData={accountActionData}
              user={user}
            />
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
    <Card className="overflow-hidden rounded-[18px]">
      <CardHeader className="border-line bg-sky/20 gap-2 border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle>{t("settings.categories.title")}</CardTitle>
            <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
              {t("settings.categories.description")}
            </p>
          </div>
          <Badge tone="teal" className="w-fit rounded-md">
            {t("settings.categories.count", {
              count: expenseCategories.length + incomeCategories.length,
            })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 p-4 sm:p-5">
        <CreateCategoryResponsiveDialog
          actionData={actionData}
          key={getCreateCategorySurfaceKey(actionData)}
        />

        {actionData?.intent === "deleteCategory" &&
          actionData.errors.general && (
            <p className="text-coral-strong text-sm">
              {t(actionData.errors.general)}
            </p>
          )}

        <div className="grid gap-4 xl:grid-cols-2">
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
  actionData,
  user,
}: {
  accountMethods: AccountMethod[];
  actionData: AccountActionData;
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
                <ProfileEditorResponsiveDialog
                  actionData={actionData}
                  displayName={displayName}
                  key={`${user.name}-${user.avatarPresetId ?? "generated"}`}
                  user={user}
                />
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

const ProfileEditorResponsiveDialog = ({
  actionData,
  displayName,
  user,
}: {
  actionData: AccountActionData;
  displayName: string;
  user: AuthUser;
}) => {
  const t = usePordeeTranslation();
  const hasHydrated = useHasHydrated();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const isError = actionData?.ok === false;
  const [open, setOpen] = useState(isError);
  const trigger = (
    <button
      aria-label={t("settings.profile.trigger")}
      className="focus-visible:ring-coral/40 group relative shrink-0 rounded-full outline-none focus-visible:ring-2"
      disabled={!hasHydrated}
      type="button"
    >
      <AccountAvatar
        user={user}
        size="lg"
        className="transition-opacity group-disabled:opacity-60"
      />
      <span className="border-surface bg-teal text-surface group-hover:bg-teal-strong absolute right-0 bottom-0 flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-sm transition-colors">
        <PencilLine className="h-3.5 w-3.5" />
      </span>
    </button>
  );

  if (!hasHydrated) {
    return (
      <div className="flex shrink-0 flex-col items-start gap-2">
        {trigger}
        {isError && actionData.errors.avatarPresetId && (
          <p className="text-coral-strong text-xs leading-5">
            {t(actionData.errors.avatarPresetId)}
          </p>
        )}
        {isError && actionData.errors.name && (
          <p className="text-coral-strong text-xs leading-5">
            {t(actionData.errors.name)}
          </p>
        )}
      </div>
    );
  }

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent
          className="max-h-[calc(100dvh-2rem)] max-w-3xl overflow-y-auto p-0"
          data-testid="profile-editor-dialog"
        >
          <DialogHeader className="border-line border-b px-5 pt-5 pb-4">
            <DialogTitle>{t("settings.profile.title")}</DialogTitle>
            <DialogDescription>
              {t("settings.profile.description")}
            </DialogDescription>
          </DialogHeader>
          <ProfileEditorForm
            actionData={actionData}
            displayName={displayName}
            user={user}
          >
            <DialogFooter className="border-line border-t px-5 py-4">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  {t("common.cancel")}
                </Button>
              </DialogClose>
              <ProfileEditorSubmitButton />
            </DialogFooter>
          </ProfileEditorForm>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent data-testid="profile-editor-drawer">
        <DrawerHeader>
          <DrawerTitle>{t("settings.profile.title")}</DrawerTitle>
          <DrawerDescription>
            {t("settings.profile.description")}
          </DrawerDescription>
        </DrawerHeader>
        <ProfileEditorForm
          actionData={actionData}
          displayName={displayName}
          user={user}
          className="overflow-y-auto px-5 pb-4"
        >
          <DrawerFooter className="sm:flex-row sm:justify-end">
            <DrawerClose asChild>
              <Button type="button" variant="secondary">
                {t("common.cancel")}
              </Button>
            </DrawerClose>
            <ProfileEditorSubmitButton />
          </DrawerFooter>
        </ProfileEditorForm>
      </DrawerContent>
    </Drawer>
  );
};

const ProfileEditorForm = ({
  actionData,
  children,
  className,
  displayName,
  user,
}: {
  actionData: AccountActionData;
  children: ReactNode;
  className?: string;
  displayName: string;
  user: AuthUser;
}) => {
  const currentAvatarPresetId =
    getAccountAvatarPresetById(user.avatarPresetId)?.id ?? "";
  const [selectedAvatarPresetId, setSelectedAvatarPresetId] = useState(
    currentAvatarPresetId
  );
  const [name, setName] = useState(user.name || displayName);
  const t = usePordeeTranslation();
  const selectedPreset = getAccountAvatarPresetById(selectedAvatarPresetId);
  const previewPreset =
    selectedPreset ??
    getAccountAvatarVariant({ ...user, avatarPresetId: null });
  const isError = actionData?.ok === false;

  return (
    <Form
      method="post"
      className={cn("flex flex-col", className)}
      data-testid="profile-editor-form"
    >
      <input type="hidden" name="intent" value="updateProfile" />
      <input
        type="hidden"
        name="avatarPresetId"
        value={selectedAvatarPresetId}
      />

      <div className="grid gap-0 md:grid-cols-[14rem_minmax(0,1fr)]">
        <div className="border-line flex flex-col gap-4 border-b py-4 md:border-r md:border-b-0 md:px-5">
          <div className="border-line/60 bg-surface mx-auto flex aspect-square w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border">
            <img
              alt={t("settings.avatar.previewAlt")}
              className="h-full w-full rounded-full object-cover"
              draggable={false}
              src={previewPreset.src}
            />
          </div>
          <div className="min-w-0 text-center md:text-left">
            <p className="text-ink text-sm font-semibold">
              {selectedPreset
                ? t("settings.avatar.selectedLabel", {
                    index: selectedPreset.index,
                  })
                : t("settings.avatar.generatedLabel")}
            </p>
            <p className="text-muted mt-1 text-sm leading-6">
              {t("settings.profile.previewHint")}
            </p>
          </div>
        </div>

        <div className="bg-surface flex min-w-0 flex-col gap-4 py-4 md:px-5">
          <div className="grid gap-2">
            <Label htmlFor="profile-name">
              {t("settings.profile.nameLabel")}
            </Label>
            <Input
              id="profile-name"
              name="name"
              autoComplete="name"
              maxLength={80}
              placeholder={t("settings.profile.namePlaceholder")}
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
            />
            {isError && actionData.errors.name && (
              <p className="text-coral-strong text-sm">
                {t(actionData.errors.name)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-ink text-sm font-semibold">
                  {t("settings.avatar.gridLabel")}
                </p>
                <p className="text-muted mt-1 text-xs leading-5">
                  {t("settings.avatar.description")}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={selectedAvatarPresetId === ""}
                onClick={() => setSelectedAvatarPresetId("")}
              >
                <RotateCcw className="h-4 w-4" />
                {t("settings.avatar.reset")}
              </Button>
            </div>

            <div
              aria-label={t("settings.avatar.gridLabel")}
              className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6"
              role="radiogroup"
            >
              {accountAvatarPresets.map((preset) => {
                const active = selectedAvatarPresetId === preset.id;

                return (
                  <label
                    className={cn(
                      "border-line bg-sky/35 focus-within:ring-coral/40 relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-[12px] border transition-colors focus-within:ring-2",
                      active
                        ? "border-coral bg-coral/10 shadow-[inset_0_0_0_1px_var(--color-coral)]"
                        : "hover:border-teal/35 hover:bg-sky"
                    )}
                    key={preset.id}
                  >
                    <input
                      aria-label={t("settings.avatar.optionLabel", {
                        index: preset.index,
                      })}
                      checked={active}
                      className="absolute inset-0 z-10 cursor-pointer opacity-0"
                      onChange={() => setSelectedAvatarPresetId(preset.id)}
                      type="radio"
                    />
                    <img
                      alt=""
                      className="pointer-events-none h-full w-full scale-[1.12] object-cover"
                      draggable={false}
                      src={preset.src}
                    />
                    {active && (
                      <span className="bg-coral pointer-events-none absolute top-1 right-1 z-20 flex h-5 w-5 items-center justify-center rounded-full text-white">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {isError && actionData.errors.avatarPresetId && (
            <p className="text-coral-strong text-sm">
              {t(actionData.errors.avatarPresetId)}
            </p>
          )}
        </div>
      </div>

      {children}
    </Form>
  );
};

const ProfileEditorSubmitButton = () => {
  const t = usePordeeTranslation();
  const navigation = useNavigation();
  const isSubmitting =
    navigation.state !== "idle" &&
    navigation.formData?.get("intent") === "updateProfile";

  return (
    <Button type="submit" variant="teal" disabled={isSubmitting}>
      <Save className="h-4 w-4" />
      {isSubmitting
        ? t("settings.profile.submitting")
        : t("settings.profile.submit")}
    </Button>
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

  return "account";
};

const getSelectedTab = (
  actionData: ActionResult,
  searchParams: URLSearchParams
): SettingsTab => {
  if (
    actionData?.intent === "updateProfile" ||
    actionData?.intent === "updateAvatarPreset"
  ) {
    return "account";
  }
  if (actionData?.intent === "changePassword") return "security";
  if (actionData?.intent && isCategoryIntent(actionData.intent)) {
    return "categories";
  }

  return getSettingsTab(searchParams);
};

const getAccountActionData = (actionData: ActionResult): AccountActionData => {
  if (
    actionData?.intent === "updateProfile" ||
    actionData?.intent === "updateAvatarPreset"
  ) {
    return actionData as AccountActionData;
  }
  return undefined;
};

const getCategoryActionData = (
  actionData: ActionResult
): CategoryActionData => {
  if (actionData?.ok === false && isCategoryIntent(actionData.intent)) {
    return actionData as CategoryActionData;
  }

  return undefined;
};

const getCreateCategorySurfaceKey = (actionData: CategoryActionData) => {
  if (actionData?.intent !== "createCategory") return "create-ready";

  return [
    "create-error",
    actionData.values.name,
    actionData.values.kind,
    actionData.values.icon,
  ].join("-");
};

const getEditCategorySurfaceKey = (
  actionData: CategoryActionData,
  categoryId: string
) => {
  if (
    actionData?.intent !== "updateCategory" ||
    actionData.values.categoryId !== categoryId
  ) {
    return `edit-ready-${categoryId}`;
  }

  return [
    "edit-error",
    categoryId,
    actionData.values.name,
    actionData.values.icon,
  ].join("-");
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
    value === "changePassword" ||
    value === "updateProfile" ||
    value === "updateAvatarPreset"
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

const CreateCategoryResponsiveDialog = ({
  actionData,
}: {
  actionData: CategoryActionData;
}) => {
  const isCreateError = actionData?.intent === "createCategory";
  const t = usePordeeTranslation();
  const hasHydrated = useHasHydrated();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const navigation = useNavigation();
  const [open, setOpen] = useState(isCreateError);
  const isSubmitting =
    navigation.state !== "idle" &&
    navigation.formData?.get("intent") === "createCategory";
  const selectedIcon = getSafeCategoryIconId(
    isCreateError ? actionData.values.icon : DEFAULT_CATEGORY_ICON_ID
  );
  const trigger = (
    <Button type="button" className="w-full sm:w-auto" disabled={!hasHydrated}>
      <Plus className="h-4 w-4" />
      {t("settings.categoryForm.submit")}
    </Button>
  );
  const wrappedTrigger = !hasHydrated ? (
    trigger
  ) : isDesktop ? (
    <DialogTrigger asChild>{trigger}</DialogTrigger>
  ) : (
    <DrawerTrigger asChild>{trigger}</DrawerTrigger>
  );

  const prompt = (
    <div className="border-line bg-sky/30 flex flex-col gap-3 rounded-[14px] border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-ink text-sm font-semibold">
          {t("settings.categoryForm.drawerPromptTitle")}
        </p>
        <p className="text-muted mt-1 text-sm leading-6">
          {t("settings.categoryForm.drawerPromptDescription")}
        </p>
      </div>
      {wrappedTrigger}
    </div>
  );

  if (!hasHydrated) {
    return prompt;
  }

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {prompt}
        <DialogContent data-testid="create-category-dialog">
          <DialogHeader>
            <DialogTitle>{t("settings.categoryForm.drawerTitle")}</DialogTitle>
            <DialogDescription>
              {t("settings.categoryForm.drawerDescription")}
            </DialogDescription>
          </DialogHeader>
          <Form
            method="post"
            className="grid gap-4"
            onSubmit={() => setOpen(false)}
          >
            <input type="hidden" name="intent" value="createCategory" />
            <CreateCategoryFormFields
              actionData={actionData}
              isCreateError={isCreateError}
              selectedIcon={selectedIcon}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  {t("common.cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                <Plus className="h-4 w-4" />
                {isSubmitting
                  ? t("settings.categoryForm.submitting")
                  : t("settings.categoryForm.submit")}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {prompt}
      <DrawerContent data-testid="create-category-drawer">
        <DrawerHeader>
          <DrawerTitle>{t("settings.categoryForm.drawerTitle")}</DrawerTitle>
          <DrawerDescription>
            {t("settings.categoryForm.drawerDescription")}
          </DrawerDescription>
        </DrawerHeader>
        <Form
          method="post"
          className="flex flex-col"
          onSubmit={() => setOpen(false)}
        >
          <input type="hidden" name="intent" value="createCategory" />
          <div className="overflow-y-auto px-5 pb-4">
            <CreateCategoryFormFields
              actionData={actionData}
              isCreateError={isCreateError}
              selectedIcon={selectedIcon}
            />
          </div>
          <DrawerFooter className="sm:flex-row sm:justify-end">
            <DrawerClose asChild>
              <Button type="button" variant="secondary">
                {t("common.cancel")}
              </Button>
            </DrawerClose>
            <Button type="submit" disabled={isSubmitting}>
              <Plus className="h-4 w-4" />
              {isSubmitting
                ? t("settings.categoryForm.submitting")
                : t("settings.categoryForm.submit")}
            </Button>
          </DrawerFooter>
        </Form>
      </DrawerContent>
    </Drawer>
  );
};

const CreateCategoryFormFields = ({
  actionData,
  isCreateError,
  selectedIcon,
}: {
  actionData: CategoryActionData;
  isCreateError: boolean;
  selectedIcon: CategoryIconId;
}) => {
  const t = usePordeeTranslation();

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_12rem]">
      <div className="flex flex-col gap-2">
        <Label htmlFor="new-category-name">
          {t("settings.categoryForm.nameLabel")}
        </Label>
        <Input
          id="new-category-name"
          name="name"
          defaultValue={isCreateError ? actionData?.values.name : ""}
          placeholder={t("settings.categoryForm.namePlaceholder")}
        />
        {isCreateError && actionData?.errors.name && (
          <p className="text-coral-strong text-sm">
            {t(actionData.errors.name)}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="new-category-kind">{t("transaction.kind.label")}</Label>
        <Select
          name="kind"
          defaultValue={isCreateError ? actionData?.values.kind : "expense"}
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
        {isCreateError && actionData?.errors.kind && (
          <p className="text-coral-strong text-sm">
            {t(actionData.errors.kind)}
          </p>
        )}
      </div>
      <CategoryIconPicker
        className="md:col-span-2"
        defaultValue={selectedIcon}
        error={isCreateError ? actionData?.errors.icon : undefined}
        legend={t("settings.categoryIcon.label")}
      />
    </div>
  );
};

const getCategoryGroupTone = (kind: TransactionKind): CategoryGroupTone => {
  if (kind === "income") {
    return {
      badgeClassName: "border-teal/30 bg-teal/10 text-teal",
      countClassName: "border-teal/25 text-teal",
      headerClassName: "border-teal/20 bg-teal/10",
      iconClassName: "border-teal/25 bg-teal/10 text-teal",
      rowIconClassName: "border-teal/20 bg-teal/10 text-teal",
      sectionClassName: "border-teal/30",
    };
  }

  return {
    badgeClassName: "border-coral/30 bg-coral/10 text-coral-strong",
    countClassName: "border-coral/25 text-coral-strong",
    headerClassName: "border-coral/20 bg-coral/10",
    iconClassName: "border-coral/25 bg-coral/10 text-coral-strong",
    rowIconClassName: "border-coral/20 bg-coral/10 text-coral-strong",
    sectionClassName: "border-coral/35",
  };
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
  const kindLabel = labelKind(kind, t);
  const tone = getCategoryGroupTone(kind);

  return (
    <section
      className={cn(
        "bg-surface overflow-hidden rounded-[14px] border",
        tone.sectionClassName
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 border-b px-4 py-3",
          tone.headerClassName
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border",
              tone.iconClassName
            )}
          >
            {kind === "income" ? (
              <Banknote className="h-4 w-4" />
            ) : (
              <Receipt className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="text-ink truncate text-base font-semibold">
                {title}
              </h2>
              <span
                className={cn(
                  "hidden shrink-0 rounded-[8px] border px-2 py-0.5 text-xs font-medium sm:inline-flex",
                  tone.badgeClassName
                )}
              >
                {kindLabel}
              </span>
            </div>
            <p className="text-muted mt-0.5 text-xs sm:hidden">{kindLabel}</p>
          </div>
        </div>
        <span
          className={cn(
            "bg-surface shrink-0 rounded-[8px] border px-2 py-1 text-xs font-medium",
            tone.countClassName
          )}
        >
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
              tone={tone}
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
  tone,
  usageCount,
}: {
  actionData: CategoryActionData;
  category: Category;
  tone: CategoryGroupTone;
  usageCount: number;
}) => {
  const isRowError =
    actionData?.values.categoryId === category.id &&
    actionData.intent === "updateCategory";
  const canDelete = usageCount === 0;
  const deleteFormId = `delete-category-${category.id}`;
  const t = usePordeeTranslation();
  const selectedIcon = getSafeCategoryIconId(
    isRowError ? actionData?.values.icon : category.icon
  );

  return (
    <div className="px-4 py-4" data-testid="category-row">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-[12px] border",
              tone.rowIconClassName
            )}
          >
            <CategoryIconGlyph icon={category.icon} className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p
              aria-label={t("settings.categoryRow.nameAriaLabel", {
                name: category.name,
              })}
              className="text-ink truncate text-sm font-semibold"
            >
              {category.name}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span
                aria-label={
                  usageCount > 0
                    ? t("settings.categoryRow.usage", { count: usageCount })
                    : t("settings.categoryRow.noUsage")
                }
                className="border-line text-muted inline-flex h-7 items-center gap-1.5 rounded-[8px] border px-2 text-xs tabular-nums"
                title={
                  usageCount > 0
                    ? t("settings.categoryRow.usage", { count: usageCount })
                    : t("settings.categoryRow.noUsage")
                }
              >
                <ListChecks className="h-3.5 w-3.5" />
                {usageCount}
              </span>
              {!canDelete && (
                <span
                  aria-label={t("settings.categoryRow.cannotDelete")}
                  className="border-line text-muted inline-flex h-7 w-7 items-center justify-center rounded-[8px] border"
                  title={t("settings.categoryRow.cannotDelete")}
                >
                  <LockKeyhole className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end sm:gap-1.5">
          <EditCategoryResponsiveDialog
            actionData={actionData}
            category={category}
            key={getEditCategorySurfaceKey(actionData, category.id)}
            selectedIcon={selectedIcon}
          />
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
                className="text-coral-strong border-coral/40 hover:bg-coral/10 w-full lg:w-auto"
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
      </div>
    </div>
  );
};

const EditCategoryResponsiveDialog = ({
  actionData,
  category,
  selectedIcon,
}: {
  actionData: CategoryActionData;
  category: Category;
  selectedIcon: CategoryIconId;
}) => {
  const isRowError =
    actionData?.values.categoryId === category.id &&
    actionData.intent === "updateCategory";
  const t = usePordeeTranslation();
  const hasHydrated = useHasHydrated();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const navigation = useNavigation();
  const [open, setOpen] = useState(isRowError);
  const isSubmitting =
    navigation.state !== "idle" &&
    navigation.formData?.get("intent") === "updateCategory" &&
    navigation.formData?.get("categoryId") === category.id;
  const nameValue =
    isRowError && actionData?.values.name
      ? actionData.values.name
      : category.name;
  const trigger = (
    <Button
      type="button"
      variant="secondary"
      className="w-full sm:w-auto"
      disabled={!hasHydrated}
    >
      <PencilLine className="h-4 w-4" />
      {t("settings.categoryEdit.trigger")}
    </Button>
  );

  if (!hasHydrated) {
    return trigger;
  }

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent data-testid="edit-category-dialog">
          <DialogHeader>
            <DialogTitle>
              {t("settings.categoryEdit.title", { name: category.name })}
            </DialogTitle>
            <DialogDescription>
              {t("settings.categoryEdit.description")}
            </DialogDescription>
          </DialogHeader>
          <EditCategoryForm
            actionData={actionData}
            category={category}
            isRowError={isRowError}
            nameValue={nameValue}
            selectedIcon={selectedIcon}
            onSubmit={() => setOpen(false)}
          >
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  {t("common.cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="h-4 w-4" />
                {isSubmitting
                  ? t("settings.categoryEdit.submitting")
                  : t("settings.categoryEdit.submit")}
              </Button>
            </DialogFooter>
          </EditCategoryForm>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent data-testid="edit-category-drawer">
        <DrawerHeader>
          <DrawerTitle>
            {t("settings.categoryEdit.title", { name: category.name })}
          </DrawerTitle>
          <DrawerDescription>
            {t("settings.categoryEdit.description")}
          </DrawerDescription>
        </DrawerHeader>
        <EditCategoryForm
          actionData={actionData}
          category={category}
          isRowError={isRowError}
          nameValue={nameValue}
          selectedIcon={selectedIcon}
          onSubmit={() => setOpen(false)}
          className="px-5 pb-4"
        >
          <DrawerFooter className="-mx-5 mt-4 sm:flex-row sm:justify-end">
            <DrawerClose asChild>
              <Button type="button" variant="secondary">
                {t("common.cancel")}
              </Button>
            </DrawerClose>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4" />
              {isSubmitting
                ? t("settings.categoryEdit.submitting")
                : t("settings.categoryEdit.submit")}
            </Button>
          </DrawerFooter>
        </EditCategoryForm>
      </DrawerContent>
    </Drawer>
  );
};

const EditCategoryForm = ({
  actionData,
  category,
  children,
  className,
  isRowError,
  nameValue,
  onSubmit,
  selectedIcon,
}: {
  actionData: CategoryActionData;
  category: Category;
  children: ReactNode;
  className?: string;
  isRowError: boolean;
  nameValue: string;
  onSubmit: () => void;
  selectedIcon: CategoryIconId;
}) => {
  const t = usePordeeTranslation();

  return (
    <Form
      method="post"
      className={cn("grid gap-4", className)}
      onSubmit={onSubmit}
    >
      <input type="hidden" name="intent" value="updateCategory" />
      <input type="hidden" name="categoryId" value={category.id} />
      <div className="grid gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`edit-category-name-${category.id}`}>
            {t("settings.categoryRow.nameAriaLabel", {
              name: category.name,
            })}
          </Label>
          <Input
            aria-label={t("settings.categoryRow.nameAriaLabel", {
              name: category.name,
            })}
            id={`edit-category-name-${category.id}`}
            name="name"
            defaultValue={nameValue}
          />
          {isRowError && actionData?.errors.name && (
            <p className="text-coral-strong text-sm">
              {t(actionData.errors.name)}
            </p>
          )}
        </div>
        <CategoryIconPicker
          defaultValue={selectedIcon}
          error={isRowError ? actionData?.errors.icon : undefined}
          legend={t("settings.categoryIcon.rowLabel", {
            name: category.name,
          })}
        />
      </div>
      {isRowError && actionData?.errors.general && (
        <p className="text-coral-strong text-sm">
          {t(actionData.errors.general)}
        </p>
      )}
      {children}
    </Form>
  );
};

const CategoryIconPicker = ({
  className,
  compact = false,
  defaultValue,
  error,
  legend,
}: {
  className?: string;
  compact?: boolean;
  defaultValue: CategoryIconId;
  error?: string;
  legend: string;
}) => {
  const t = usePordeeTranslation();

  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="text-ink mb-2 text-sm font-medium">{legend}</legend>
      <div
        className={cn(
          "border-line bg-sky/25 grid items-center rounded-md border",
          compact
            ? "grid-cols-[repeat(auto-fit,minmax(2.25rem,1fr))] gap-1.5 p-2"
            : "grid-cols-[repeat(auto-fit,minmax(3rem,1fr))] gap-2 p-3"
        )}
      >
        {categoryIconOptions.map((option) => {
          const Icon = option.icon;
          const label = t(option.labelKey);

          return (
            <label
              className="focus-within:ring-coral/40 relative min-w-0 rounded-md focus-within:ring-2 focus-within:outline-none"
              key={option.id}
              title={label}
            >
              <input
                aria-label={t("settings.categoryIcon.optionLabel", {
                  label,
                })}
                className="peer absolute inset-0 z-10 cursor-pointer opacity-0"
                defaultChecked={option.id === defaultValue}
                name="icon"
                type="radio"
                value={option.id}
              />
              <span
                className={cn(
                  "border-line bg-surface text-muted peer-checked:border-coral peer-checked:bg-coral/10 peer-checked:text-coral-strong hover:border-teal/35 hover:text-teal flex w-full cursor-pointer items-center justify-center rounded-md border transition-colors active:scale-[0.98]",
                  compact ? "h-9" : "h-11"
                )}
              >
                <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
              </span>
            </label>
          );
        })}
      </div>
      {error && <p className="text-coral-strong mt-2 text-sm">{t(error)}</p>}
    </fieldset>
  );
};

const CategoryIconGlyph = ({
  className,
  icon,
}: {
  className?: string;
  icon: CategoryIconId;
}) => {
  const option =
    categoryIconOptions.find((item) => item.id === icon) ??
    categoryIconOptions[categoryIconOptions.length - 1];
  const Icon = option.icon;

  return <Icon className={className} />;
};

const getSafeCategoryIconId = (value: unknown): CategoryIconId => {
  return isCategoryIconId(value) ? value : DEFAULT_CATEGORY_ICON_ID;
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
    avatarPresetId: String(form.get("avatarPresetId") ?? ""),
    categoryId: String(form.get("categoryId") ?? ""),
    icon: String(form.get("icon") ?? DEFAULT_CATEGORY_ICON_ID),
    kind: String(form.get("kind") ?? "expense"),
    name: String(form.get("name") ?? ""),
  };
};

const labelKind = (kind: TransactionKind, t: Translate) => {
  return kind === "income"
    ? t("transaction.kind.income")
    : t("transaction.kind.expense");
};

let hasHydratedSnapshot = false;

const useHasHydrated = () => {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!hasHydratedSnapshot) {
        hasHydratedSnapshot = true;
        queueMicrotask(onStoreChange);
      }

      return () => {};
    },
    () => hasHydratedSnapshot,
    () => false
  );
};

const useMediaQuery = (query: string) => {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener("change", onStoreChange);
      return () => {
        mediaQueryList.removeEventListener("change", onStoreChange);
      };
    },
    () => window.matchMedia(query).matches,
    () => false
  );
};

const normalizeCategoryName = (name: string) => {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("th-TH");
};

const normalizeProfileName = (name: string) => {
  return name.trim().replace(/\s+/g, " ");
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
      key === "icon" ||
      key === "kind" ||
      key === "name" ||
      key === "newPassword" ||
      key === "avatarPresetId"
    ) {
      errors[key === "id" ? "categoryId" : key] = issue.message;
    }
  }
  return fieldError(intent, errors, form);
};
