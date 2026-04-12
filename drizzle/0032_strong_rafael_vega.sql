CREATE TYPE "public"."contract_type" AS ENUM('customer', 'supplier');
--> statement-breakpoint
CREATE TABLE "business_line" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"number" text NOT NULL,
	"signed_at" date NOT NULL,
	"contract_type" "contract_type" NOT NULL,
	"amount" numeric NOT NULL,
	"business_line_id" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"file_url" text
);
--> statement-breakpoint
ALTER TABLE "business_line" ADD CONSTRAINT "business_line_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contract" ADD CONSTRAINT "contract_business_line_id_business_line_id_fk" FOREIGN KEY ("business_line_id") REFERENCES "public"."business_line"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contract" ADD CONSTRAINT "contract_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "contract_business_line_idx" ON "contract" USING btree ("business_line_id");
