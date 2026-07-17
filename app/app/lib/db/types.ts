import type { CategoryIconId } from "./category-icons";

export type Money = number;

export type TransactionKind = "expense" | "income";
export type TransactionSource = "manual" | "recurring";
export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";
export type RecurringPostMode = "confirm" | "auto";
export type RecurringTemplateStatus = "active" | "paused" | "completed";
export type RecurringOccurrenceStatus = "pending" | "posted";
export type WalletPocketType =
  | "daily"
  | "travel"
  | "bills"
  | "reserve"
  | "custom";
export type WalletPocketMascot = "happy" | "normal" | "thinking" | "saving";
export type WalletPocketSurface = "teal" | "lime" | "coral" | "sky" | "neutral";
export type WalletRolloverRule = "keep" | "reset" | "move_to_reserve";
export type DailyReminderRunStatus =
  | "claimed"
  | "skipped_disabled"
  | "skipped_transaction"
  | "sent"
  | "partial"
  | "failed";

export interface Category {
  id: string;
  userId: string;
  name: string;
  kind: TransactionKind;
  icon: CategoryIconId;
}

export interface Transaction {
  id: string;
  userId: string;
  kind: TransactionKind;
  title: string;
  amount: Money;
  categoryId: string | null;
  note: string | null;
  occurredAt: string;
  createdAt: string;
  source: TransactionSource;
  recurringTemplateId: string | null;
  recurringOccurrenceId: string | null;
}

