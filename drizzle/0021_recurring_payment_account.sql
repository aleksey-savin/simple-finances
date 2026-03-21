ALTER TABLE "recurring_rule" ADD COLUMN "payment_account_id" text;--> statement-breakpoint
ALTER TABLE "recurring_rule" ADD COLUMN "payment_category_id" text;--> statement-breakpoint
ALTER TABLE "recurring_rule" ADD CONSTRAINT "recurring_rule_payment_account_id_current_account_id_fk" FOREIGN KEY ("payment_account_id") REFERENCES "public"."current_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_rule" ADD CONSTRAINT "recurring_rule_payment_category_id_category_id_fk" FOREIGN KEY ("payment_category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;
