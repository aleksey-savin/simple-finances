CREATE TABLE "contact" (
  "id" text PRIMARY KEY NOT NULL,
  "client_id" text NOT NULL REFERENCES "client"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "position" text,
  "phone" text,
  "email" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "contact_client_idx" ON "contact" ("client_id");
