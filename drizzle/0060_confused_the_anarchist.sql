CREATE TABLE "contract_price_revision_bulk_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"revision_id" text NOT NULL,
	"action_label" text NOT NULL,
	"items" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contract_price_revision_bulk_snapshot_revision_id_unique" UNIQUE("revision_id")
);
--> statement-breakpoint
ALTER TABLE "contract_price_revision" ADD COLUMN "started_at" timestamp;--> statement-breakpoint
UPDATE "contract_price_revision" SET "started_at" = "created_at" WHERE "started_at" IS NULL;--> statement-breakpoint
ALTER TABLE "contract_price_revision_bulk_snapshot" ADD CONSTRAINT "contract_price_revision_bulk_snapshot_revision_id_contract_price_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."contract_price_revision"("id") ON DELETE cascade ON UPDATE no action;