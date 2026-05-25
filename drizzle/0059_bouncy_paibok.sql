ALTER TABLE "user" ALTER COLUMN "two_factor_enabled" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "second_factor_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DELETE FROM "two_factor" WHERE "user_id" IN (SELECT "id" FROM "user" WHERE "two_factor_enabled" = false);