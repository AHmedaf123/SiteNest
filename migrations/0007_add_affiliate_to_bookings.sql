-- Migration: Add affiliate tracking columns to bookings table
-- This allows tracking which affiliate referred a booking

-- Add affiliate columns to bookings table
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "affiliate_id" varchar;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "affiliate_name" text;

-- Add foreign key constraint for affiliate_id
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_affiliate_id_users_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add index for better performance on affiliate queries
CREATE INDEX IF NOT EXISTS "bookings_affiliate_id_idx" ON "bookings" ("affiliate_id");

-- Add comments for documentation
COMMENT ON COLUMN "bookings"."affiliate_id" IS 'ID of the affiliate who referred this booking (optional)';
COMMENT ON COLUMN "bookings"."affiliate_name" IS 'Name of the affiliate who referred this booking (optional)';