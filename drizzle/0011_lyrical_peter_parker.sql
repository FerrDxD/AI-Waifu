-- Data fixup: claim rows lama memakai action yang sama dengan baris progress
-- (menyebabkan konflik unique). Ubah action-nya jadi 'claim_<questId>' agar unik.
UPDATE "dailyQuests" SET "action" = 'claim_' || "quest_id" WHERE "quest_id" IS NOT NULL;--> statement-breakpoint
DROP INDEX IF EXISTS "uq_daily_quests_user_date_action_progress";--> statement-breakpoint
DROP INDEX IF EXISTS "uq_daily_quests_user_date_claim";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_daily_quests_user_date_action" ON "dailyQuests" ("user_id","date","action");