import { index, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Better Auth owns the `user` table; we reference its id by name (plain text)
// without redefining it or declaring a DB-level FK, so our migrations stay
// decoupled from Better Auth's DDL. Ownership is enforced in the repo via
// `WHERE user_id = $1`.

export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    kind: text("kind").notNull(), // 'expense' | 'income'
  },
  (t) => ({
    userIdx: index("categories_user_idx").on(t.userId),
  })
);

export const transactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    categoryId: text("category_id"),
    note: text("note"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    userOrderIdx: index("transactions_user_order_idx").on(
      t.userId,
      t.occurredAt,
      t.createdAt
    ),
  })
);

export const goals = pgTable(
  "goals",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    target: numeric("target", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    userIdx: index("goals_user_idx").on(t.userId),
  })
);

export const goalContributions = pgTable(
  "goal_contributions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    goalId: text("goal_id").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    note: text("note"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    goalIdx: index("goal_contributions_goal_idx").on(t.goalId),
    userIdx: index("goal_contributions_user_idx").on(t.userId),
  })
);
