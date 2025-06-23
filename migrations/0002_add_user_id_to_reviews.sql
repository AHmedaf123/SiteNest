-- Migration: Add userId column to reviews table for user ownership tracking
ALTER TABLE "reviews" ADD COLUMN "user_id" varchar;

-- Add foreign key constraint to link reviews to users
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
