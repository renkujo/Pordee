import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "./client";
import { getDefaultCategoryIconId } from "./category-icons";
import { ensureFinanceDatabase } from "./migrate.server";
import {
  categories,
  dailyReminderPreferences,
  goalContributions,
  goals,
  pushSubscriptions,
  recurringOccurrences,
  recurringTemplates,
  transactions,
  walletAllocations,
  walletPocketCategories,
  walletPockets,
  walletTransfers,
} from "./schema";
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
import {
  getInitialNextRunOn,
  getNextRunOnAfter,
  getResumeNextRunOn,
  normalizeRecurringStatus,
} from "~/lib/date/recurrence";
import { dayValueToIso, todayDayValue } from "~/lib/date/day-value";

const DEFAULT_CATEGORIES: Array<Pick<Category, "icon" | "name" | "kind">> = [
  { name: "อาหาร", kind: "expense", icon: "utensils" },
  { name: "เดินทาง", kind: "expense", icon: "bus" },
  { name: "บิล", kind: "expense", icon: "receipt" },
  { name: "เงินเดือน", kind: "income", icon: "banknote" },
  { name: "งานเสริม", kind: "income", icon: "briefcase" },
];

const DEFAULT_WALLET_POCKETS: Array<
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

const toMoney = (value: string): number => {
  return Number(value);
};

const rowToTransaction = (
  row: typeof transactions.$inferSelect
): Transaction => {
  return {
    id: row.id,
    userId: row.userId,
    kind: row.kind as Transaction["kind"],
    title: row.title,
    amount: toMoney(row.amount),
    categoryId: row.categoryId,
    note: row.note,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    source: (row.source as Transaction["source"] | null) ?? "manual",
    recurringTemplateId: row.recurringTemplateId,
    recurringOccurrenceId: row.recurringOccurrenceId,
  };
};

const rowToRecurringTemplate = (
  row: typeof recurringTemplates.$inferSelect
): RecurringTemplate => {
  return {
    id: row.id,
    userId: row.userId,
    kind: row.kind as RecurringTemplate["kind"],
    title: row.title,
    amount: toMoney(row.amount),
    categoryId: row.categoryId,
    note: row.note,
    frequency: row.frequency as RecurringTemplate["frequency"],
    weeklyDay: row.weeklyDay,
    monthlyDay: row.monthlyDay,
    yearlyMonth: row.yearlyMonth,
    yearlyDay: row.yearlyDay,
    startDate: row.startDate,
    endDate: row.endDate,
    nextRunOn: row.nextRunOn,
    postMode: row.postMode as RecurringTemplate["postMode"],
    status: row.status as RecurringTemplate["status"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};

const rowToRecurringOccurrence = (
  row: typeof recurringOccurrences.$inferSelect
): RecurringOccurrence => {
  return {
    id: row.id,
    userId: row.userId,
    templateId: row.templateId,
    scheduledOn: row.scheduledOn,
    status: row.status as RecurringOccurrence["status"],
    transactionId: row.transactionId,
    createdAt: row.createdAt.toISOString(),
  };
};

const rowToCategory = (row: typeof categories.$inferSelect): Category => {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    kind: row.kind as Category["kind"],
    icon:
      (row.icon as Category["icon"] | null) ??
      getDefaultCategoryIconId({
        kind: row.kind as Category["kind"],
        name: row.name,
      }),
  };
};

const rowToWalletPocket = (
  row: typeof walletPockets.$inferSelect,
  categoryIds: string[] = []
): WalletPocket => {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    description: row.description,
    type: row.type as WalletPocket["type"],
    monthlyLimit: toMoney(row.monthlyLimit),
    mascot: row.mascot as WalletPocket["mascot"],
    surface: row.surface as WalletPocket["surface"],
    rolloverRule: row.rolloverRule as WalletPocket["rolloverRule"],
    sortOrder: row.sortOrder,
    isArchived: row.isArchived === 1,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    categoryIds,
  };
};

