CREATE TABLE "current_account_user" (
	"id" text PRIMARY KEY NOT NULL,
	"current_account_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"invited_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "current_account_user_unique" UNIQUE("current_account_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "income" DROP CONSTRAINT "income_current_account_id_account_id_fk";
--> statement-breakpoint
ALTER TABLE "expense" ADD COLUMN "due_date" timestamp;--> statement-breakpoint
ALTER TABLE "income" ADD COLUMN "due_date" timestamp;--> statement-breakpoint
ALTER TABLE "current_account_user" ADD CONSTRAINT "current_account_user_current_account_id_current_account_id_fk" FOREIGN KEY ("current_account_id") REFERENCES "public"."current_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "current_account_user" ADD CONSTRAINT "current_account_user_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "current_account_user" ADD CONSTRAINT "current_account_user_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "current_account_user_account_idx" ON "current_account_user" USING btree ("current_account_id");--> statement-breakpoint
CREATE INDEX "current_account_user_user_idx" ON "current_account_user" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "income" ADD CONSTRAINT "income_current_account_id_current_account_id_fk" FOREIGN KEY ("current_account_id") REFERENCES "public"."current_account"("id") ON DELETE no action ON UPDATE no action;