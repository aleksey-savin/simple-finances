CREATE TYPE "public"."vm_type" AS ENUM('qemu', 'lxc');--> statement-breakpoint
CREATE TABLE "contract_vm" (
	"id" text PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"proxmox_node_id" text NOT NULL,
	"vmid" integer NOT NULL,
	"vm_type" "vm_type" NOT NULL,
	"name" text NOT NULL,
	"paused_until" timestamp,
	"is_paused_by_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contract_vm_node_vmid_unique" UNIQUE("proxmox_node_id","vmid")
);
--> statement-breakpoint
CREATE TABLE "invoice_reminder_log" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"to_email" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proxmox_account_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"current_account_id" text NOT NULL,
	"reminder_days_before" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "proxmox_account_settings_unique" UNIQUE("current_account_id")
);
--> statement-breakpoint
CREATE TABLE "proxmox_node" (
	"id" text PRIMARY KEY NOT NULL,
	"current_account_id" text NOT NULL,
	"name" text NOT NULL,
	"host" text NOT NULL,
	"port" integer DEFAULT 8006 NOT NULL,
	"token_id" text NOT NULL,
	"token_secret" text NOT NULL,
	"verify_ssl" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "contract_id" text;--> statement-breakpoint
ALTER TABLE "recurring_rule" ADD COLUMN "contract_id" text;--> statement-breakpoint
ALTER TABLE "contract_vm" ADD CONSTRAINT "contract_vm_contract_id_contract_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contract"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_vm" ADD CONSTRAINT "contract_vm_proxmox_node_id_proxmox_node_id_fk" FOREIGN KEY ("proxmox_node_id") REFERENCES "public"."proxmox_node"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_reminder_log" ADD CONSTRAINT "invoice_reminder_log_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proxmox_account_settings" ADD CONSTRAINT "proxmox_account_settings_current_account_id_current_account_id_fk" FOREIGN KEY ("current_account_id") REFERENCES "public"."current_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proxmox_node" ADD CONSTRAINT "proxmox_node_current_account_id_current_account_id_fk" FOREIGN KEY ("current_account_id") REFERENCES "public"."current_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contract_vm_contract_idx" ON "contract_vm" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "contract_vm_node_idx" ON "contract_vm" USING btree ("proxmox_node_id");--> statement-breakpoint
CREATE INDEX "invoice_reminder_log_invoice_idx" ON "invoice_reminder_log" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "proxmox_node_account_idx" ON "proxmox_node" USING btree ("current_account_id");--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_contract_id_contract_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contract"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_rule" ADD CONSTRAINT "recurring_rule_contract_id_contract_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contract"("id") ON DELETE set null ON UPDATE no action;