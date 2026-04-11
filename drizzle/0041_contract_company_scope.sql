ALTER TABLE "contract" ADD COLUMN "company_id" text REFERENCES "company"("id") ON DELETE SET NULL;

CREATE INDEX "contract_company_idx" ON "contract" ("company_id");
