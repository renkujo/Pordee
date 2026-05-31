export type Money = number;

export type TransactionKind = "expense" | "income";

export interface Category {
  id: string;
  userId: string;
  name: string;
  kind: TransactionKind;
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
    input: Omit<Category, "id" | "userId">
  ): Promise<Category>;
  updateCategory(
    userId: string,
    id: string,
    input: Pick<Category, "name">
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
    }
  ): Promise<Transaction[]>;
  getTransaction(userId: string, id: string): Promise<Transaction | null>;
  createTransaction(
    userId: string,
    input: Omit<Transaction, "id" | "userId" | "createdAt">
  ): Promise<Transaction>;
  updateTransaction(
    userId: string,
    id: string,
    input: Omit<Transaction, "id" | "userId" | "createdAt">
  ): Promise<Transaction | null>;
  deleteTransaction(userId: string, id: string): Promise<boolean>;
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
