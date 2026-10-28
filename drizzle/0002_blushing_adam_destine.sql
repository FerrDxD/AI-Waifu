CREATE TABLE IF NOT EXISTS "ttsCache" (
	"key" text PRIMARY KEY NOT NULL,
	"audio" "bytea" NOT NULL,
	"mime_type" text DEFAULT 'audio/mpeg' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"last_hit_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ttsUsage" (
	"user_id" uuid NOT NULL,
	"day" timestamp with time zone NOT NULL,
	"requests" integer DEFAULT 0 NOT NULL,
	"cache_hits" integer DEFAULT 0 NOT NULL,
	"chars_billed" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ttsUsage_user_id_day_pk" PRIMARY KEY("user_id","day")
);
