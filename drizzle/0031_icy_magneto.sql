CREATE TABLE "company" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_current_account" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"current_account_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "company_current_account_unique" UNIQUE("company_id","current_account_id"),
	CONSTRAINT "company_current_account_account_unique" UNIQUE("current_account_id")
);
--> statement-breakpoint
ALTER TABLE "company" ADD CONSTRAINT "company_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_current_account" ADD CONSTRAINT "company_current_account_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_current_account" ADD CONSTRAINT "company_current_account_current_account_id_current_account_id_fk" FOREIGN KEY ("current_account_id") REFERENCES "public"."current_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_current_account_company_idx" ON "company_current_account" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "company_current_account_account_idx" ON "company_current_account" USING btree ("current_account_id");