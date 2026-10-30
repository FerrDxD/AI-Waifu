CREATE TABLE IF NOT EXISTS "dailyQuests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" text NOT NULL,
	"action" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"quest_id" text,
	"milestone" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dailyQuests" ADD CONSTRAINT "dailyQuests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_daily_quests_user_date_action" ON "dailyQuests" ("user_id","date","action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quest_user_date_claim" ON "dailyQuests" ("user_id","date");