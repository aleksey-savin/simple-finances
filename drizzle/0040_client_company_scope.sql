ALTER TABLE "client" ADD COLUMN "company_id" text REFERENCES "company"("id") ON DELETE SET NULL;

CREATE INDEX "client_company_idx" ON "client" ("company_id");
