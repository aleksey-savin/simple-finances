CREATE TYPE "public"."bank_transaction_direction" AS ENUM('debit', 'credit');--> statement-breakpoint
CREATE TYPE "public"."invoice_kind" AS ENUM('payable', 'receivable');--> statement-breakpoint
CREATE TABLE "bank_transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"current_account_id" text NOT NULL,
	"direction" "bank_transaction_direction" NOT NULL,
	"amount" numeric NOT NULL,
	"currency" text DEFAULT 'RUB' NOT NULL,
	"booked_at" timestamp NOT NULL,
	"value_date" timestamp,
	"description" text,
	"counterparty_name_raw" text,
	"external_id" text,
	"raw_payload" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bank_transaction_account_external_unique" UNIQUE("current_account_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "invoice_kind" NOT NULL,
	"value" numeric NOT NULL,
	"description" text NOT NULL,
	"category_id" text NOT NULL,
	"counterparty_id" text,
	"current_account_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"due_date" timestamp,
	"paid_at" timestamp,
	"archived_at" timestamp,
	"recurring_rule_id" text,
	"recurring_occurrence_at" timestamp,
	"linked_invoice_id" text,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	CONSTRAINT "invoice_recurring_occurrence_unique" UNIQUE("recurring_rule_id","recurring_occurrence_at","kind")
);
--> statement-breakpoint
CREATE TABLE "invoice_tag" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "invoice_tag_unique" UNIQUE("invoice_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "settlement" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"bank_transaction_id" text NOT NULL,
	"amount" numeric NOT NULL,
	"settled_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settlement_invoice_bank_transaction_unique" UNIQUE("invoice_id","bank_transaction_id")
);
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "expense" e
		INNER JOIN "income" i ON i."id" = e."id"
	) THEN
		RAISE EXCEPTION 'Expense and income IDs overlap; invoice migration cannot preserve IDs safely';
	END IF;
END $$;
--> statement-breakpoint
INSERT INTO "invoice" (
	"id",
	"kind",
	"value",
	"description",
	"category_id",
	"counterparty_id",
	"current_account_id",
	"created_at",
	"due_date",
	"paid_at",
	"archived_at",
	"recurring_rule_id",
	"recurring_occurrence_at",
	"created_by",
	"updated_by"
)
SELECT
	"expense"."id",
	'payable'::"invoice_kind",
	"expense"."value",
	"expense"."description",
	"expense"."category_id",
	"expense"."counterparty_id",
	"expense"."current_account_id",
	"expense"."created_at",
	"expense"."due_date",
	"expense"."paid_at",
	"expense"."archived_at",
	"expense"."recurring_rule_id",
	"expense"."recurring_occurrence_at",
	"expense"."created_by",
	"expense"."updated_by"
FROM "expense"
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "invoice" (
	"id",
	"kind",
	"value",
	"description",
	"category_id",
	"counterparty_id",
	"current_account_id",
	"created_at",
	"due_date",
	"paid_at",
	"archived_at",
	"recurring_rule_id",
	"recurring_occurrence_at",
	"linked_invoice_id",
	"created_by",
	"updated_by"
)
SELECT
	"income"."id",
	'receivable'::"invoice_kind",
	"income"."value",
	"income"."description",
	"income"."category_id",
	"income"."counterparty_id",
	"income"."current_account_id",
	"income"."created_at",
	"income"."due_date",
	"income"."paid_at",
	"income"."archived_at",
	"income"."recurring_rule_id",
	"income"."recurring_occurrence_at",
	"income"."linked_expense_id",
	"income"."created_by",
	"income"."updated_by"
FROM "income"
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "invoice_tag" ("id", "invoice_id", "tag_id")
SELECT
	"expense_tag"."id",
	"expense_tag"."expense_id",
	"expense_tag"."tag_id"
FROM "expense_tag"
ON CONFLICT ("invoice_id", "tag_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "invoice_tag" ("id", "invoice_id", "tag_id")
SELECT
	'income-tag:' || "income_tag"."id",
	"income_tag"."income_id",
	"income_tag"."tag_id"
FROM "income_tag"
ON CONFLICT ("invoice_id", "tag_id") DO NOTHING;
--> statement-breakpoint
UPDATE "recurring_rule"
SET "type" = 'payable'
WHERE "type" = 'expense';
--> statement-breakpoint
UPDATE "recurring_rule"
SET "type" = 'receivable'
WHERE "type" = 'income';
--> statement-breakpoint
ALTER TABLE "bank_transaction" ADD CONSTRAINT "bank_transaction_current_account_id_current_account_id_fk" FOREIGN KEY ("current_account_id") REFERENCES "public"."current_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_counterparty_id_counterparty_id_fk" FOREIGN KEY ("counterparty_id") REFERENCES "public"."counterparty"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_current_account_id_current_account_id_fk" FOREIGN KEY ("current_account_id") REFERENCES "public"."current_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_recurring_rule_id_recurring_rule_id_fk" FOREIGN KEY ("recurring_rule_id") REFERENCES "public"."recurring_rule"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_linked_invoice_fk" FOREIGN KEY ("linked_invoice_id") REFERENCES "public"."invoice"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_tag" ADD CONSTRAINT "invoice_tag_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_tag" ADD CONSTRAINT "invoice_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_bank_transaction_id_bank_transaction_id_fk" FOREIGN KEY ("bank_transaction_id") REFERENCES "public"."bank_transaction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bank_transaction_account_idx" ON "bank_transaction" USING btree ("current_account_id");--> statement-breakpoint
CREATE INDEX "invoice_tag_invoice_idx" ON "invoice_tag" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_tag_tag_idx" ON "invoice_tag" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "settlement_invoice_idx" ON "settlement" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "settlement_bank_transaction_idx" ON "settlement" USING btree ("bank_transaction_id");
