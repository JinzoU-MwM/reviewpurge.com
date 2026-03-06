ALTER TABLE "products" ADD COLUMN "is_purged" boolean DEFAULT false NOT NULL;
ALTER TABLE "products" ADD COLUMN "purge_reason" text;
