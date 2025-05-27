import { pgTable, text, serial, integer, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const apartments = pgTable("apartments", {
  id: serial("id").primaryKey(),
  roomNumber: text("room_number").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // price per night in dollars
  bedrooms: integer("bedrooms").notNull(),
  imageUrl: text("image_url").notNull(),
  amenities: text("amenities").array(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  cnic: text("cnic").notNull(),
  isVerified: boolean("is_verified").notNull().default(false),
  verificationPin: text("verification_pin"),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  apartmentId: integer("apartment_id").notNull(),
  customerId: integer("customer_id").notNull(),
  checkIn: date("check_in").notNull(),
  checkOut: date("check_out").notNull(),
  status: text("status").notNull(), // booked, pending, cancelled
  paymentStatus: text("payment_status").notNull(), // paid, pending, unpaid
  hostName: text("host_name").notNull(),
  totalAmount: integer("total_amount").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  rating: integer("rating").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url").notNull(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  customerId: integer("customer_id"),
  currentStep: integer("current_step").notNull().default(0),
  data: text("data"), // JSON string for storing collected data
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertApartmentSchema = createInsertSchema(apartments).omit({
  id: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  isVerified: true,
  verificationPin: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
});

// Types
export type Apartment = typeof apartments.$inferSelect;
export type InsertApartment = z.infer<typeof insertApartmentSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
