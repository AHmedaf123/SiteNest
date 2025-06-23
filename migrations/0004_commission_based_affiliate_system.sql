-- Migration: Commission-based Affiliate System
-- This migration adds new tables and fields for the commission-based affiliate system

-- Add new fields to affiliate_links table for commission-based system
ALTER TABLE "affiliate_links" ADD COLUMN "long_stay_discount_enabled" boolean DEFAULT false;
ALTER TABLE "affiliate_links" ADD COLUMN "long_stay_min_days" integer DEFAULT 5;
ALTER TABLE "affiliate_links" ADD COLUMN "long_stay_discount_type" varchar DEFAULT 'percentage';
ALTER TABLE "affiliate_links" ADD COLUMN "long_stay_discount_value" integer DEFAULT 0;

-- Create affiliate_earnings table for commission tracking
CREATE TABLE "affiliate_earnings" (
	"id" serial PRIMARY KEY NOT NULL,
	"affiliate_id" varchar NOT NULL,
	"booking_id" integer,
	"user_id" varchar NOT NULL,
	"commission_amount" integer NOT NULL,
	"commission_rate" integer DEFAULT 10,
	"base_amount" integer NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"withdrawal_id" integer,
	"withdrawal_date" timestamp,
	"approved_by" varchar,
	"approved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create affiliate_withdrawals table for withdrawal batch management
CREATE TABLE "affiliate_withdrawals" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_name" varchar NOT NULL,
	"withdrawal_type" varchar DEFAULT 'weekly' NOT NULL,
	"total_amount" integer NOT NULL,
	"affiliate_count" integer NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"processed_by" varchar,
	"processed_at" timestamp,
	"payment_method" varchar,
	"payment_reference" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "affiliate_earnings" ADD CONSTRAINT "affiliate_earnings_affiliate_id_users_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "affiliate_earnings" ADD CONSTRAINT "affiliate_earnings_booking_id_booking_requests_id_fk" FOREIGN KEY ("booking_id") REFERENCES "booking_requests"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "affiliate_earnings" ADD CONSTRAINT "affiliate_earnings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "affiliate_earnings" ADD CONSTRAINT "affiliate_earnings_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "affiliate_withdrawals" ADD CONSTRAINT "affiliate_withdrawals_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;

-- Create indexes for better performance
CREATE INDEX "affiliate_earnings_affiliate_id_idx" ON "affiliate_earnings" ("affiliate_id");
CREATE INDEX "affiliate_earnings_status_idx" ON "affiliate_earnings" ("status");
CREATE INDEX "affiliate_earnings_created_at_idx" ON "affiliate_earnings" ("created_at");
CREATE INDEX "affiliate_withdrawals_status_idx" ON "affiliate_withdrawals" ("status");
CREATE INDEX "affiliate_withdrawals_withdrawal_type_idx" ON "affiliate_withdrawals" ("withdrawal_type");

-- Add comments for documentation
COMMENT ON TABLE "affiliate_earnings" IS 'Tracks commission earnings for each affiliate from successful bookings';
COMMENT ON TABLE "affiliate_withdrawals" IS 'Manages withdrawal batches for affiliate commission payments';
COMMENT ON COLUMN "affiliate_earnings"."commission_amount" IS 'Commission amount in PKR (10% of booking amount)';
COMMENT ON COLUMN "affiliate_earnings"."status" IS 'pending, approved, withdrawn';
COMMENT ON COLUMN "affiliate_withdrawals"."withdrawal_type" IS 'weekly or monthly withdrawal schedule';
