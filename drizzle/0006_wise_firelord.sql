ALTER TABLE "splits" ADD COLUMN "category_id" text;--> statement-breakpoint
ALTER TABLE "splits" ADD COLUMN "subcategory_id" text;--> statement-breakpoint
ALTER TABLE "splits" ADD CONSTRAINT "splits_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "splits" ADD CONSTRAINT "splits_subcategory_id_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE set null ON UPDATE no action;