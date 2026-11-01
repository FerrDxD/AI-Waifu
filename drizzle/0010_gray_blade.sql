DROP INDEX IF EXISTS "uq_daily_quests_user_date_action";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_daily_quests_user_date_action_progress" ON "dailyQuests" ("user_id","date","action") WHERE "quest_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_daily_quests_user_date_claim" ON "dailyQuests" ("user_id","date","quest_id") WHERE "quest_id" IS NOT NULL;