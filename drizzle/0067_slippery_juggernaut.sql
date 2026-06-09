ALTER TABLE "task" ADD COLUMN "due_date" timestamp;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "source_favourite_id" text;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_source_favourite_id_task_id_fk" FOREIGN KEY ("source_favourite_id") REFERENCES "public"."task"("id") ON DELETE set null ON UPDATE no action;