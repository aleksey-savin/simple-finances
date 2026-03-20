CREATE TYPE "public"."counterparty_type" AS ENUM('Юридическое лицо', 'Физическое лицо', 'Индивидуальный предприниматель', 'Обособленное подразделение', 'Государственный орган');--> statement-breakpoint
ALTER TABLE "payee" RENAME TO "counterparty";--> statement-breakpoint
ALTER TABLE "expense" RENAME COLUMN "payee_id" TO "counterparty_id";--> statement-breakpoint
ALTER TABLE "recurring_rule" RENAME COLUMN "payee_id" TO "counterparty_id";--> statement-breakpoint
ALTER TABLE "counterparty" DROP CONSTRAINT "payee_name_unique";--> statement-breakpoint
ALTER TABLE "expense" DROP CONSTRAINT "expense_payee_id_payee_id_fk";
--> statement-breakpoint
ALTER TABLE "counterparty" DROP CONSTRAINT "payee_created_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "recurring_rule" DROP CONSTRAINT "recurring_rule_payee_id_payee_id_fk";
--> statement-breakpoint
ALTER TABLE "income" ADD COLUMN "counterparty_id" text;--> statement-breakpoint
ALTER TABLE "counterparty" ADD COLUMN "type" "counterparty_type";--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_counterparty_id_counterparty_id_fk" FOREIGN KEY ("counterparty_id") REFERENCES "public"."counterparty"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income" ADD CONSTRAINT "income_counterparty_id_counterparty_id_fk" FOREIGN KEY ("counterparty_id") REFERENCES "public"."counterparty"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counterparty" ADD CONSTRAINT "counterparty_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_rule" ADD CONSTRAINT "recurring_rule_counterparty_id_counterparty_id_fk" FOREIGN KEY ("counterparty_id") REFERENCES "public"."counterparty"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counterparty" ADD CONSTRAINT "counterparty_name_unique" UNIQUE("name");