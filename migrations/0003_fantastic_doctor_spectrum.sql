CREATE TABLE "affiliate_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"full_name" text NOT NULL,
	"email" varchar NOT NULL,
	"phone" varchar NOT NULL,
	"experience" text,
	"motivation" text,
	"marketing_plan" text,
	"social_media_links" text,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"reviewed_by" varchar,
	"review_notes" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "affiliate_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"affiliate_id" varchar NOT NULL,
	"link_code" varchar NOT NULL,
	"link_url" text NOT NULL,
	"price_adjustment" integer DEFAULT 0 NOT NULL,
	"adjustment_type" varchar DEFAULT 'add' NOT NULL,
	"discount_percentage" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"click_count" integer DEFAULT 0 NOT NULL,
	"conversion_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "affiliate_links_link_code_unique" UNIQUE("link_code")
);
--> statement-breakpoint
CREATE TABLE "affiliate_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"affiliate_id" varchar NOT NULL,
	"link_id" integer,
	"customer_id" varchar,
	"booking_request_id" integer,
	"apartment_id" integer,
	"base_price" integer,
	"final_price" integer,
	"affiliate_earning" integer,
	"commission_rate" integer DEFAULT 10,
	"event_type" varchar NOT NULL,
	"event_data" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" varchar DEFAULT 'customer' NOT NULL;--> statement-breakpoint
ALTER TABLE "affiliate_applications" ADD CONSTRAINT "affiliate_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_applications" ADD CONSTRAINT "affiliate_applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_affiliate_id_users_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_metrics" ADD CONSTRAINT "affiliate_metrics_affiliate_id_users_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_metrics" ADD CONSTRAINT "affiliate_metrics_link_id_affiliate_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."affiliate_links"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_metrics" ADD CONSTRAINT "affiliate_metrics_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_metrics" ADD CONSTRAINT "affiliate_metrics_booking_request_id_booking_requests_id_fk" FOREIGN KEY ("booking_request_id") REFERENCES "public"."booking_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_metrics" ADD CONSTRAINT "affiliate_metrics_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "public"."apartments"("id") ON DELETE no action ON UPDATE no action;