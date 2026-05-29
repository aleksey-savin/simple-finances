CREATE TABLE "settlement_scoring" (
	"id" text PRIMARY KEY NOT NULL,
	"settlement_id" text NOT NULL,
	"bank_transaction_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"match_score" integer NOT NULL,
	"top_match_score" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settlement_scoring_settlement_unique" UNIQUE("settlement_id")
);
--> statement-breakpoint
ALTER TABLE "settlement_scoring" ADD CONSTRAINT "settlement_scoring_settlement_id_settlement_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."settlement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_scoring" ADD CONSTRAINT "settlement_scoring_bank_transaction_id_bank_transaction_id_fk" FOREIGN KEY ("bank_transaction_id") REFERENCES "public"."bank_transaction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_scoring" ADD CONSTRAINT "settlement_scoring_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "settlement_scoring_bank_transaction_idx" ON "settlement_scoring" USING btree ("bank_transaction_id");