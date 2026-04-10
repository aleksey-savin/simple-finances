ALTER TABLE "contract" ALTER COLUMN "number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contract" ALTER COLUMN "signed_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contract" ALTER COLUMN "contract_type" SET DEFAULT 'customer';