const rowToWalletAllocation = (
  row: typeof walletAllocations.$inferSelect
): WalletAllocation => {
  return {
    id: row.id,
    userId: row.userId,
    pocketId: row.pocketId,
    monthKey: row.monthKey,
    amount: toMoney(row.amount),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};

const rowToWalletTransfer = (
  row: typeof walletTransfers.$inferSelect
): WalletTransfer => {
  return {
    id: row.id,
    userId: row.userId,
    fromPocketId: row.fromPocketId,
    toPocketId: row.toPocketId,
    amount: toMoney(row.amount),
    note: row.note,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
};

const rowToDailyReminderPreference = (
  row: typeof dailyReminderPreferences.$inferSelect
): DailyReminderPreference => {
  return {
    userId: row.userId,
    enabled: row.enabled,
    localTime: row.localTime,
    timeZone: row.timeZone,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};

const rowToPushSubscription = (
  row: typeof pushSubscriptions.$inferSelect
): PushSubscriptionRecord => {
  return {
    id: row.id,
    userId: row.userId,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    expirationTime: row.expirationTime?.toISOString() ?? null,
    userAgent: row.userAgent,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};

// Seed default categories the first time a user has none.
const ensureSeeded = async (userId: string): Promise<void> => {
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.userId, userId))
    .limit(1);
  if (existing.length > 0) return;
  await db.insert(categories).values(
    DEFAULT_CATEGORIES.map((c) => ({
      id: randomUUID(),
      userId,
      name: c.name,
      kind: c.kind,
      icon: c.icon,
    }))
  );
};

const ensureWalletPocketsSeeded = async (userId: string): Promise<void> => {
  const existing = await db
    .select({ id: walletPockets.id })
    .from(walletPockets)
    .where(eq(walletPockets.userId, userId))
    .limit(1);
  if (existing.length > 0) return;

  await ensureSeeded(userId);
  const userCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId));
  const now = new Date();

  await db.transaction(async (tx) => {
    for (const [index, preset] of DEFAULT_WALLET_POCKETS.entries()) {
      const pocketId = randomUUID();
      await tx.insert(walletPockets).values({
        id: pocketId,
        userId,
        name: preset.name,
        description: preset.description,
        type: preset.type,
        monthlyLimit: String(preset.monthlyLimit),
        mascot: preset.mascot,
        surface: preset.surface,
        rolloverRule: preset.rolloverRule,
        sortOrder: index,
        isArchived: 0,
        createdAt: now,
        updatedAt: now,
      });

      const categoryRows = userCategories
        .filter((category) =>
          preset.categoryNames.some((name) => category.name.includes(name))
        )
        .map((category) => ({
          pocketId,
          categoryId: category.id,
          userId,
        }));
      if (categoryRows.length > 0) {
        await tx.insert(walletPocketCategories).values(categoryRows);
      }
    }
  });
};

const ensureOwnedCategory = async (
  userId: string,
  categoryId: string | null
): Promise<void> => {
  if (!categoryId) return;
  const owned = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .limit(1);
  if (owned.length === 0) {
    throw new Error("category not found for user");
  }
};

const ensureOwnedCategories = async (
  userId: string,
  categoryIds: string[]
): Promise<void> => {
  for (const categoryId of categoryIds) {
    await ensureOwnedCategory(userId, categoryId);
  }
};

const ensureOwnedWalletPocket = async (
  userId: string,
  pocketId: string | null
): Promise<void> => {
  if (!pocketId) return;
  const owned = await db
    .select({ id: walletPockets.id })
    .from(walletPockets)
    .where(
      and(
        eq(walletPockets.id, pocketId),
        eq(walletPockets.userId, userId),
        eq(walletPockets.isArchived, 0)
      )
    )
    .limit(1);
  if (owned.length === 0) {
    throw new Error("wallet pocket not found for user");
  }
};

const replaceWalletPocketCategories = async (
  userId: string,
  pocketId: string,
  categoryIds: string[]
): Promise<void> => {
  await ensureOwnedCategories(userId, categoryIds);
  await db
    .delete(walletPocketCategories)
    .where(
      and(
        eq(walletPocketCategories.userId, userId),
        eq(walletPocketCategories.pocketId, pocketId)
      )
    );
  if (categoryIds.length === 0) return;
  await db.insert(walletPocketCategories).values(
    categoryIds.map((categoryId) => ({
      userId,
      pocketId,
      categoryId,
    }))
  );
};

