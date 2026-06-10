import { randomUUID } from "node:crypto";
import type {
  Category,
  Goal,
  GoalContribution,
  PordeeRepo,
  RecurringOccurrence,
  RecurringTemplate,
  Transaction,
} from "./types";
import { getDefaultCategoryIconId } from "./category-icons";
import {
  getInitialNextRunOn,
  getNextRunOnAfter,
  getResumeNextRunOn,
  normalizeRecurringStatus,
} from "~/lib/date/recurrence";
import { dayValueToIso, todayDayValue } from "~/lib/date/day-value";

interface Store {
  seededUsers: Set<string>;
  categories: Category[];
  transactions: Transaction[];
  recurringTemplates: RecurringTemplate[];
  recurringOccurrences: RecurringOccurrence[];
  goals: Goal[];
  contributions: GoalContribution[];
}

declare global {
  var __pordeeStore: Store | undefined;
}

const DEFAULT_CATEGORIES: Array<Pick<Category, "icon" | "name" | "kind">> = [
  { name: "อาหาร", kind: "expense", icon: "utensils" },
  { name: "เดินทาง", kind: "expense", icon: "bus" },
  { name: "บิล", kind: "expense", icon: "receipt" },
  { name: "เงินเดือน", kind: "income", icon: "banknote" },
  { name: "งานเสริม", kind: "income", icon: "briefcase" },
];

