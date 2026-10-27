CREATE TABLE IF NOT EXISTS "auditEvents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"outcome" text DEFAULT 'success' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chatMessages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"affection_delta" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gardenPots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pot_index" integer NOT NULL,
	"plant_id" text,
	"stage" text,
	"hydration" integer DEFAULT 0,
	"last_watered_at" timestamp,
	"planted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "memoryItems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"content" text NOT NULL,
	"confidence" integer DEFAULT 60 NOT NULL,
	"decay_score" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"last_recalled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messageSummaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"covered_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pomodoroSessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"duration_minutes" integer NOT NULL,
	"completed_at" timestamp NOT NULL,
	"was_completed" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "screenTimeLogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_start" timestamp NOT NULL,
	"session_end" timestamp,
	"duration_seconds" integer DEFAULT 0,
	"date" date NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "storyProgress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"unlocked_chapters" integer[] DEFAULT ARRAY[0]::integer[],
	"last_read_chapter" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "storyProgress_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userApiKeys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text DEFAULT 'gemini' NOT NULL,
	"ciphertext" text NOT NULL,
	"iv" text NOT NULL,
	"auth_tag" text NOT NULL,
	"key_hint" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "userApiKeys_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userProfiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"onboarding_done" boolean DEFAULT false,
	"items_brought" text[],
	"active_debuffs" text[],
	"active_buffs" text[],
	"affection" integer DEFAULT 0,
	"affection_level" integer DEFAULT 0,
	"active_outfit" text DEFAULT 'default',
	"money" integer DEFAULT 0,
	"total_screen_time" integer DEFAULT 0,
	"total_pomodoro_sessions" integer DEFAULT 0,
	"job_stats" jsonb DEFAULT '{}'::jsonb,
	"livia_hunger" integer DEFAULT 100,
	"livia_energy" integer DEFAULT 100,
	"livia_hydration" integer DEFAULT 100,
	"livia_cycle_anchor" timestamp DEFAULT now(),
	"livia_stats_updated_at" timestamp DEFAULT now(),
	"long_term_memory" text DEFAULT '',
	"last_seen" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "userProfiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text,
	"email" text NOT NULL,
	"password" text,
	"name" text,
	"image" text,
	"provider" text DEFAULT 'credentials' NOT NULL,
	"age_confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chatMessages" ADD CONSTRAINT "chatMessages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gardenPots" ADD CONSTRAINT "gardenPots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "memoryItems" ADD CONSTRAINT "memoryItems_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messageSummaries" ADD CONSTRAINT "messageSummaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pomodoroSessions" ADD CONSTRAINT "pomodoroSessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "screenTimeLogs" ADD CONSTRAINT "screenTimeLogs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "storyProgress" ADD CONSTRAINT "storyProgress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "userApiKeys" ADD CONSTRAINT "userApiKeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "userProfiles" ADD CONSTRAINT "userProfiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chat_user_created_at" ON "chatMessages" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_memories_user_last_recalled" ON "memoryItems" ("user_id","last_recalled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pomodoro_user_completed" ON "pomodoroSessions" ("user_id","completed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_screentime_user_date" ON "screenTimeLogs" ("user_id","date");