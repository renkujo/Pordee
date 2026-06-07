import { randomUUID } from "node:crypto";
import type {
  Category,
  Goal,
  GoalContribution,
  PordeeRepo,
  Transaction,
} from "./types";

interface Store {
  seededUsers: Set<string>;
  categories: Category[];
  transactions: Transaction[];
  goals: Goal[];
  contributions: GoalContribution[];
}

declare global {
  var __pordeeStore: Store | undefined;
}

const DEFAULT_CATEGORIES: Array<Pick<Category, "name" | "kind">> = [
  { name: "อาหาร", kind: "expense" },
  { name: "เดินทาง", kind: "expense" },
  { name: "บิล", kind: "expense" },
  { name: "เงินเดือน", kind: "income" },
  { name: "งานเสริม", kind: "income" },
];

const emptyStore = (): Store => {
  return {
    seededUsers: new Set<string>(),
    categories: [],
    transactions: [],
    goals: [],
    contributions: [],
  };
};

const store: Store = (globalThis.__pordeeStore ??= emptyStore());

const nowIso = () => {
  return new Date().toISOString();
};

const inRange = (occurredAt: string, from?: string, to?: string) => {
  if (from && occurredAt < from) return false;
  if (to && occurredAt > to) return false;
  return true;
};

// Seed the default category set the first time we see a user.
const ensureSeeded = (userId: string) => {
  if (store.seededUsers.has(userId)) return;
  store.seededUsers.add(userId);
  for (const def of DEFAULT_CATEGORIES) {
    store.categories.push({ id: randomUUID(), userId, ...def });
  }
};

export const mockRepo: PordeeRepo = {
  async listCategories(userId) {
    ensureSeeded(userId);
    return store.categories.filter((c) => c.userId === userId);
  },

  async createCategory(userId, input) {
    ensureSeeded(userId);
    const category: Category = { id: randomUUID(), userId, ...input };
    store.categories.push(category);
    return category;
  },

  async updateCategory(userId, id, input) {
    const idx = store.categories.findIndex(
      (c) => c.id === id && c.userId === userId
    );
    if (idx === -1) return null;
    const next: Category = { ...store.categories[idx], name: input.name };
    store.categories[idx] = next;
    return next;
  },

  async deleteCategory(userId, id) {
    if (
      store.transactions.some((t) => t.categoryId === id && t.userId === userId)
    ) {
      return false;
    }
    const idx = store.categories.findIndex(
      (c) => c.id === id && c.userId === userId
    );
    if (idx === -1) return false;
    store.categories.splice(idx, 1);
    return true;
  },

  async countTransactionsByCategory(userId, categoryId) {
    return store.transactions.filter(
      (t) => t.categoryId === categoryId && t.userId === userId
    ).length;
  },

  async listTransactions(userId, opts = {}) {
    return store.transactions
      .filter((t) => t.userId === userId)
      .filter((t) => inRange(t.occurredAt, opts.from, opts.to))
      .filter((t) => (opts.kind ? t.kind === opts.kind : true))
      .filter((t) =>
        opts.categoryId ? t.categoryId === opts.categoryId : true
      )
      .sort((a, b) => {
        if (a.occurredAt !== b.occurredAt) {
          return a.occurredAt < b.occurredAt ? 1 : -1;
        }
        if (a.createdAt !== b.createdAt) {
          return a.createdAt < b.createdAt ? 1 : -1;
        }
        return 0;
      });
  },

  async getTransaction(userId, id) {
    return (
      store.transactions.find((t) => t.id === id && t.userId === userId) ?? null
    );
  },

  async createTransaction(userId, input) {
    const tx: Transaction = {
      id: randomUUID(),
      userId,
      createdAt: nowIso(),
      ...input,
    };
    store.transactions.unshift(tx);
    return tx;
  },

  async updateTransaction(userId, id, input) {
    const idx = store.transactions.findIndex(
      (t) => t.id === id && t.userId === userId
    );
    if (idx === -1) return null;
    const existing = store.transactions[idx];
    const next: Transaction = {
      ...existing,
      ...input,
      id: existing.id,
      userId: existing.userId,
      createdAt: existing.createdAt,
    };
    store.transactions[idx] = next;
    return next;
  },

  async deleteTransaction(userId, id) {
    const idx = store.transactions.findIndex(
      (t) => t.id === id && t.userId === userId
    );
    if (idx === -1) return false;
    store.transactions.splice(idx, 1);
    return true;
  },

  async listGoals(userId) {
    return store.goals.filter((g) => g.userId === userId);
  },

  async createGoal(userId, input) {
    const goal: Goal = {
      id: randomUUID(),
      userId,
      createdAt: nowIso(),
      saved: 0,
      ...input,
    };
    store.goals.unshift(goal);
    return goal;
  },

  async addContribution(userId, input) {
    const contribution: GoalContribution = {
      id: randomUUID(),
      userId,
      ...input,
    };
    store.contributions.push(contribution);
    const goal = store.goals.find(
      (g) => g.id === input.goalId && g.userId === userId
    );
    if (goal) {
      goal.saved += input.amount;
    }
    return contribution;
  },
};
