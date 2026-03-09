CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"balance" numeric DEFAULT '0' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "incomes" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "value" numeric NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "description" text NOT NULL;--> statement-breakpoint
ALTER TABLE "incomes" ADD COLUMN "value" numeric NOT NULL;--> statement-breakpoint
ALTER TABLE "incomes" ADD COLUMN "description" text NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "incomes" DROP COLUMN "name";