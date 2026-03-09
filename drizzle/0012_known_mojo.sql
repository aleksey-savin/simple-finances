ALTER TABLE "category" RENAME COLUMN "user_id" TO "created_by";--> statement-breakpoint
ALTER TABLE "current_account" RENAME COLUMN "user_id" TO "created_by";--> statement-breakpoint
ALTER TABLE "expense" RENAME COLUMN "user_id" TO "created_by";--> statement-breakpoint
ALTER TABLE "income" RENAME COLUMN "user_id" TO "created_by";--> statement-breakpoint
ALTER TABLE "category" DROP CONSTRAINT "category_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "current_account" DROP CONSTRAINT "current_account_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "expense" DROP CONSTRAINT "expense_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "income" DROP CONSTRAINT "income_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "current_account" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "expense" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "income" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "current_account" ADD CONSTRAINT "current_account_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "current_account" ADD CONSTRAINT "current_account_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income" ADD CONSTRAINT "income_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income" ADD CONSTRAINT "income_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;