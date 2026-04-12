CREATE TYPE "public"."price_revision_item_status" AS ENUM('draft', 'notified', 'agreed', 'signed', 'success');
--> statement-breakpoint
CREATE TABLE "contract_price_revision" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"business_line_id" text NOT NULL,
	"company_id" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_price_revision_item" (
	"id" text PRIMARY KEY NOT NULL,
	"revision_id" text NOT NULL,
	"contract_id" text NOT NULL,
	"current_amounts" numeric[] NOT NULL,
	"proposed_amounts" numeric[] NOT NULL,
	"included" boolean DEFAULT true NOT NULL,
	"status" "price_revision_item_status" DEFAULT 'draft' NOT NULL,
	"notified_at" timestamp,
	"agreed_at" timestamp,
	"signed_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "price_revision_item_unique" UNIQUE("revision_id","contract_id")
);
--> statement-breakpoint
ALTER TABLE "contract_price_revision" ADD CONSTRAINT "contract_price_revision_business_line_id_business_line_id_fk" FOREIGN KEY ("business_line_id") REFERENCES "public"."business_line"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contract_price_revision" ADD CONSTRAINT "contract_price_revision_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contract_price_revision" ADD CONSTRAINT "contract_price_revision_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contract_price_revision_item" ADD CONSTRAINT "contract_price_revision_item_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."contract_price_revision"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contract_price_revision_item" ADD CONSTRAINT "contract_price_revision_item_contract_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contract"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "price_revision_business_line_idx" ON "contract_price_revision" USING btree ("business_line_id");
--> statement-breakpoint
CREATE INDEX "price_revision_company_idx" ON "contract_price_revision" USING btree ("company_id");
--> statement-breakpoint
CREATE INDEX "price_revision_item_revision_idx" ON "contract_price_revision_item" USING btree ("revision_id");
--> statement-breakpoint
CREATE INDEX "price_revision_item_contract_idx" ON "contract_price_revision_item" USING btree ("contract_id");
