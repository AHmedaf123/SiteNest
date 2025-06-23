-- Migration: Add individual affiliate withdrawal requests table
-- This allows affiliates to request withdrawals individually instead of only through admin-managed batches

-- Create affiliate_withdrawal_requests table
CREATE TABLE IF NOT EXISTS "affiliate_withdrawal_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"affiliate_id" varchar NOT NULL,
	"amount" integer NOT NULL,
	"account_number" varchar NOT NULL,
	"account_title" varchar NOT NULL,
	"bank_name" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"admin_notes" text,
	"payment_method" varchar,
	"payment_reference" varchar,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "affiliate_withdrawal_requests" ADD CONSTRAINT "affiliate_withdrawal_requests_affiliate_id_users_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "affiliate_withdrawal_requests" ADD CONSTRAINT "affiliate_withdrawal_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "affiliate_withdrawal_requests_affiliate_id_idx" ON "affiliate_withdrawal_requests" ("affiliate_id");
CREATE INDEX IF NOT EXISTS "affiliate_withdrawal_requests_status_idx" ON "affiliate_withdrawal_requests" ("status");
CREATE INDEX IF NOT EXISTS "affiliate_withdrawal_requests_created_at_idx" ON "affiliate_withdrawal_requests" ("created_at");

-- Add comments for documentation
COMMENT ON TABLE "affiliate_withdrawal_requests" IS 'Individual withdrawal requests from affiliates for their approved commissions';
COMMENT ON COLUMN "affiliate_withdrawal_requests"."amount" IS 'Requested withdrawal amount in PKR';
COMMENT ON COLUMN "affiliate_withdrawal_requests"."status" IS 'pending, approved, rejected, paid';
COMMENT ON COLUMN "affiliate_withdrawal_requests"."account_number" IS 'Bank account number for payment';
COMMENT ON COLUMN "affiliate_withdrawal_requests"."account_title" IS 'Bank account holder name';
COMMENT ON COLUMN "affiliate_withdrawal_requests"."bank_name" IS 'Name of the bank for payment';
