CREATE TABLE "booking_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"apartment_id" integer NOT NULL,
	"room_number" text NOT NULL,
	"check_in" timestamp NOT NULL,
	"check_out" timestamp NOT NULL,
	"guest_count" integer,
	"arrival_time" text,
	"needs_parking" boolean DEFAULT false,
	"has_pets" boolean DEFAULT false,
	"meal_preferences" text,
	"confirmation_amount" integer,
	"payment_received" boolean DEFAULT false,
	"payment_screenshot" text,
	"whatsapp_confirmed" boolean DEFAULT false,
	"status" text DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"request_date" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "user_id" varchar;--> statement-breakpoint
ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "public"."apartments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;