export type Money = number;

export type TransactionKind = "expense" | "income";

export interface Category {
  id: string;
  name: string;
  kind: TransactionKind;
}

export interface Transaction {
  id: string;
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
  name: string;
  target: Money;
  saved: Money;
  createdAt: string;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amount: Money;
  note: string | null;
  occurredAt: string;
}

export interface PordeeRepo {
  listCategories(): Promise<Category[]>;
  createCategory(input: Omit<Category, "id">): Promise<Category>;
  updateCategory(
    id: string,
    input: Pick<Category, "name">
  ): Promise<Category | null>;
  deleteCategory(id: string): Promise<boolean>;
  countTransactionsByCategory(categoryId: string): Promise<number>;
  listTransactions(opts?: {
    from?: string;
    to?: string;
    kind?: TransactionKind;
    categoryId?: string;
  }): Promise<Transaction[]>;
  getTransaction(id: string): Promise<Transaction | null>;
  createTransaction(
    input: Omit<Transaction, "id" | "createdAt">
  ): Promise<Transaction>;
  updateTransaction(
    id: string,
    input: Omit<Transaction, "id" | "createdAt">
  ): Promise<Transaction | null>;
  deleteTransaction(id: string): Promise<boolean>;
  listGoals(): Promise<Goal[]>;
  createGoal(input: Omit<Goal, "id" | "createdAt" | "saved">): Promise<Goal>;
  addContribution(
    input: Omit<GoalContribution, "id">
  ): Promise<GoalContribution>;
}
