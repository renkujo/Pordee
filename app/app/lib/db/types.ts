import type { CategoryIconId } from "./category-icons";

export type Money = number;

export type TransactionKind = "expense" | "income";
export type TransactionSource = "manual" | "recurring";
export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";
export type RecurringPostMode = "confirm" | "auto";
export type RecurringTemplateStatus = "active" | "paused" | "completed";
export type RecurringOccurrenceStatus = "pending" | "posted";

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
