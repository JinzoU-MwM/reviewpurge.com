ALTER TABLE "activity_logs" ADD COLUMN "reason" varchar(50);--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "permission" varchar(80);--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "return_to" varchar(300);--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "retry_after_ms" integer;