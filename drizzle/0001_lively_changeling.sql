DROP INDEX "merchant_rules_book_merchant_uq";--> statement-breakpoint
ALTER TABLE "merchant_rules" ALTER COLUMN "normalized_merchant" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ingest_events" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "merchant_rules" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "external_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_rules_book_external_uq" ON "merchant_rules" USING btree ("book_id","external_id") WHERE external_id is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_rules_book_merchant_uq" ON "merchant_rules" USING btree ("book_id","normalized_merchant") WHERE normalized_merchant is not null;