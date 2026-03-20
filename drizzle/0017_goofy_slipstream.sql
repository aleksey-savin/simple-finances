ALTER TABLE "counterparty" ADD COLUMN "fullName" text;--> statement-breakpoint
ALTER TABLE "counterparty" ADD COLUMN "tin" text;--> statement-breakpoint
ALTER TABLE "counterparty" ADD CONSTRAINT "counterparty_fullName_unique" UNIQUE("fullName");--> statement-breakpoint
ALTER TABLE "counterparty" ADD CONSTRAINT "counterparty_tin_unique" UNIQUE("tin");