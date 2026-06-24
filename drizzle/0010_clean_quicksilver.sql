CREATE TABLE "bank_dismissed" (
	"id" text PRIMARY KEY NOT NULL,
	"book_id" text NOT NULL,
	"external_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_dismissed" ADD CONSTRAINT "bank_dismissed_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bank_dismissed_book_ext_uq" ON "bank_dismissed" USING btree ("book_id","external_id");