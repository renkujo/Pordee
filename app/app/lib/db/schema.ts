import {
  boolean,
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

export const walletPockets = pgTable(
  "wallet_pockets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    type: text("type").notNull().default("custom"),
    monthlyLimit: numeric("monthly_limit", {
      precision: 12,
      scale: 2,
    }).notNull(),
    mascot: text("mascot").notNull().default("normal"),
    surface: text("surface").notNull().default("sky"),
    rolloverRule: text("rollover_rule").notNull().default("keep"),
    sortOrder: integer("sort_order").notNull().default(0),
    isArchived: integer("is_archived").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    userIdx: index("wallet_pockets_user_idx").on(t.userId),
  })
);

export const walletPocketCategories = pgTable(
  "wallet_pocket_categories",
  {
    pocketId: text("pocket_id").notNull(),
    categoryId: text("category_id").notNull(),
    userId: text("user_id").notNull(),
  },
  (t) => ({
    pocketCategoryUnique: uniqueIndex(
      "wallet_pocket_categories_pocket_category_unique"
    ).on(t.pocketId, t.categoryId),
    userIdx: index("wallet_pocket_categories_user_idx").on(t.userId),
  })
);

export const walletAllocations = pgTable(
  "wallet_allocations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    pocketId: text("pocket_id").notNull(),
    monthKey: text("month_key").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    monthIdx: index("wallet_allocations_month_idx").on(t.userId, t.monthKey),
    pocketMonthUnique: uniqueIndex("wallet_allocations_pocket_month_unique").on(
      t.pocketId,
      t.monthKey
    ),
  })
);

export const walletTransfers = pgTable(
  "wallet_transfers",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    fromPocketId: text("from_pocket_id"),
    toPocketId: text("to_pocket_id"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    note: text("note"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    userOrderIdx: index("wallet_transfers_user_order_idx").on(
      t.userId,
      t.occurredAt
    ),
  })
);

export const dailyReminderPreferences = pgTable(
  "daily_reminder_preferences",
  {
    userId: text("user_id").primaryKey(),
    enabled: boolean("enabled").notNull().default(false),
    localTime: text("local_time").notNull().default("20:00"),
    timeZone: text("time_zone").notNull().default("Asia/Bangkok"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    enabledIdx: index("daily_reminder_preferences_enabled_idx").on(t.enabled),
  })
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    expirationTime: timestamp("expiration_time", { withTimezone: true }),
    userAgent: text("user_agent"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    endpointUnique: uniqueIndex("push_subscriptions_endpoint_unique").on(
      t.endpoint
    ),
    userActiveIdx: index("push_subscriptions_user_active_idx").on(
      t.userId,
      t.revokedAt
    ),
  })
);

export const dailyReminderRuns = pgTable(
  "daily_reminder_runs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    localDate: text("local_date").notNull(),
    timeZone: text("time_zone").notNull(),
    scheduledLocalTime: text("scheduled_local_time").notNull(),
    status: text("status").notNull(),
    subscriptionCount: integer("subscription_count").notNull().default(0),
    sentCount: integer("sent_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull(),
    deliveryStartedAt: timestamp("delivery_started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    userDateUnique: uniqueIndex("daily_reminder_runs_user_date_unique").on(
      t.userId,
      t.localDate
    ),
    statusIdx: index("daily_reminder_runs_status_idx").on(
      t.status,
      t.claimedAt
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
