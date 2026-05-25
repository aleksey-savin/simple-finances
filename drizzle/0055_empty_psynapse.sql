CREATE TABLE "account_transfer" (
	"id" text PRIMARY KEY NOT NULL,
	"from_account_id" text NOT NULL,
	"to_account_id" text NOT NULL,
	"amount" numeric NOT NULL,
	"description" text NOT NULL,
	"transferred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contract" ALTER COLUMN "business_line_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "business_line" ADD COLUMN "allow_notifications" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "account_transfer" ADD CONSTRAINT "account_transfer_from_account_id_current_account_id_fk" FOREIGN KEY ("from_account_id") REFERENCES "public"."current_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_transfer" ADD CONSTRAINT "account_transfer_to_account_id_current_account_id_fk" FOREIGN KEY ("to_account_id") REFERENCES "public"."current_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_transfer" ADD CONSTRAINT "account_transfer_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_transfer" ADD CONSTRAINT "account_transfer_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_transfer_from_account_idx" ON "account_transfer" USING btree ("from_account_id");--> statement-breakpoint
CREATE INDEX "account_transfer_to_account_idx" ON "account_transfer" USING btree ("to_account_id");--> statement-breakpoint
CREATE INDEX "account_transfer_transferred_at_idx" ON "account_transfer" USING btree ("transferred_at");