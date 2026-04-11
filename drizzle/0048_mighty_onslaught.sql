CREATE TABLE "client_manager" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "client_manager_unique" UNIQUE("client_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "client_manager" ADD CONSTRAINT "client_manager_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_manager" ADD CONSTRAINT "client_manager_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_manager_client_idx" ON "client_manager" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "client_manager_user_idx" ON "client_manager" USING btree ("user_id");