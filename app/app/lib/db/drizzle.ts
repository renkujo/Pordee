import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "./client";
import { ensureFinanceDatabase } from "./migrate.server";
import { categories, goalContributions, goals, transactions } from "./schema";
import type {
  Category,
  Goal,
  GoalContribution,
  PordeeRepo,
  Transaction,
} from "./types";

const DEFAULT_CATEGORIES: Array<Pick<Category, "name" | "kind">> = [
  { name: "อาหาร", kind: "expense" },
  { name: "เดินทาง", kind: "expense" },
  { name: "บิล", kind: "expense" },
  { name: "เงินเดือน", kind: "income" },
  { name: "งานเสริม", kind: "income" },
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
  };
};

const rowToCategory = (row: typeof categories.$inferSelect): Category => {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    kind: row.kind as Category["kind"],
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
    }))
  );
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
    };
    await db.insert(categories).values(row);
    return rowToCategory(row as typeof categories.$inferSelect);
  },

  async updateCategory(userId, id, input) {
    await ensureFinanceDatabase();
    const updated = await db
      .update(categories)
      .set({ name: input.name })
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
