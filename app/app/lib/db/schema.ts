import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

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
    icon: text("icon").notNull().default("tags"),
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
    source: text("source").notNull().default("manual"),
    recurringTemplateId: text("recurring_template_id"),
    recurringOccurrenceId: text("recurring_occurrence_id"),
  },
  (t) => ({
    userOrderIdx: index("transactions_user_order_idx").on(
      t.userId,
      t.occurredAt,
      t.createdAt
    ),
    sourceIdx: index("transactions_source_idx").on(t.userId, t.source),
  })
);

export const recurringTemplates = pgTable(
  "recurring_templates",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    categoryId: text("category_id"),
    note: text("note"),
    frequency: text("frequency").notNull(),
    weeklyDay: integer("weekly_day"),
    monthlyDay: integer("monthly_day"),
    yearlyMonth: integer("yearly_month"),
    yearlyDay: integer("yearly_day"),
    startDate: text("start_date").notNull(),
    endDate: text("end_date"),
    nextRunOn: text("next_run_on"),
    postMode: text("post_mode").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    userStatusIdx: index("recurring_templates_user_status_idx").on(
      t.userId,
      t.status
    ),
    dueIdx: index("recurring_templates_due_idx").on(t.userId, t.nextRunOn),
  })
);

export const recurringOccurrences = pgTable(
  "recurring_occurrences",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    templateId: text("template_id").notNull(),
    scheduledOn: text("scheduled_on").notNull(),
    status: text("status").notNull(),
    transactionId: text("transaction_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    userStatusIdx: index("recurring_occurrences_user_status_idx").on(
      t.userId,
      t.status
    ),
    templateScheduleUnique: uniqueIndex(
      "recurring_occurrences_template_schedule_unique"
    ).on(t.templateId, t.scheduledOn),
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
