CREATE TABLE "split_participants" (
	"id" text PRIMARY KEY NOT NULL,
	"split_id" text NOT NULL,
	"name" text NOT NULL,
	"share_cents" integer NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"tx_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "splits" (
	"id" text PRIMARY KEY NOT NULL,
	"book_id" text NOT NULL,
	"title" text NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "split_participants" ADD CONSTRAINT "split_participants_split_id_splits_id_fk" FOREIGN KEY ("split_id") REFERENCES "public"."splits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_participants" ADD CONSTRAINT "split_participants_tx_id_transactions_id_fk" FOREIGN KEY ("tx_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "splits" ADD CONSTRAINT "splits_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "splits" ADD CONSTRAINT "splits_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "split_participants_split_idx" ON "split_participants" USING btree ("split_id");--> statement-breakpoint
CREATE INDEX "splits_book_idx" ON "splits" USING btree ("book_id");