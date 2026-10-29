CREATE TABLE IF NOT EXISTS "characterProgress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"character_id" text NOT NULL,
	"affection" integer DEFAULT 0,
	"affection_level" integer DEFAULT 0,
	"active_outfit" text DEFAULT 'default',
	"items_brought" text[],
	"active_debuffs" text[],
	"active_buffs" text[],
	"hunger" integer DEFAULT 100,
	"energy" integer DEFAULT 100,
	"hydration" integer DEFAULT 100,
	"cycle_anchor" timestamp,
	"stats_updated_at" timestamp,
	"long_term_memory" text DEFAULT '',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "storyProgress" DROP CONSTRAINT "storyProgress_user_id_unique";--> statement-breakpoint
ALTER TABLE "chatMessages" ADD COLUMN "character_id" text DEFAULT 'livia' NOT NULL;--> statement-breakpoint
ALTER TABLE "memoryItems" ADD COLUMN "character_id" text DEFAULT 'livia' NOT NULL;--> statement-breakpoint
ALTER TABLE "messageSummaries" ADD COLUMN "character_id" text DEFAULT 'livia' NOT NULL;--> statement-breakpoint
ALTER TABLE "storyProgress" ADD COLUMN "character_id" text DEFAULT 'livia' NOT NULL;--> statement-breakpoint
ALTER TABLE "userProfiles" ADD COLUMN "active_character_id" text DEFAULT 'livia' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "characterProgress" ADD CONSTRAINT "characterProgress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_character_progress_user_character" ON "characterProgress" ("user_id","character_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chat_character" ON "chatMessages" ("user_id","character_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_summaries_character" ON "messageSummaries" ("user_id","character_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_story_progress_user_character" ON "storyProgress" ("user_id","character_id");--> statement-breakpoint

-- M8.2 Phase B: potret progres aktif yang sudah ada di userProfiles dimasukkan
-- sebagai snapshot karakter pertama (Livia). Tanpa ini, user lama kehilangan
-- afeksi/statistik/koper Livia-nya saat pertama kali berganti karakter.
INSERT INTO "characterProgress" (
  "user_id", "character_id", "affection", "affection_level", "active_outfit",
  "items_brought", "active_debuffs", "active_buffs",
  "hunger", "energy", "hydration", "cycle_anchor", "stats_updated_at",
  "long_term_memory", "updated_at"
)
SELECT
  "user_id", 'livia',
  COALESCE("affection", 0), COALESCE("affection_level", 0), COALESCE("active_outfit", 'default'),
  "items_brought", "active_debuffs", "active_buffs",
  COALESCE("livia_hunger", 100), COALESCE("livia_energy", 100), COALESCE("livia_hydration", 100),
  "livia_cycle_anchor", "livia_stats_updated_at", COALESCE("long_term_memory", ''), now()
FROM "userProfiles"
ON CONFLICT ("user_id", "character_id") DO NOTHING;