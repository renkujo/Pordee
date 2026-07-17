import { randomUUID } from "node:crypto";
import type {
  Category,
  DailyReminderPreference,
  Goal,
  GoalContribution,
  PordeeRepo,
  PushSubscriptionRecord,
  RecurringOccurrence,
  RecurringTemplate,
  Transaction,
  WalletAllocation,
  WalletPocket,
  WalletTransfer,
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
  walletPockets: WalletPocket[];
  walletAllocations: WalletAllocation[];
  walletTransfers: WalletTransfer[];
  goals: Goal[];
  contributions: GoalContribution[];
  dailyReminderPreferences: DailyReminderPreference[];
  pushSubscriptions: PushSubscriptionRecord[];
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
    walletPockets: [],
    walletAllocations: [],
    walletTransfers: [],
    goals: [],
    contributions: [],
    dailyReminderPreferences: [],
    pushSubscriptions: [],
  };
};

const store: Store = (globalThis.__pordeeStore ??= emptyStore());
store.dailyReminderPreferences ??= [];
store.pushSubscriptions ??= [];

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

const ensureWalletSeeded = (userId: string) => {
  ensureSeeded(userId);
  if (store.walletPockets.some((pocket) => pocket.userId === userId)) return;
  const now = nowIso();
  const defaults: Array<
    Pick<
      WalletPocket,
      | "name"
      | "description"
      | "type"
      | "monthlyLimit"
      | "mascot"
      | "surface"
      | "rolloverRule"
    > & { categoryNames: string[] }
  > = [
    {
      name: "ใช้จ่ายประจำวัน",
      description: "เงินสำหรับอาหาร กาแฟ และรายจ่ายเล็ก ๆ ระหว่างวัน",
      type: "daily",
      monthlyLimit: 0,
      mascot: "happy",
      surface: "teal",
      rolloverRule: "reset",
      categoryNames: ["อาหาร"],
    },
    {
      name: "เดินทาง",
      description: "ค่าเดินทางที่อยากกันไว้ก่อนออกจากบ้าน",
      type: "travel",
      monthlyLimit: 0,
      mascot: "normal",
      surface: "lime",
      rolloverRule: "reset",
      categoryNames: ["เดินทาง"],
    },
    {
      name: "เตรียมจ่ายบิล",
      description: "เงินที่กันไว้ก่อนถึงวันจ่ายบิลจริง",
      type: "bills",
      monthlyLimit: 0,
      mascot: "thinking",
      surface: "coral",
      rolloverRule: "keep",
      categoryNames: ["บิล"],
    },
    {
      name: "เงินสำรอง",
      description: "เงินกันไว้ เผื่อเดือนนี้มีเรื่องไม่คาดคิด",
      type: "reserve",
      monthlyLimit: 0,
      mascot: "saving",
      surface: "neutral",
      rolloverRule: "keep",
      categoryNames: [],
    },
  ];

  for (const [index, def] of defaults.entries()) {
    const categoryIds = store.categories
      .filter(
        (category) =>
          category.userId === userId &&
          def.categoryNames.some((name) => category.name.includes(name))
      )
      .map((category) => category.id);
    store.walletPockets.push({
      id: randomUUID(),
      userId,
      name: def.name,
      description: def.description,
      type: def.type,
      monthlyLimit: def.monthlyLimit,
      mascot: def.mascot,
      surface: def.surface,
      rolloverRule: def.rolloverRule,
      sortOrder: index,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      categoryIds,
    });
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

  async listWalletPockets(userId) {
    ensureWalletSeeded(userId);
    return store.walletPockets
      .filter((pocket) => pocket.userId === userId && !pocket.isArchived)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async createWalletPocket(userId, input) {
    ensureWalletSeeded(userId);
    const now = nowIso();
    const pocket: WalletPocket = {
      id: randomUUID(),
      userId,
      name: input.name,
      description: input.description,
      type: input.type,
      monthlyLimit: input.monthlyLimit,
      mascot: input.mascot,
      surface: input.surface,
      rolloverRule: input.rolloverRule,
      sortOrder: store.walletPockets.filter(
        (pocket) => pocket.userId === userId
      ).length,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      categoryIds: input.categoryIds ?? [],
    };
    store.walletPockets.push(pocket);
    return pocket;
  },

  async updateWalletPocket(userId, id, input) {
    const pocket = store.walletPockets.find(
      (item) => item.id === id && item.userId === userId
    );
    if (!pocket) return null;
    pocket.name = input.name;
    pocket.description = input.description;
    pocket.type = input.type;
    pocket.monthlyLimit = input.monthlyLimit;
    pocket.mascot = input.mascot;
    pocket.surface = input.surface;
    pocket.rolloverRule = input.rolloverRule;
    pocket.categoryIds = input.categoryIds ?? [];
    pocket.updatedAt = nowIso();
    return pocket;
  },

  async archiveWalletPocket(userId, id) {
    const pocket = store.walletPockets.find(
      (item) => item.id === id && item.userId === userId
    );
    if (!pocket) return false;
    pocket.isArchived = true;
    pocket.updatedAt = nowIso();
    return true;
  },

  async reorderWalletPockets(userId, pocketIds) {
    const orderById = new Map(pocketIds.map((id, index) => [id, index]));
    for (const pocket of store.walletPockets) {
      const nextOrder = orderById.get(pocket.id);
      if (pocket.userId === userId && nextOrder !== undefined) {
        pocket.sortOrder = nextOrder;
        pocket.updatedAt = nowIso();
      }
    }
  },

  async listWalletAllocations(userId, monthKey) {
    ensureWalletSeeded(userId);
    return store.walletAllocations.filter(
      (allocation) =>
        allocation.userId === userId && allocation.monthKey === monthKey
    );
  },

  async setWalletAllocations(userId, monthKey, allocations) {
    store.walletAllocations = store.walletAllocations.filter(
      (allocation) =>
        allocation.userId !== userId || allocation.monthKey !== monthKey
    );
    const now = nowIso();
    const rows = allocations.map(
      (allocation): WalletAllocation => ({
        id: randomUUID(),
        userId,
        pocketId: allocation.pocketId,
        monthKey,
        amount: allocation.amount,
        createdAt: now,
        updatedAt: now,
      })
    );
    store.walletAllocations.push(...rows);
    return rows;
  },

  async listWalletTransfers(userId, opts = {}) {
    return store.walletTransfers
      .filter((transfer) => transfer.userId === userId)
      .filter((transfer) => inRange(transfer.occurredAt, opts.from, opts.to))
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  },

  async createWalletTransfer(userId, input) {
    const transfer: WalletTransfer = {
      id: randomUUID(),
      userId,
      createdAt: nowIso(),
      ...input,
    };
    store.walletTransfers.unshift(transfer);
    return transfer;
  },

  async getDailyReminderPreference(userId) {
    const existing = store.dailyReminderPreferences.find(
      (preference) => preference.userId === userId
    );
    if (existing) return existing;

    const now = nowIso();
    const preference: DailyReminderPreference = {
      userId,
      enabled: false,
      localTime: "20:00",
      timeZone: "Asia/Bangkok",
      createdAt: now,
      updatedAt: now,
    };
    store.dailyReminderPreferences.push(preference);
    return preference;
  },

  async updateDailyReminderPreference(userId, input) {
    const existing = await this.getDailyReminderPreference(userId);
    existing.enabled = input.enabled;
    existing.localTime = input.localTime;
    existing.timeZone = input.timeZone;
    existing.updatedAt = nowIso();
    return existing;
  },

  async enableDailyReminder(userId, schedule, subscription) {
    const preferenceIndex = store.dailyReminderPreferences.findIndex(
      (item) => item.userId === userId
    );
    const preferenceSnapshot =
      preferenceIndex >= 0
        ? { ...store.dailyReminderPreferences[preferenceIndex] }
        : null;
    const subscriptionIndex = store.pushSubscriptions.findIndex(
      (item) => item.endpoint === subscription.endpoint
    );
    const subscriptionSnapshot =
      subscriptionIndex >= 0
        ? { ...store.pushSubscriptions[subscriptionIndex] }
        : null;

    try {
      const preference = await this.updateDailyReminderPreference(userId, {
        enabled: true,
        ...schedule,
      });
      await this.upsertPushSubscription(userId, subscription);
      const activeDeviceCount = await this.countActivePushSubscriptions(userId);
      if (activeDeviceCount > 5) {
        throw new Error("push subscription limit reached");
      }
      return { preference, activeDeviceCount };
    } catch (error) {
      const nextPreferenceIndex = store.dailyReminderPreferences.findIndex(
        (item) => item.userId === userId
      );
      if (preferenceSnapshot && nextPreferenceIndex >= 0) {
        store.dailyReminderPreferences[nextPreferenceIndex] =
          preferenceSnapshot;
      } else if (nextPreferenceIndex >= 0) {
        store.dailyReminderPreferences.splice(nextPreferenceIndex, 1);
      }

      const nextSubscriptionIndex = store.pushSubscriptions.findIndex(
        (item) => item.endpoint === subscription.endpoint
      );
      if (subscriptionSnapshot && nextSubscriptionIndex >= 0) {
        store.pushSubscriptions[nextSubscriptionIndex] = subscriptionSnapshot;
      } else if (nextSubscriptionIndex >= 0) {
        store.pushSubscriptions.splice(nextSubscriptionIndex, 1);
      }
      throw error;
    }
  },

  async disableDailyReminder(userId, schedule) {
    const preference = await this.updateDailyReminderPreference(userId, {
      enabled: false,
      ...schedule,
    });
    const now = nowIso();
    for (const subscription of store.pushSubscriptions) {
      if (subscription.userId === userId && subscription.revokedAt === null) {
        subscription.revokedAt = now;
        subscription.updatedAt = now;
      }
    }
    return { preference, activeDeviceCount: 0 };
  },

  async upsertPushSubscription(userId, input) {
    const now = nowIso();
    const existing = store.pushSubscriptions.find(
      (subscription) => subscription.endpoint === input.endpoint
    );
    if (existing) {
      existing.userId = userId;
      existing.p256dh = input.p256dh;
      existing.auth = input.auth;
      existing.expirationTime = input.expirationTime;
      existing.userAgent = input.userAgent;
      existing.revokedAt = null;
      existing.updatedAt = now;
      return existing;
    }

    const subscription: PushSubscriptionRecord = {
      id: randomUUID(),
      userId,
      ...input,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    store.pushSubscriptions.push(subscription);
    return subscription;
  },

  async revokePushSubscription(userId, endpoint) {
    const subscription = store.pushSubscriptions.find(
      (item) =>
        item.userId === userId &&
        item.endpoint === endpoint &&
        item.revokedAt === null
    );
    if (!subscription) return false;
    subscription.revokedAt = nowIso();
    subscription.updatedAt = subscription.revokedAt;
    return true;
  },

  async listActivePushSubscriptions(userId) {
    return store.pushSubscriptions
      .filter(
        (subscription) =>
          subscription.userId === userId && subscription.revokedAt === null
      )
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  },

  async countActivePushSubscriptions(userId) {
    return store.pushSubscriptions.filter(
      (subscription) =>
        subscription.userId === userId && subscription.revokedAt === null
    ).length;
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
