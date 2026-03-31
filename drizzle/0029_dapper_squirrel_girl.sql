CREATE TABLE "client" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_counterparty" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"counterparty_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "client_counterparty_unique" UNIQUE("client_id","counterparty_id")
);
--> statement-breakpoint
ALTER TABLE "client" ADD CONSTRAINT "client_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_counterparty" ADD CONSTRAINT "client_counterparty_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_counterparty" ADD CONSTRAINT "client_counterparty_counterparty_id_counterparty_id_fk" FOREIGN KEY ("counterparty_id") REFERENCES "public"."counterparty"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_counterparty_client_idx" ON "client_counterparty" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "client_counterparty_counterparty_idx" ON "client_counterparty" USING btree ("counterparty_id");