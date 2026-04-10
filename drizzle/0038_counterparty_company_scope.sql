ALTER TABLE "counterparty" ADD COLUMN "company_id" text;--> statement-breakpoint
ALTER TABLE "counterparty" ADD CONSTRAINT "counterparty_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE set null ON UPDATE no action;
