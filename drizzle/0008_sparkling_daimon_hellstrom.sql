ALTER TABLE "categories" RENAME TO "category";--> statement-breakpoint
ALTER TABLE "accounts" RENAME TO "current_account";--> statement-breakpoint
ALTER TABLE "expenses" RENAME TO "expense";--> statement-breakpoint
ALTER TABLE "incomes" RENAME TO "income";--> statement-breakpoint
ALTER TABLE "category" DROP CONSTRAINT "categories_name_unique";--> statement-breakpoint
ALTER TABLE "expense" DROP CONSTRAINT "expenses_category_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "expense" DROP CONSTRAINT "expenses_account_id_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "income" DROP CONSTRAINT "incomes_category_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "income" DROP CONSTRAINT "incomes_account_id_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "current_account" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "expense" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "income" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "current_account" ADD CONSTRAINT "current_account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_account_id_current_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."current_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income" ADD CONSTRAINT "income_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income" ADD CONSTRAINT "income_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income" ADD CONSTRAINT "income_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_name_unique" UNIQUE("name");