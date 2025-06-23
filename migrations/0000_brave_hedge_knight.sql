CREATE TABLE "apartments" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_number" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"price" integer NOT NULL,
	"discount_percentage" integer DEFAULT 0,
	"bedrooms" integer NOT NULL,
	"bathrooms" integer NOT NULL,
	"square_feet" integer NOT NULL,
	"image_url" text NOT NULL,
	"images" text[],
	"video_url" text,
	"amenities" text[],
	CONSTRAINT "apartments_room_number_unique" UNIQUE("room_number")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"apartment_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"status" text NOT NULL,
	"payment_status" text NOT NULL,
	"host_name" text NOT NULL,
	"total_amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"customer_id" integer,
	"current_step" integer DEFAULT 0 NOT NULL,
	"data" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chat_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"cnic" text NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verification_pin" text
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"apartment_id" integer,
	"customer_name" text NOT NULL,
	"rating" integer NOT NULL,
	"content" text NOT NULL,
	"image_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "public"."apartments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");