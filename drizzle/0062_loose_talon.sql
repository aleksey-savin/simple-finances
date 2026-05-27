CREATE TYPE "public"."notification_style" AS ENUM('strict', 'soft');--> statement-breakpoint
ALTER TABLE "business_line" ADD COLUMN "reminder_days_before" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "business_line" ADD COLUMN "reminder_frequency_days" integer DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE "business_line" ADD COLUMN "notification_style" "notification_style" DEFAULT 'strict' NOT NULL;--> statement-breakpoint
ALTER TABLE "proxmox_account_settings" DROP COLUMN "reminder_days_before";