ALTER TABLE "articles" ADD COLUMN "reviewed_by" varchar(120);
ALTER TABLE "articles" ADD COLUMN "reviewed_at" timestamp with time zone;
ALTER TABLE "articles" ADD COLUMN "price_checked_at" timestamp with time zone;
