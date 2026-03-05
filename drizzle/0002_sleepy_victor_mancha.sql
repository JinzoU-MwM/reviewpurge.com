CREATE TABLE "affiliate_programs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "affiliate_programs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"product_id" integer NOT NULL,
	"program_name" varchar(100) NOT NULL,
	"region" "region" DEFAULT 'global' NOT NULL,
	"affiliate_url" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_checked_at" timestamp with time zone,
	"last_health_status" varchar(40),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "meta_title" varchar(200);--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "meta_description" varchar(320);--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "og_image_url" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "publish_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "affiliate_programs" ADD CONSTRAINT "affiliate_programs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;