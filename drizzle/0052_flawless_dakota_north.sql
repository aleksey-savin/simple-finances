ALTER TABLE "smtp_settings" DROP CONSTRAINT IF EXISTS "smtp_settings_account_unique";--> statement-breakpoint
ALTER TABLE "smtp_settings" DROP CONSTRAINT IF EXISTS "smtp_settings_current_account_id_current_account_id_fk";
--> statement-breakpoint
ALTER TABLE "smtp_settings" DROP COLUMN IF EXISTS "current_account_id";
