CREATE TABLE "company_counterparty" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"counterparty_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "company_counterparty_unique" UNIQUE("company_id","counterparty_id")
);
--> statement-breakpoint
CREATE TABLE "user_counterparty" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"counterparty_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_counterparty_unique" UNIQUE("user_id","counterparty_id")
);
--> statement-breakpoint
ALTER TABLE "counterparty" DROP CONSTRAINT "counterparty_company_id_company_id_fk";
--> statement-breakpoint
ALTER TABLE "company_counterparty" ADD CONSTRAINT "company_counterparty_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_counterparty" ADD CONSTRAINT "company_counterparty_counterparty_id_counterparty_id_fk" FOREIGN KEY ("counterparty_id") REFERENCES "public"."counterparty"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_counterparty" ADD CONSTRAINT "user_counterparty_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_counterparty" ADD CONSTRAINT "user_counterparty_counterparty_id_counterparty_id_fk" FOREIGN KEY ("counterparty_id") REFERENCES "public"."counterparty"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_counterparty_company_idx" ON "company_counterparty" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "company_counterparty_counterparty_idx" ON "company_counterparty" USING btree ("counterparty_id");--> statement-breakpoint
CREATE INDEX "user_counterparty_user_idx" ON "user_counterparty" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_counterparty_counterparty_idx" ON "user_counterparty" USING btree ("counterparty_id");--> statement-breakpoint
ALTER TABLE "counterparty" DROP COLUMN "company_id";