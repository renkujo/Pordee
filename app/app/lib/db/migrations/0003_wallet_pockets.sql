CREATE TABLE "wallet_pockets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'custom' NOT NULL,
	"monthly_limit" numeric(12, 2) NOT NULL,
	"mascot" text DEFAULT 'normal' NOT NULL,
	"surface" text DEFAULT 'sky' NOT NULL,
	"rollover_rule" text DEFAULT 'keep' NOT NULL,
	"is_archived" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_pocket_categories" (
	"pocket_id" text NOT NULL,
	"category_id" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_allocations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"pocket_id" text NOT NULL,
	"month_key" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_transfers" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"from_pocket_id" text,
	"to_pocket_id" text,
	"amount" numeric(12, 2) NOT NULL,
	"note" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "wallet_pockets_user_idx" ON "wallet_pockets" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_pocket_categories_pocket_category_unique" ON "wallet_pocket_categories" USING btree ("pocket_id","category_id");--> statement-breakpoint
CREATE INDEX "wallet_pocket_categories_user_idx" ON "wallet_pocket_categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wallet_allocations_month_idx" ON "wallet_allocations" USING btree ("user_id","month_key");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_allocations_pocket_month_unique" ON "wallet_allocations" USING btree ("pocket_id","month_key");--> statement-breakpoint
CREATE INDEX "wallet_transfers_user_order_idx" ON "wallet_transfers" USING btree ("user_id","occurred_at");
