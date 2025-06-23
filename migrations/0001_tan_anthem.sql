ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "cnic" varchar(13);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "country" varchar DEFAULT 'Pakistan';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_email_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_phone_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_token" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_verification_token" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_id" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_provider" varchar DEFAULT 'email';--> statement-breakpoint
ALTER TABLE "apartments" DROP COLUMN "video_url";