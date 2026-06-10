ALTER TABLE "transactions" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "recurring_template_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "recurring_occurrence_id" text;--> statement-breakpoint
CREATE TABLE "recurring_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"category_id" text,
	"note" text,
	"frequency" text NOT NULL,
	"weekly_day" integer,
	"monthly_day" integer,
	"yearly_month" integer,
	"yearly_day" integer,
	"start_date" text NOT NULL,
	"end_date" text,
	"next_run_on" text,
	"post_mode" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_occurrences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"template_id" text NOT NULL,
	"scheduled_on" text NOT NULL,
	"status" text NOT NULL,
	"transaction_id" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "transactions_source_idx" ON "transactions" USING btree ("user_id","source");--> statement-breakpoint
CREATE INDEX "recurring_templates_user_status_idx" ON "recurring_templates" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "recurring_templates_due_idx" ON "recurring_templates" USING btree ("user_id","next_run_on");--> statement-breakpoint
CREATE INDEX "recurring_occurrences_user_status_idx" ON "recurring_occurrences" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "recurring_occurrences_template_schedule_unique" ON "recurring_occurrences" USING btree ("template_id","scheduled_on");