export interface RecurringTemplate {
  id: string;
  userId: string;
  kind: TransactionKind;
  title: string;
  amount: Money;
  categoryId: string | null;
  note: string | null;
  frequency: RecurringFrequency;
  weeklyDay: number | null;
  monthlyDay: number | null;
  yearlyMonth: number | null;
  yearlyDay: number | null;
  startDate: string;
  endDate: string | null;
  nextRunOn: string | null;
  postMode: RecurringPostMode;
  status: RecurringTemplateStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringOccurrence {
  id: string;
  userId: string;
  templateId: string;
  scheduledOn: string;
  status: RecurringOccurrenceStatus;
  transactionId: string | null;
  createdAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  target: Money;
  saved: Money;
  createdAt: string;
}

export interface GoalContribution {
  id: string;
  userId: string;
  goalId: string;
  amount: Money;
  note: string | null;
  occurredAt: string;
}

export interface WalletPocket {
  id: string;
  userId: string;
  name: string;
  description: string;
  type: WalletPocketType;
  monthlyLimit: Money;
  mascot: WalletPocketMascot;
  surface: WalletPocketSurface;
  rolloverRule: WalletRolloverRule;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  categoryIds: string[];
}

export interface WalletAllocation {
  id: string;
  userId: string;
  pocketId: string;
  monthKey: string;
  amount: Money;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransfer {
  id: string;
  userId: string;
  fromPocketId: string | null;
  toPocketId: string | null;
  amount: Money;
  note: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface DailyReminderPreference {
  userId: string;
  enabled: boolean;
  localTime: string;
  timeZone: string;
  createdAt: string;
  updatedAt: string;
}

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  expirationTime: string | null;
  userAgent: string | null;
}

export interface PushSubscriptionRecord extends PushSubscriptionInput {
  id: string;
  userId: string;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyReminderDeviceResult {
  preference: DailyReminderPreference;
  activeDeviceCount: number;
}

export interface PordeeRepo {
  listCategories(userId: string): Promise<Category[]>;
  createCategory(
    userId: string,
    input: Pick<Category, "kind" | "name"> & Partial<Pick<Category, "icon">>
  ): Promise<Category>;
  updateCategory(
    userId: string,
    id: string,
    input: Pick<Category, "name"> & Partial<Pick<Category, "icon">>
  ): Promise<Category | null>;
  deleteCategory(userId: string, id: string): Promise<boolean>;
  countTransactionsByCategory(
    userId: string,
    categoryId: string
  ): Promise<number>;
  listTransactions(
    userId: string,
    opts?: {
      from?: string;
      to?: string;
      kind?: TransactionKind;
      categoryId?: string;
      source?: TransactionSource;
    }
  ): Promise<Transaction[]>;
  getTransaction(userId: string, id: string): Promise<Transaction | null>;
  createTransaction(
    userId: string,
    input: Omit<
      Transaction,
      | "id"
      | "userId"
      | "createdAt"
      | "source"
      | "recurringTemplateId"
      | "recurringOccurrenceId"
    > &
      Partial<
        Pick<
          Transaction,
          "source" | "recurringTemplateId" | "recurringOccurrenceId"
        >
      >
  ): Promise<Transaction>;
  updateTransaction(
    userId: string,
    id: string,
    input: Omit<
      Transaction,
      | "id"
      | "userId"
      | "createdAt"
      | "source"
      | "recurringTemplateId"
      | "recurringOccurrenceId"
    >
  ): Promise<Transaction | null>;
  deleteTransaction(userId: string, id: string): Promise<boolean>;
  listRecurringTemplates(userId: string): Promise<RecurringTemplate[]>;
  createRecurringTemplate(
    userId: string,
    input: Omit<
      RecurringTemplate,
      "id" | "userId" | "createdAt" | "updatedAt" | "status" | "nextRunOn"
    >
  ): Promise<RecurringTemplate>;
  updateRecurringTemplate(
    userId: string,
    id: string,
    input: Omit<
      RecurringTemplate,
      "id" | "userId" | "createdAt" | "updatedAt" | "status" | "nextRunOn"
    >
  ): Promise<RecurringTemplate | null>;
  pauseRecurringTemplate(userId: string, id: string): Promise<boolean>;
  resumeRecurringTemplate(userId: string, id: string): Promise<boolean>;
  deleteRecurringTemplate(userId: string, id: string): Promise<boolean>;
  listPendingRecurringOccurrences(
    userId: string
  ): Promise<RecurringOccurrence[]>;
  confirmRecurringOccurrence(
    userId: string,
    id: string,
    input: Omit<
      Transaction,
      | "id"
      | "userId"
      | "createdAt"
      | "source"
      | "recurringTemplateId"
      | "recurringOccurrenceId"
    >
  ): Promise<Transaction | null>;
  processDueRecurring(userId: string, untilDay?: string): Promise<void>;
  listWalletPockets(userId: string): Promise<WalletPocket[]>;
  createWalletPocket(
    userId: string,
    input: Omit<
      WalletPocket,
      | "id"
      | "userId"
      | "sortOrder"
      | "isArchived"
      | "createdAt"
      | "updatedAt"
      | "categoryIds"
    > & { categoryIds?: string[] }
  ): Promise<WalletPocket>;
  updateWalletPocket(
    userId: string,
    id: string,
    input: Omit<
      WalletPocket,
      | "id"
      | "userId"
      | "sortOrder"
      | "isArchived"
      | "createdAt"
      | "updatedAt"
      | "categoryIds"
    > & { categoryIds?: string[] }
  ): Promise<WalletPocket | null>;
  archiveWalletPocket(userId: string, id: string): Promise<boolean>;
  reorderWalletPockets(userId: string, pocketIds: string[]): Promise<void>;
  listWalletAllocations(
    userId: string,
    monthKey: string
  ): Promise<WalletAllocation[]>;
  setWalletAllocations(
    userId: string,
    monthKey: string,
    allocations: Array<{ pocketId: string; amount: Money }>
  ): Promise<WalletAllocation[]>;
  listWalletTransfers(
    userId: string,
    opts?: { from?: string; to?: string }
  ): Promise<WalletTransfer[]>;
  createWalletTransfer(
    userId: string,
    input: Omit<WalletTransfer, "id" | "userId" | "createdAt">
  ): Promise<WalletTransfer>;
  getDailyReminderPreference(userId: string): Promise<DailyReminderPreference>;
  updateDailyReminderPreference(
    userId: string,
    input: Pick<DailyReminderPreference, "enabled" | "localTime" | "timeZone">
  ): Promise<DailyReminderPreference>;
  enableDailyReminder(
    userId: string,
    schedule: Pick<DailyReminderPreference, "localTime" | "timeZone">,
    subscription: PushSubscriptionInput
  ): Promise<DailyReminderDeviceResult>;
  disableDailyReminder(
    userId: string,
    schedule: Pick<DailyReminderPreference, "localTime" | "timeZone">
  ): Promise<DailyReminderDeviceResult>;
  upsertPushSubscription(
    userId: string,
    input: PushSubscriptionInput
  ): Promise<PushSubscriptionRecord>;
  revokePushSubscription(userId: string, endpoint: string): Promise<boolean>;
  listActivePushSubscriptions(
    userId: string
  ): Promise<PushSubscriptionRecord[]>;
  countActivePushSubscriptions(userId: string): Promise<number>;
  listGoals(userId: string): Promise<Goal[]>;
  createGoal(
    userId: string,
    input: Omit<Goal, "id" | "userId" | "createdAt" | "saved">
  ): Promise<Goal>;
  addContribution(
    userId: string,
    input: Omit<GoalContribution, "id" | "userId">
  ): Promise<GoalContribution>;
}
