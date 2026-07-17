CREATE TABLE "daily_reminder_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"local_time" text DEFAULT '20:00' NOT NULL,
	"time_zone" text DEFAULT 'Asia/Bangkok' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"expiration_time" timestamp with time zone,
	"user_agent" text,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_reminder_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"local_date" text NOT NULL,
	"time_zone" text NOT NULL,
	"scheduled_local_time" text NOT NULL,
	"status" text NOT NULL,
	"subscription_count" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"claimed_at" timestamp with time zone NOT NULL,
	"delivery_started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_unique" ON "push_subscriptions" USING btree ("endpoint");
--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_active_idx" ON "push_subscriptions" USING btree ("user_id","revoked_at");
--> statement-breakpoint
CREATE INDEX "daily_reminder_preferences_enabled_idx" ON "daily_reminder_preferences" USING btree ("enabled");
--> statement-breakpoint
CREATE UNIQUE INDEX "daily_reminder_runs_user_date_unique" ON "daily_reminder_runs" USING btree ("user_id","local_date");
--> statement-breakpoint
CREATE INDEX "daily_reminder_runs_status_idx" ON "daily_reminder_runs" USING btree ("status","claimed_at");
