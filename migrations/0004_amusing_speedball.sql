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
--> statement-breakpoint
CREATE TABLE "affiliate_withdrawal_requests" (
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "chat_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"user_id" text,
	"conversation_length" integer,
	"intents_satisfied" text[],
	"booking_completed" boolean DEFAULT false,
	"satisfaction_score" integer,
	"feedback_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"message_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"intent" text,
	"entities" jsonb,
	"confidence" integer,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chat_conversations_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "chat_intents" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"patterns" text[],
	"responses" text[],
	"actions" text[],
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chat_intents_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "affiliate_links" ALTER COLUMN "price_adjustment" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "affiliate_links" ALTER COLUMN "adjustment_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD COLUMN "long_stay_discount_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD COLUMN "long_stay_min_days" integer DEFAULT 5;--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD COLUMN "long_stay_discount_type" varchar DEFAULT 'percentage';--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD COLUMN "long_stay_discount_value" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD COLUMN "additional_amount" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD COLUMN "additional_discount" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "affiliate_earnings" ADD CONSTRAINT "affiliate_earnings_affiliate_id_users_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_earnings" ADD CONSTRAINT "affiliate_earnings_booking_id_booking_requests_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."booking_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_earnings" ADD CONSTRAINT "affiliate_earnings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_earnings" ADD CONSTRAINT "affiliate_earnings_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_withdrawal_requests" ADD CONSTRAINT "affiliate_withdrawal_requests_affiliate_id_users_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_withdrawal_requests" ADD CONSTRAINT "affiliate_withdrawal_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_withdrawals" ADD CONSTRAINT "affiliate_withdrawals_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;