export const drizzleRepo: PordeeRepo = {
  async listCategories(userId) {
    await ensureFinanceDatabase();
    await ensureSeeded(userId);
    const rows = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId));
    return rows.map(rowToCategory);
  },

  async createCategory(userId, input) {
    await ensureFinanceDatabase();
    const row = {
      id: randomUUID(),
      userId,
      name: input.name,
      kind: input.kind,
      icon:
        input.icon ??
        getDefaultCategoryIconId({ kind: input.kind, name: input.name }),
    };
    await db.insert(categories).values(row);
    return rowToCategory(row as typeof categories.$inferSelect);
  },

  async updateCategory(userId, id, input) {
    await ensureFinanceDatabase();
    const values = {
      ...(input.icon ? { icon: input.icon } : {}),
      name: input.name,
    };
    const updated = await db
      .update(categories)
      .set(values)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning();
    return updated.length ? rowToCategory(updated[0]) : null;
  },

  async deleteCategory(userId, id) {
    await ensureFinanceDatabase();
    const used = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(eq(transactions.categoryId, id), eq(transactions.userId, userId))
      )
      .limit(1);
    if (used.length > 0) return false;
    const usedByRecurring = await db
      .select({ id: recurringTemplates.id })
      .from(recurringTemplates)
      .where(
        and(
          eq(recurringTemplates.categoryId, id),
          eq(recurringTemplates.userId, userId)
        )
      )
      .limit(1);
    if (usedByRecurring.length > 0) return false;
    const deleted = await db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning({ id: categories.id });
    return deleted.length > 0;
  },

  async countTransactionsByCategory(userId, categoryId) {
    await ensureFinanceDatabase();
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(
        and(
          eq(transactions.categoryId, categoryId),
          eq(transactions.userId, userId)
        )
      );
    return result[0]?.count ?? 0;
  },

  async listTransactions(userId, opts = {}) {
    await ensureFinanceDatabase();
    const conditions = [eq(transactions.userId, userId)];
    if (opts.from) {
      conditions.push(sql`${transactions.occurredAt} >= ${opts.from}`);
    }
    if (opts.to) {
      conditions.push(sql`${transactions.occurredAt} <= ${opts.to}`);
    }
    if (opts.kind) {
      conditions.push(eq(transactions.kind, opts.kind));
    }
    if (opts.categoryId) {
      conditions.push(eq(transactions.categoryId, opts.categoryId));
    }
    if (opts.source) {
      conditions.push(eq(transactions.source, opts.source));
    }
    const rows = await db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt));
    return rows.map(rowToTransaction);
  },

  async getTransaction(userId, id) {
    await ensureFinanceDatabase();
    const rows = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .limit(1);
    return rows.length ? rowToTransaction(rows[0]) : null;
  },

  async createTransaction(userId, input) {
    await ensureFinanceDatabase();
    await ensureOwnedCategory(userId, input.categoryId);
    const row = {
      id: randomUUID(),
      userId,
      kind: input.kind,
      title: input.title,
      amount: String(input.amount),
      categoryId: input.categoryId,
      note: input.note,
      occurredAt: new Date(input.occurredAt),
      createdAt: new Date(),
      source: input.source ?? "manual",
      recurringTemplateId: input.recurringTemplateId ?? null,
      recurringOccurrenceId: input.recurringOccurrenceId ?? null,
    };
    const inserted = await db.insert(transactions).values(row).returning();
    return rowToTransaction(inserted[0]);
  },

  async updateTransaction(userId, id, input) {
    await ensureFinanceDatabase();
    await ensureOwnedCategory(userId, input.categoryId);
    const updated = await db
      .update(transactions)
      .set({
        kind: input.kind,
        title: input.title,
        amount: String(input.amount),
        categoryId: input.categoryId,
        note: input.note,
        occurredAt: new Date(input.occurredAt),
      })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();
    return updated.length ? rowToTransaction(updated[0]) : null;
  },

  async deleteTransaction(userId, id) {
    await ensureFinanceDatabase();
    const deleted = await db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning({ id: transactions.id });
    return deleted.length > 0;
  },

  async listRecurringTemplates(userId) {
    await ensureFinanceDatabase();
    const rows = await db
      .select()
      .from(recurringTemplates)
      .where(eq(recurringTemplates.userId, userId))
      .orderBy(desc(recurringTemplates.createdAt));
    return rows.map(rowToRecurringTemplate);
  },

  async createRecurringTemplate(userId, input) {
    await ensureFinanceDatabase();
    await ensureOwnedCategory(userId, input.categoryId);
    const nextRunOn = getInitialNextRunOn(input);
    const now = new Date();
    const row = {
      id: randomUUID(),
      userId,
      kind: input.kind,
      title: input.title,
      amount: String(input.amount),
      categoryId: input.categoryId,
      note: input.note,
      frequency: input.frequency,
      weeklyDay: input.weeklyDay,
      monthlyDay: input.monthlyDay,
      yearlyMonth: input.yearlyMonth,
      yearlyDay: input.yearlyDay,
      startDate: input.startDate,
      endDate: input.endDate,
      nextRunOn,
      postMode: input.postMode,
      status: normalizeRecurringStatus(nextRunOn),
      createdAt: now,
      updatedAt: now,
    };
    const inserted = await db
      .insert(recurringTemplates)
      .values(row)
      .returning();
    return rowToRecurringTemplate(inserted[0]);
  },

  async updateRecurringTemplate(userId, id, input) {
    await ensureFinanceDatabase();
    await ensureOwnedCategory(userId, input.categoryId);
    const existing = await db
      .select()
      .from(recurringTemplates)
      .where(
        and(
          eq(recurringTemplates.id, id),
          eq(recurringTemplates.userId, userId)
        )
      )
      .limit(1);
    if (existing.length === 0) return null;
    const current = rowToRecurringTemplate(existing[0]);
    const nextRunOn =
      current.status === "paused"
        ? current.nextRunOn
        : getInitialNextRunOn(input);
    const status =
      current.status === "paused"
        ? "paused"
        : normalizeRecurringStatus(nextRunOn);
    const updated = await db
      .update(recurringTemplates)
      .set({
        kind: input.kind,
        title: input.title,
        amount: String(input.amount),
        categoryId: input.categoryId,
        note: input.note,
        frequency: input.frequency,
        weeklyDay: input.weeklyDay,
        monthlyDay: input.monthlyDay,
        yearlyMonth: input.yearlyMonth,
        yearlyDay: input.yearlyDay,
        startDate: input.startDate,
        endDate: input.endDate,
        nextRunOn,
        postMode: input.postMode,
        status,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(recurringTemplates.id, id),
          eq(recurringTemplates.userId, userId)
        )
      )
      .returning();
    return updated.length ? rowToRecurringTemplate(updated[0]) : null;
  },

  async pauseRecurringTemplate(userId, id) {
    await ensureFinanceDatabase();
    const updated = await db
      .update(recurringTemplates)
      .set({ status: "paused", updatedAt: new Date() })
      .where(
        and(
          eq(recurringTemplates.id, id),
          eq(recurringTemplates.userId, userId)
        )
      )
      .returning({ id: recurringTemplates.id });
    return updated.length > 0;
  },

  async resumeRecurringTemplate(userId, id) {
    await ensureFinanceDatabase();
    const existing = await db
      .select()
      .from(recurringTemplates)
      .where(
        and(
          eq(recurringTemplates.id, id),
          eq(recurringTemplates.userId, userId)
        )
      )
      .limit(1);
    if (existing.length === 0) return false;
    const template = rowToRecurringTemplate(existing[0]);
    const nextRunOn = getResumeNextRunOn(template);
    const status = normalizeRecurringStatus(nextRunOn);
    const updated = await db
      .update(recurringTemplates)
      .set({ nextRunOn, status, updatedAt: new Date() })
      .where(
        and(
          eq(recurringTemplates.id, id),
          eq(recurringTemplates.userId, userId)
        )
      )
      .returning({ id: recurringTemplates.id });
    return updated.length > 0;
  },

  async deleteRecurringTemplate(userId, id) {
    await ensureFinanceDatabase();
    return db.transaction(async (tx) => {
      await tx
        .delete(recurringOccurrences)
        .where(
          and(
            eq(recurringOccurrences.templateId, id),
            eq(recurringOccurrences.userId, userId),
            eq(recurringOccurrences.status, "pending")
          )
        );
      const deleted = await tx
        .delete(recurringTemplates)
        .where(
          and(
            eq(recurringTemplates.id, id),
            eq(recurringTemplates.userId, userId)
          )
        )
        .returning({ id: recurringTemplates.id });
      return deleted.length > 0;
    });
  },

  async listPendingRecurringOccurrences(userId) {
    await ensureFinanceDatabase();
    const rows = await db
      .select()
      .from(recurringOccurrences)
      .where(
        and(
          eq(recurringOccurrences.userId, userId),
          eq(recurringOccurrences.status, "pending")
        )
      )
      .orderBy(desc(recurringOccurrences.scheduledOn));
    return rows.map(rowToRecurringOccurrence);
  },

  async confirmRecurringOccurrence(userId, id, input) {
    await ensureFinanceDatabase();
    await ensureOwnedCategory(userId, input.categoryId);
    return db.transaction(async (tx) => {
      const occurrenceRows = await tx
        .select()
        .from(recurringOccurrences)
        .where(
          and(
            eq(recurringOccurrences.id, id),
            eq(recurringOccurrences.userId, userId),
            eq(recurringOccurrences.status, "pending")
          )
        )
        .limit(1);
      if (occurrenceRows.length === 0) return null;
      const occurrence = occurrenceRows[0];
      const templateRows = await tx
        .select()
        .from(recurringTemplates)
        .where(
          and(
            eq(recurringTemplates.id, occurrence.templateId),
            eq(recurringTemplates.userId, userId)
          )
        )
        .limit(1);
      if (templateRows.length === 0) return null;
      const txId = randomUUID();
      const inserted = await tx
        .insert(transactions)
        .values({
          id: txId,
          userId,
          kind: input.kind,
          title: input.title,
          amount: String(input.amount),
          categoryId: input.categoryId,
          note: input.note,
          occurredAt: new Date(input.occurredAt),
          createdAt: new Date(),
          source: "recurring",
          recurringTemplateId: occurrence.templateId,
          recurringOccurrenceId: occurrence.id,
        })
        .returning();
      await tx
        .update(recurringOccurrences)
        .set({ status: "posted", transactionId: txId })
        .where(eq(recurringOccurrences.id, occurrence.id));
      return rowToTransaction(inserted[0]);
    });
  },

  async processDueRecurring(userId, untilDay = todayDayValue()) {
    await ensureFinanceDatabase();
    const rows = await db
      .select()
      .from(recurringTemplates)
      .where(
        and(
          eq(recurringTemplates.userId, userId),
          eq(recurringTemplates.status, "active")
        )
      );
    const dueTemplates = rows
      .map(rowToRecurringTemplate)
      .filter(
        (template) => template.nextRunOn && template.nextRunOn <= untilDay
      );

    for (const template of dueTemplates) {
      await db.transaction(async (tx) => {
        let scheduledOn = template.nextRunOn;
        let loopGuard = 0;
        while (
          scheduledOn &&
          scheduledOn <= untilDay &&
          (!template.endDate || scheduledOn <= template.endDate) &&
          loopGuard < 370
        ) {
          const existing = await tx
            .select({ id: recurringOccurrences.id })
            .from(recurringOccurrences)
            .where(
              and(
                eq(recurringOccurrences.templateId, template.id),
                eq(recurringOccurrences.scheduledOn, scheduledOn)
              )
            )
            .limit(1);

          if (existing.length === 0) {
            const occurrenceId = randomUUID();
            let transactionId: string | null = null;
            if (template.postMode === "auto") {
              transactionId = randomUUID();
              await tx.insert(transactions).values({
                id: transactionId,
                userId,
                kind: template.kind,
                title: template.title,
                amount: String(template.amount),
                categoryId: template.categoryId,
                note: template.note,
                occurredAt: new Date(dayValueToIso(scheduledOn) ?? new Date()),
                createdAt: new Date(),
                source: "recurring",
                recurringTemplateId: template.id,
                recurringOccurrenceId: occurrenceId,
              });
            }
            await tx.insert(recurringOccurrences).values({
              id: occurrenceId,
              userId,
              templateId: template.id,
              scheduledOn,
              status: template.postMode === "auto" ? "posted" : "pending",
              transactionId,
              createdAt: new Date(),
            });
          }

          scheduledOn = getNextRunOnAfter(template, scheduledOn);
          loopGuard += 1;
        }

        await tx
          .update(recurringTemplates)
          .set({
            nextRunOn: scheduledOn,
            status: normalizeRecurringStatus(scheduledOn),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(recurringTemplates.id, template.id),
              eq(recurringTemplates.userId, userId)
            )
          );
      });
    }
  },

  async listWalletPockets(userId) {
    await ensureFinanceDatabase();
    await ensureWalletPocketsSeeded(userId);
    const [pocketRows, categoryRows] = await Promise.all([
      db
        .select()
        .from(walletPockets)
        .where(
          and(eq(walletPockets.userId, userId), eq(walletPockets.isArchived, 0))
        )
        .orderBy(asc(walletPockets.sortOrder), asc(walletPockets.createdAt)),
      db
        .select()
        .from(walletPocketCategories)
        .where(eq(walletPocketCategories.userId, userId)),
    ]);
    const categoryIdsByPocketId = new Map<string, string[]>();
    for (const row of categoryRows) {
      const list = categoryIdsByPocketId.get(row.pocketId) ?? [];
      list.push(row.categoryId);
      categoryIdsByPocketId.set(row.pocketId, list);
    }
    return pocketRows.map((row) =>
      rowToWalletPocket(row, categoryIdsByPocketId.get(row.id) ?? [])
    );
  },

  async createWalletPocket(userId, input) {
    await ensureFinanceDatabase();
    const categoryIds = input.categoryIds ?? [];
    await ensureOwnedCategories(userId, categoryIds);
    const now = new Date();
    const nextOrder = await db
      .select({
        value: sql<number>`coalesce(max(${walletPockets.sortOrder}), -1) + 1`,
      })
      .from(walletPockets)
      .where(eq(walletPockets.userId, userId));
    const row = {
      id: randomUUID(),
      userId,
      name: input.name,
      description: input.description,
      type: input.type,
      monthlyLimit: String(input.monthlyLimit),
      mascot: input.mascot,
      surface: input.surface,
      rolloverRule: input.rolloverRule,
      sortOrder: nextOrder[0]?.value ?? 0,
      isArchived: 0,
      createdAt: now,
      updatedAt: now,
    };
    await db.transaction(async (tx) => {
      await tx.insert(walletPockets).values(row);
      if (categoryIds.length > 0) {
        await tx.insert(walletPocketCategories).values(
          categoryIds.map((categoryId) => ({
            userId,
            pocketId: row.id,
            categoryId,
          }))
        );
      }
    });
    return rowToWalletPocket(
      row as typeof walletPockets.$inferSelect,
      categoryIds
    );
  },

  async updateWalletPocket(userId, id, input) {
    await ensureFinanceDatabase();
    await ensureOwnedWalletPocket(userId, id);
    const categoryIds = input.categoryIds ?? [];
    await ensureOwnedCategories(userId, categoryIds);
    const updated = await db
      .update(walletPockets)
      .set({
        name: input.name,
        description: input.description,
        type: input.type,
        monthlyLimit: String(input.monthlyLimit),
        mascot: input.mascot,
        surface: input.surface,
        rolloverRule: input.rolloverRule,
        updatedAt: new Date(),
      })
      .where(and(eq(walletPockets.id, id), eq(walletPockets.userId, userId)))
      .returning();
    if (updated.length === 0) return null;
    await replaceWalletPocketCategories(userId, id, categoryIds);
    return rowToWalletPocket(updated[0], categoryIds);
  },

  async archiveWalletPocket(userId, id) {
    await ensureFinanceDatabase();
    const updated = await db
      .update(walletPockets)
      .set({ isArchived: 1, updatedAt: new Date() })
      .where(and(eq(walletPockets.id, id), eq(walletPockets.userId, userId)))
      .returning({ id: walletPockets.id });
    return updated.length > 0;
  },

  async reorderWalletPockets(userId, pocketIds) {
    await ensureFinanceDatabase();
    const ownedRows = await db
      .select({ id: walletPockets.id })
      .from(walletPockets)
      .where(
        and(eq(walletPockets.userId, userId), eq(walletPockets.isArchived, 0))
      );
    const ownedIds = new Set(ownedRows.map((row) => row.id));
    const orderedIds = pocketIds.filter((id) => ownedIds.has(id));
    if (orderedIds.length === 0) return;

    await db.transaction(async (tx) => {
      for (const [index, pocketId] of orderedIds.entries()) {
        await tx
          .update(walletPockets)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(
            and(
              eq(walletPockets.id, pocketId),
              eq(walletPockets.userId, userId)
            )
          );
      }
    });
  },

  async listWalletAllocations(userId, monthKey) {
    await ensureFinanceDatabase();
    const rows = await db
      .select()
      .from(walletAllocations)
      .where(
        and(
          eq(walletAllocations.userId, userId),
          eq(walletAllocations.monthKey, monthKey)
        )
      );
    return rows.map(rowToWalletAllocation);
  },

  async setWalletAllocations(userId, monthKey, allocations) {
    await ensureFinanceDatabase();
    for (const allocation of allocations) {
      await ensureOwnedWalletPocket(userId, allocation.pocketId);
    }
    const now = new Date();
    return db.transaction(async (tx) => {
      await tx
        .delete(walletAllocations)
        .where(
          and(
            eq(walletAllocations.userId, userId),
            eq(walletAllocations.monthKey, monthKey)
          )
        );
      if (allocations.length === 0) return [];
      const inserted = await tx
        .insert(walletAllocations)
        .values(
          allocations.map((allocation) => ({
            id: randomUUID(),
            userId,
            pocketId: allocation.pocketId,
            monthKey,
            amount: String(allocation.amount),
            createdAt: now,
            updatedAt: now,
          }))
        )
        .returning();
      return inserted.map(rowToWalletAllocation);
    });
  },

  async listWalletTransfers(userId, opts = {}) {
    await ensureFinanceDatabase();
    const conditions = [eq(walletTransfers.userId, userId)];
    if (opts.from) {
      conditions.push(sql`${walletTransfers.occurredAt} >= ${opts.from}`);
    }
    if (opts.to) {
      conditions.push(sql`${walletTransfers.occurredAt} <= ${opts.to}`);
    }
    const rows = await db
      .select()
      .from(walletTransfers)
      .where(and(...conditions))
      .orderBy(
        desc(walletTransfers.occurredAt),
        desc(walletTransfers.createdAt)
      );
    return rows.map(rowToWalletTransfer);
  },

  async createWalletTransfer(userId, input) {
    await ensureFinanceDatabase();
    await ensureOwnedWalletPocket(userId, input.fromPocketId);
    await ensureOwnedWalletPocket(userId, input.toPocketId);
    const row = {
      id: randomUUID(),
      userId,
      fromPocketId: input.fromPocketId,
      toPocketId: input.toPocketId,
      amount: String(input.amount),
      note: input.note,
      occurredAt: new Date(input.occurredAt),
      createdAt: new Date(),
    };
    const inserted = await db.insert(walletTransfers).values(row).returning();
    return rowToWalletTransfer(inserted[0]);
  },

  async getDailyReminderPreference(userId) {
    await ensureFinanceDatabase();
    const existing = await db
      .select()
      .from(dailyReminderPreferences)
      .where(eq(dailyReminderPreferences.userId, userId))
      .limit(1);
    if (existing.length > 0) {
      return rowToDailyReminderPreference(existing[0]);
    }

    const now = new Date();
    const inserted = await db
      .insert(dailyReminderPreferences)
      .values({
        userId,
        enabled: false,
        localTime: "20:00",
        timeZone: "Asia/Bangkok",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: dailyReminderPreferences.userId })
      .returning();
    if (inserted.length > 0) {
      return rowToDailyReminderPreference(inserted[0]);
    }

    const concurrent = await db
      .select()
      .from(dailyReminderPreferences)
      .where(eq(dailyReminderPreferences.userId, userId))
      .limit(1);
    if (concurrent.length === 0) {
      throw new Error("daily reminder preference could not be created");
    }
    return rowToDailyReminderPreference(concurrent[0]);
  },

  async updateDailyReminderPreference(userId, input) {
    await ensureFinanceDatabase();
    const now = new Date();
    const rows = await db
      .insert(dailyReminderPreferences)
      .values({
        userId,
        enabled: input.enabled,
        localTime: input.localTime,
        timeZone: input.timeZone,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: dailyReminderPreferences.userId,
        set: {
          enabled: input.enabled,
          localTime: input.localTime,
          timeZone: input.timeZone,
          updatedAt: now,
        },
      })
      .returning();
    return rowToDailyReminderPreference(rows[0]);
  },

  async enableDailyReminder(userId, schedule, subscription) {
    await ensureFinanceDatabase();
    const now = new Date();
    const expirationTime = subscription.expirationTime
      ? new Date(subscription.expirationTime)
      : null;
    return db.transaction(async (tx) => {
      const preferenceRows = await tx
        .insert(dailyReminderPreferences)
        .values({
          userId,
          enabled: true,
          localTime: schedule.localTime,
          timeZone: schedule.timeZone,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: dailyReminderPreferences.userId,
          set: {
            enabled: true,
            localTime: schedule.localTime,
            timeZone: schedule.timeZone,
            updatedAt: now,
          },
        })
        .returning();
      await tx
        .insert(pushSubscriptions)
        .values({
          id: randomUUID(),
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
          expirationTime,
          userAgent: subscription.userAgent,
          revokedAt: null,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: pushSubscriptions.endpoint,
          set: {
            userId,
            p256dh: subscription.p256dh,
            auth: subscription.auth,
            expirationTime,
            userAgent: subscription.userAgent,
            revokedAt: null,
            updatedAt: now,
          },
        });
      const countRows = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.userId, userId),
            isNull(pushSubscriptions.revokedAt)
          )
        );
      if ((countRows[0]?.count ?? 0) > 5) {
        throw new Error("push subscription limit reached");
      }
      return {
        preference: rowToDailyReminderPreference(preferenceRows[0]),
        activeDeviceCount: countRows[0]?.count ?? 0,
      };
    });
  },

  async disableDailyReminder(userId, schedule) {
    await ensureFinanceDatabase();
    const now = new Date();
    return db.transaction(async (tx) => {
      const preferenceRows = await tx
        .insert(dailyReminderPreferences)
        .values({
          userId,
          enabled: false,
          localTime: schedule.localTime,
          timeZone: schedule.timeZone,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: dailyReminderPreferences.userId,
          set: {
            enabled: false,
            localTime: schedule.localTime,
            timeZone: schedule.timeZone,
            updatedAt: now,
          },
        })
        .returning();
      await tx
        .update(pushSubscriptions)
        .set({ revokedAt: now, updatedAt: now })
        .where(
          and(
            eq(pushSubscriptions.userId, userId),
            isNull(pushSubscriptions.revokedAt)
          )
        );
      return {
        preference: rowToDailyReminderPreference(preferenceRows[0]),
        activeDeviceCount: 0,
      };
    });
  },

  async upsertPushSubscription(userId, input) {
    await ensureFinanceDatabase();
    const now = new Date();
    const expirationTime = input.expirationTime
      ? new Date(input.expirationTime)
      : null;
    const rows = await db
      .insert(pushSubscriptions)
      .values({
        id: randomUUID(),
        userId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        expirationTime,
        userAgent: input.userAgent,
        revokedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId,
          p256dh: input.p256dh,
          auth: input.auth,
          expirationTime,
          userAgent: input.userAgent,
          revokedAt: null,
          updatedAt: now,
        },
      })
      .returning();
    return rowToPushSubscription(rows[0]);
  },

  async revokePushSubscription(userId, endpoint) {
    await ensureFinanceDatabase();
    const rows = await db
      .update(pushSubscriptions)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint),
          isNull(pushSubscriptions.revokedAt)
        )
      )
      .returning({ id: pushSubscriptions.id });
    return rows.length > 0;
  },

  async listActivePushSubscriptions(userId) {
    await ensureFinanceDatabase();
    const rows = await db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          isNull(pushSubscriptions.revokedAt)
        )
      )
      .orderBy(desc(pushSubscriptions.updatedAt));
    return rows.map(rowToPushSubscription);
  },

  async countActivePushSubscriptions(userId) {
    await ensureFinanceDatabase();
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          isNull(pushSubscriptions.revokedAt)
        )
      );
    return rows[0]?.count ?? 0;
  },

  async listGoals(userId) {
    await ensureFinanceDatabase();
    const rows = await db
      .select({
        id: goals.id,
        userId: goals.userId,
        name: goals.name,
        target: goals.target,
        createdAt: goals.createdAt,
        saved: sql<string>`coalesce(sum(${goalContributions.amount}), 0)`,
      })
      .from(goals)
      .leftJoin(goalContributions, eq(goalContributions.goalId, goals.id))
      .where(eq(goals.userId, userId))
      .groupBy(goals.id)
      .orderBy(desc(goals.createdAt));
    return rows.map(
      (r): Goal => ({
        id: r.id,
        userId: r.userId,
        name: r.name,
        target: toMoney(r.target),
        saved: toMoney(r.saved),
        createdAt: r.createdAt.toISOString(),
      })
    );
  },

  async createGoal(userId, input) {
    await ensureFinanceDatabase();
    const row = {
      id: randomUUID(),
      userId,
      name: input.name,
      target: String(input.target),
      createdAt: new Date(),
    };
    const inserted = await db.insert(goals).values(row).returning();
    const g = inserted[0];
    return {
      id: g.id,
      userId: g.userId,
      name: g.name,
      target: toMoney(g.target),
      saved: 0,
      createdAt: g.createdAt.toISOString(),
    };
  },

  async addContribution(userId, input) {
    await ensureFinanceDatabase();
    return db.transaction(async (tx) => {
      // Ownership check: the goal must belong to this user.
      const owned = await tx
        .select({ id: goals.id })
        .from(goals)
        .where(and(eq(goals.id, input.goalId), eq(goals.userId, userId)))
        .limit(1);
      if (owned.length === 0) {
        throw new Error("goal not found for user");
      }
      const row = {
        id: randomUUID(),
        userId,
        goalId: input.goalId,
        amount: String(input.amount),
        note: input.note,
        occurredAt: new Date(input.occurredAt),
      };
      const inserted = await tx
        .insert(goalContributions)
        .values(row)
        .returning();
      const c = inserted[0];
      return {
        id: c.id,
        userId: c.userId,
        goalId: c.goalId,
        amount: toMoney(c.amount),
        note: c.note,
        occurredAt: c.occurredAt.toISOString(),
      } satisfies GoalContribution;
    });
  },
};
