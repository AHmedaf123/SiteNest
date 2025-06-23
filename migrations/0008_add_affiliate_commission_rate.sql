-- Migration: Add commission rate field to users table for individual affiliate commission control
-- This allows admins to set custom commission rates for each affiliate

-- Add commission rate field to users table
ALTER TABLE "users" ADD COLUMN "commission_rate" integer DEFAULT 10;

-- Add comment for documentation
COMMENT ON COLUMN "users"."commission_rate" IS 'Individual commission rate percentage for affiliates (0-100), default 10%';

-- Create index for better performance when querying affiliates by commission rate
CREATE INDEX "users_commission_rate_idx" ON "users" ("commission_rate") WHERE "role" = 'affiliate';

-- Update existing affiliate users to have the default commission rate
UPDATE "users" SET "commission_rate" = 10 WHERE "role" = 'affiliate' AND "commission_rate" IS NULL;