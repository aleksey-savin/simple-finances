-- Drop company_id from counterparty (no longer owns scope)
ALTER TABLE "counterparty" DROP CONSTRAINT IF EXISTS "counterparty_company_id_company_id_fk";
ALTER TABLE "counterparty" DROP COLUMN IF EXISTS "company_id";

-- Junction: company ↔ counterparty
CREATE TABLE "company_counterparty" (
  "id" text PRIMARY KEY NOT NULL,
  "company_id" text NOT NULL,
  "counterparty_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "company_counterparty_unique" UNIQUE("company_id", "counterparty_id")
);
ALTER TABLE "company_counterparty" ADD CONSTRAINT "company_counterparty_company_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE CASCADE;
ALTER TABLE "company_counterparty" ADD CONSTRAINT "company_counterparty_counterparty_id_fk"
  FOREIGN KEY ("counterparty_id") REFERENCES "public"."counterparty"("id") ON DELETE CASCADE;
CREATE INDEX "company_counterparty_company_idx" ON "company_counterparty"("company_id");
CREATE INDEX "company_counterparty_counterparty_idx" ON "company_counterparty"("counterparty_id");

-- Junction: user ↔ counterparty
CREATE TABLE "user_counterparty" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "counterparty_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "user_counterparty_unique" UNIQUE("user_id", "counterparty_id")
);
ALTER TABLE "user_counterparty" ADD CONSTRAINT "user_counterparty_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE CASCADE;
ALTER TABLE "user_counterparty" ADD CONSTRAINT "user_counterparty_counterparty_id_fk"
  FOREIGN KEY ("counterparty_id") REFERENCES "public"."counterparty"("id") ON DELETE CASCADE;
CREATE INDEX "user_counterparty_user_idx" ON "user_counterparty"("user_id");
CREATE INDEX "user_counterparty_counterparty_idx" ON "user_counterparty"("counterparty_id");

-- Migrate existing counterparties into their creator's personal scope
INSERT INTO "user_counterparty" ("id", "user_id", "counterparty_id", "created_at")
SELECT gen_random_uuid(), "created_by", "id", now()
FROM "counterparty"
ON CONFLICT DO NOTHING;