const emptyStore = (): Store => {
  return {
    seededUsers: new Set<string>(),
    categories: [],
    transactions: [],
    recurringTemplates: [],
    recurringOccurrences: [],
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

const normalizeCategory = (category: Category): Category => {
  return {
    ...category,
    icon:
      category.icon ??
      getDefaultCategoryIconId({ kind: category.kind, name: category.name }),
  };
};

export const mockRepo: PordeeRepo = {
  async listCategories(userId) {
    ensureSeeded(userId);
    return store.categories
      .filter((c) => c.userId === userId)
      .map(normalizeCategory);
  },

  async createCategory(userId, input) {
    ensureSeeded(userId);
    const category: Category = {
      id: randomUUID(),
      userId,
      ...input,
      icon:
        input.icon ??
        getDefaultCategoryIconId({ kind: input.kind, name: input.name }),
    };
    store.categories.push(category);
    return category;
  },

  async updateCategory(userId, id, input) {
    const idx = store.categories.findIndex(
      (c) => c.id === id && c.userId === userId
    );
    if (idx === -1) return null;
    const next: Category = {
      ...store.categories[idx],
      icon: input.icon ?? store.categories[idx].icon,
      name: input.name,
    };
    store.categories[idx] = next;
    return next;
  },

  async deleteCategory(userId, id) {
    if (
      store.transactions.some((t) => t.categoryId === id && t.userId === userId)
    ) {
      return false;
    }
    if (
      store.recurringTemplates.some(
        (template) => template.categoryId === id && template.userId === userId
      )
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
      .filter((t) => (opts.source ? t.source === opts.source : true))
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
      source: input.source ?? "manual",
      recurringTemplateId: input.recurringTemplateId ?? null,
      recurringOccurrenceId: input.recurringOccurrenceId ?? null,
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

  async listRecurringTemplates(userId) {
    return store.recurringTemplates
      .filter((template) => template.userId === userId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  async createRecurringTemplate(userId, input) {
    const now = nowIso();
    const nextRunOn = getInitialNextRunOn(input);
    const template: RecurringTemplate = {
      id: randomUUID(),
      userId,
      createdAt: now,
      updatedAt: now,
      status: normalizeRecurringStatus(nextRunOn),
      nextRunOn,
      ...input,
    };
    store.recurringTemplates.unshift(template);
    return template;
  },

  async updateRecurringTemplate(userId, id, input) {
    const idx = store.recurringTemplates.findIndex(
      (template) => template.id === id && template.userId === userId
    );
    if (idx === -1) return null;
    const existing = store.recurringTemplates[idx];
    const nextRunOn =
      existing.status === "paused"
        ? existing.nextRunOn
        : getInitialNextRunOn(input);
    const next: RecurringTemplate = {
      ...existing,
      ...input,
      nextRunOn,
      status:
        existing.status === "paused"
          ? "paused"
          : normalizeRecurringStatus(nextRunOn),
      updatedAt: nowIso(),
    };
    store.recurringTemplates[idx] = next;
    return next;
  },

  async pauseRecurringTemplate(userId, id) {
    const template = store.recurringTemplates.find(
      (item) => item.id === id && item.userId === userId
    );
    if (!template) return false;
    template.status = "paused";
    template.updatedAt = nowIso();
    return true;
  },

  async resumeRecurringTemplate(userId, id) {
    const template = store.recurringTemplates.find(
      (item) => item.id === id && item.userId === userId
    );
    if (!template) return false;
    const nextRunOn = getResumeNextRunOn(template);
    template.nextRunOn = nextRunOn;
    template.status = normalizeRecurringStatus(nextRunOn);
    template.updatedAt = nowIso();
    return true;
  },

  async deleteRecurringTemplate(userId, id) {
    const idx = store.recurringTemplates.findIndex(
      (template) => template.id === id && template.userId === userId
    );
    if (idx === -1) return false;
    store.recurringTemplates.splice(idx, 1);
    store.recurringOccurrences = store.recurringOccurrences.filter(
      (occurrence) =>
        occurrence.userId !== userId ||
        occurrence.templateId !== id ||
        occurrence.status !== "pending"
    );
    return true;
  },

  async listPendingRecurringOccurrences(userId) {
    return store.recurringOccurrences
      .filter(
        (occurrence) =>
          occurrence.userId === userId && occurrence.status === "pending"
      )
      .sort((a, b) => (a.scheduledOn < b.scheduledOn ? 1 : -1));
  },

  async confirmRecurringOccurrence(userId, id, input) {
    const occurrence = store.recurringOccurrences.find(
      (item) =>
        item.id === id && item.userId === userId && item.status === "pending"
    );
    if (!occurrence) return null;
    const template = store.recurringTemplates.find(
      (item) => item.id === occurrence.templateId && item.userId === userId
    );
    if (!template) return null;
    const transaction = await this.createTransaction(userId, {
      ...input,
      source: "recurring",
      recurringTemplateId: template.id,
      recurringOccurrenceId: occurrence.id,
    });
    occurrence.status = "posted";
    occurrence.transactionId = transaction.id;
    return transaction;
  },

  async processDueRecurring(userId, untilDay = todayDayValue()) {
    const dueTemplates = store.recurringTemplates.filter(
      (template) =>
        template.userId === userId &&
        template.status === "active" &&
        template.nextRunOn !== null &&
        template.nextRunOn <= untilDay
    );

    for (const template of dueTemplates) {
      let scheduledOn = template.nextRunOn;
      let loopGuard = 0;
      while (
        scheduledOn &&
        scheduledOn <= untilDay &&
        (!template.endDate || scheduledOn <= template.endDate) &&
        loopGuard < 370
      ) {
        const exists = store.recurringOccurrences.some(
          (occurrence) =>
            occurrence.templateId === template.id &&
            occurrence.scheduledOn === scheduledOn
        );
        if (!exists) {
          const occurrence: RecurringOccurrence = {
            id: randomUUID(),
            userId,
            templateId: template.id,
            scheduledOn,
            status: template.postMode === "auto" ? "posted" : "pending",
            transactionId: null,
            createdAt: nowIso(),
          };
          if (template.postMode === "auto") {
            const transaction = await this.createTransaction(userId, {
              kind: template.kind,
              title: template.title,
              amount: template.amount,
              categoryId: template.categoryId,
              note: template.note,
              occurredAt: dayValueToIso(scheduledOn) ?? nowIso(),
              source: "recurring",
              recurringTemplateId: template.id,
              recurringOccurrenceId: occurrence.id,
            });
            occurrence.transactionId = transaction.id;
          }
          store.recurringOccurrences.push(occurrence);
        }
        scheduledOn = getNextRunOnAfter(template, scheduledOn);
        loopGuard += 1;
      }

      template.nextRunOn = scheduledOn;
      template.status = normalizeRecurringStatus(scheduledOn);
      template.updatedAt = nowIso();
    }
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
