CREATE TABLE "contract_amount_history" (
	"id" text PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"previous_amounts" numeric[] NOT NULL,
	"new_amounts" numeric[] NOT NULL,
	"revision_item_id" text,
	"changed_by" text NOT NULL,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contract_amount_history" ADD CONSTRAINT "contract_amount_history_contract_id_contract_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contract"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_amount_history" ADD CONSTRAINT "contract_amount_history_changed_by_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contract_amount_history_contract_idx" ON "contract_amount_history" USING btree ("contract_id");