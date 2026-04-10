ALTER TABLE "contract" ALTER COLUMN "amount" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "contract" ADD COLUMN "counterparty_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "contract" ADD CONSTRAINT "contract_counterparty_id_counterparty_id_fk" FOREIGN KEY ("counterparty_id") REFERENCES "public"."counterparty"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contract_counterparty_idx" ON "contract" USING btree ("counterparty_id");