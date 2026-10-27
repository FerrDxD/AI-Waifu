CREATE TABLE IF NOT EXISTS "rateLimitCounters" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"window_start" timestamp with time zone NOT NULL
);
