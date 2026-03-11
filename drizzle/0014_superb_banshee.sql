CREATE TABLE "expense_tag" (
	"id" text PRIMARY KEY NOT NULL,
	"expense_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "expense_tag_unique" UNIQUE("expense_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "income_tag" (
	"id" text PRIMARY KEY NOT NULL,
	"income_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "income_tag_unique" UNIQUE("income_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tag_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "expense_tag" ADD CONSTRAINT "expense_tag_expense_id_expense_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expense"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_tag" ADD CONSTRAINT "expense_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income_tag" ADD CONSTRAINT "income_tag_income_id_income_id_fk" FOREIGN KEY ("income_id") REFERENCES "public"."income"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income_tag" ADD CONSTRAINT "income_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expense_tag_expense_idx" ON "expense_tag" USING btree ("expense_id");--> statement-breakpoint
CREATE INDEX "expense_tag_tag_idx" ON "expense_tag" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "income_tag_income_idx" ON "income_tag" USING btree ("income_id");--> statement-breakpoint
CREATE INDEX "income_tag_tag_idx" ON "income_tag" USING btree ("tag_id");