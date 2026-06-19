ALTER TYPE "public"."tx_source" ADD VALUE 'bank';--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"book_id" text NOT NULL,
	"connection_id" text NOT NULL,
	"account_id" text NOT NULL,
	"name" text,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bank_accounts_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
CREATE TABLE "bank_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"book_id" text NOT NULL,
	"institution_id" text NOT NULL,
	"institution_name" text NOT NULL,
	"requisition_id" text NOT NULL,
	"reference" text NOT NULL,
	"agreement_id" text,
	"status" text DEFAULT 'created' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bank_connections_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_connection_id_bank_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."bank_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_connections" ADD CONSTRAINT "bank_connections_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bank_accounts_book_idx" ON "bank_accounts" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "bank_connections_book_idx" ON "bank_connections" USING btree ("book_id");