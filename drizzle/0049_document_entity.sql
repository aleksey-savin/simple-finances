CREATE TABLE "document" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"uploaded_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_document" (
	"id" text PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"document_id" text NOT NULL,
	CONSTRAINT "contract_document_unique" UNIQUE("contract_id","document_id")
);
--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contract_document" ADD CONSTRAINT "contract_document_contract_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contract"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contract_document" ADD CONSTRAINT "contract_document_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "contract_document_contract_idx" ON "contract_document" USING btree ("contract_id");
--> statement-breakpoint
INSERT INTO "document" ("id", "name", "url", "uploaded_by", "uploaded_at")
  SELECT gen_random_uuid()::text, 'Файл договора', file_url, created_by, now()
  FROM "contract"
  WHERE file_url IS NOT NULL AND file_url <> '';
--> statement-breakpoint
INSERT INTO "contract_document" ("id", "contract_id", "document_id")
  SELECT gen_random_uuid()::text, c.id, d.id
  FROM "contract" c
  JOIN "document" d ON d.url = c.file_url AND d.uploaded_by = c.created_by;
--> statement-breakpoint
ALTER TABLE "contract" DROP COLUMN "file_url";
