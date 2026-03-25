ALTER TABLE "expense" ADD COLUMN "recurring_rule_id" text;--> statement-breakpoint
ALTER TABLE "expense" ADD COLUMN "recurring_occurrence_at" timestamp;--> statement-breakpoint
ALTER TABLE "income" ADD COLUMN "recurring_rule_id" text;--> statement-breakpoint
ALTER TABLE "income" ADD COLUMN "recurring_occurrence_at" timestamp;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_recurring_rule_id_recurring_rule_id_fk" FOREIGN KEY ("recurring_rule_id") REFERENCES "public"."recurring_rule"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income" ADD CONSTRAINT "income_recurring_rule_id_recurring_rule_id_fk" FOREIGN KEY ("recurring_rule_id") REFERENCES "public"."recurring_rule"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_recurring_occurrence_unique" UNIQUE("recurring_rule_id","recurring_occurrence_at");--> statement-breakpoint
ALTER TABLE "income" ADD CONSTRAINT "income_recurring_occurrence_unique" UNIQUE("recurring_rule_id","recurring_occurrence_at");