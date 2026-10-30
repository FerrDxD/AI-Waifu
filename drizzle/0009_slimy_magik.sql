CREATE TABLE IF NOT EXISTS "pushSentLogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"status" text DEFAULT 'sent' NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pushSubscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "notified_at" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pushSentLogs" ADD CONSTRAINT "pushSentLogs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pushSubscriptions" ADD CONSTRAINT "pushSubscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_push_log_user_kind" ON "pushSentLogs" ("user_id","kind");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_push_log_kind_created" ON "pushSentLogs" ("kind","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_push_subscriptions_user_endpoint" ON "pushSubscriptions" ("user_id","endpoint");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_push_subscriptions_user_created" ON "pushSubscriptions" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reminders_active_notified" ON "reminders" ("status","notified_at");