import { randomUUID } from "node:crypto";
import type {
  Category,
  Goal,
  GoalContribution,
  PordeeRepo,
  Transaction,
} from "./types";

interface Store {
  categories: Category[];
  transactions: Transaction[];
  goals: Goal[];
  contributions: GoalContribution[];
}

declare global {
  var __pordeeStore: Store | undefined;
}

function seed(): Store {
  return {
    categories: [
      { id: "cat-food", name: "อาหาร", kind: "expense" },
      { id: "cat-transport", name: "เดินทาง", kind: "expense" },
      { id: "cat-bills", name: "บิล", kind: "expense" },
      { id: "cat-salary", name: "เงินเดือน", kind: "income" },
      { id: "cat-side", name: "งานเสริม", kind: "income" },
    ],
    transactions: [],
    goals: [],
    contributions: [],
  };
}

const store: Store = (globalThis.__pordeeStore ??= seed());

function nowIso() {
  return new Date().toISOString();
}

function inRange(occurredAt: string, from?: string, to?: string) {
  if (from && occurredAt < from) return false;
  if (to && occurredAt > to) return false;
  return true;
}

export const mockRepo: PordeeRepo = {
  async listCategories() {
    return [...store.categories];
  },

  async listTransactions(opts = {}) {
    return store.transactions
      .filter((t) => inRange(t.occurredAt, opts.from, opts.to))
      .filter((t) => (opts.kind ? t.kind === opts.kind : true))
      .filter((t) =>
        opts.categoryId ? t.categoryId === opts.categoryId : true
      )
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  },

  async getTransaction(id) {
    return store.transactions.find((t) => t.id === id) ?? null;
  },

  async createTransaction(input) {
    const tx: Transaction = {
      id: randomUUID(),
      createdAt: nowIso(),
      ...input,
    };
    store.transactions.unshift(tx);
    return tx;
  },

  async updateTransaction(id, input) {
    const idx = store.transactions.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const existing = store.transactions[idx];
    const next: Transaction = {
      ...existing,
      ...input,
      id: existing.id,
      createdAt: existing.createdAt,
    };
    store.transactions[idx] = next;
    return next;
  },

  async deleteTransaction(id) {
    const idx = store.transactions.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    store.transactions.splice(idx, 1);
    return true;
  },

  async listGoals() {
    return [...store.goals];
  },

  async createGoal(input) {
    const goal: Goal = {
      id: randomUUID(),
      createdAt: nowIso(),
      saved: 0,
      ...input,
    };
    store.goals.unshift(goal);
    return goal;
  },

  async addContribution(input) {
    const contribution: GoalContribution = {
      id: randomUUID(),
      ...input,
    };
    store.contributions.push(contribution);
    const goal = store.goals.find((g) => g.id === input.goalId);
    if (goal) {
      goal.saved += input.amount;
    }
    return contribution;
  },
};
