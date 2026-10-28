CREATE TABLE IF NOT EXISTS "userActivityDaily" (
	"user_id" uuid NOT NULL,
	"day" timestamp with time zone NOT NULL,
	CONSTRAINT "userActivityDaily_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "userActivityDaily" ADD CONSTRAINT "userActivityDaily_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
