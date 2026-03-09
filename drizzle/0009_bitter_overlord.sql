ALTER TABLE "expense" RENAME COLUMN "account_id" TO "current_account_id";--> statement-breakpoint
ALTER TABLE "income" RENAME COLUMN "account_id" TO "current_account_id";--> statement-breakpoint
ALTER TABLE "expense" DROP CONSTRAINT "expense_account_id_current_account_id_fk";
--> statement-breakpoint
ALTER TABLE "income" DROP CONSTRAINT "income_account_id_account_id_fk";
--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_current_account_id_current_account_id_fk" FOREIGN KEY ("current_account_id") REFERENCES "public"."current_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income" ADD CONSTRAINT "income_current_account_id_account_id_fk" FOREIGN KEY ("current_account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;