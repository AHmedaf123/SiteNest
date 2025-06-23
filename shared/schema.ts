import { pgTable, text, serial, integer, boolean, date, timestamp, varchar, jsonb, index, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const apartments = pgTable("apartments", {
  id: serial("id").primaryKey(),
  roomNumber: text("room_number").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // price per night in PKR
  discountPercentage: integer("discount_percentage").default(0), // discount percentage (0-100)
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: integer("bathrooms").notNull(),
  squareFeet: integer("square_feet").notNull(),
  imageUrl: text("image_url").notNull(), // Main image for backward compatibility
  images: text("images").array(), // Multiple images
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
  affiliateId: varchar("affiliate_id"), // Optional: set if booking is from affiliate
  affiliateName: text("affiliate_name"), // Optional: set if booking is from affiliate
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  apartmentId: integer("apartment_id").references(() => apartments.id),
  userId: varchar("user_id").references(() => users.id), // Link reviews to users for ownership
  customerName: text("customer_name").notNull(),
  rating: integer("rating").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enhanced User storage table for SiteNest authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // New fields for SiteNest
  passwordHash: varchar("password_hash"), // For email/password auth
  cnic: varchar("cnic", { length: 13 }),
  phone: varchar("phone"),
  country: varchar("country").default("Pakistan"),
  address: text("address"),
  // Role-based access control
  role: varchar("role").notNull().default("customer"), // 'customer', 'affiliate', 'admin', 'super_admin'
  // Verification fields
  isEmailVerified: boolean("is_email_verified").default(false),
  isPhoneVerified: boolean("is_phone_verified").default(false),
  emailVerificationToken: varchar("email_verification_token"),
  phoneVerificationToken: varchar("phone_verification_token"),
  // OAuth fields
  googleId: varchar("google_id"),
  authProvider: varchar("auth_provider").default("email"), // 'email', 'google', 'replit'
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  customerId: integer("customer_id"),
  currentStep: integer("current_step").notNull().default(0),
  data: text("data"), // JSON string for storing collected data
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Enhanced chatbot tables for intelligent VA
export const chatConversations = pgTable("chat_conversations", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  messageId: text("message_id").notNull().unique(),
  role: text("role").notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  intent: text("intent"), // detected intent
  entities: jsonb("entities"), // extracted entities
  confidence: real("confidence"), // AI confidence score
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const chatIntents = pgTable("chat_intents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  patterns: text("patterns").array(), // training patterns
  responses: text("responses").array(), // possible responses
  actions: text("actions").array(), // actions to trigger
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatAnalytics = pgTable("chat_analytics", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: text("user_id"),
  conversationLength: integer("conversation_length"),
  intentsSatisfied: text("intents_satisfied").array(),
  bookingCompleted: boolean("booking_completed").default(false),
  satisfactionScore: integer("satisfaction_score"), // 1-5
  feedbackText: text("feedback_text"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// New table for 45-minute reservations
export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  apartmentId: integer("apartment_id").notNull().references(() => apartments.id),
  checkIn: timestamp("check_in").notNull(),
  checkOut: timestamp("check_out").notNull(),
  status: text("status").notNull().default("active"), // active, expired, confirmed, cancelled
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// New table for booking requests
export const bookingRequests = pgTable("booking_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  apartmentId: integer("apartment_id").notNull().references(() => apartments.id),
  roomNumber: text("room_number").notNull(),
  checkIn: timestamp("check_in").notNull(),
  checkOut: timestamp("check_out").notNull(),
  // Guest details collected by chatbot
  guestCount: integer("guest_count"),
  arrivalTime: text("arrival_time"),
  needsParking: boolean("needs_parking").default(false),
  hasPets: boolean("has_pets").default(false),
  mealPreferences: text("meal_preferences"),
  // Payment and confirmation
  confirmationAmount: integer("confirmation_amount"), // Amount in PKR
  paymentReceived: boolean("payment_received").default(false),
  paymentScreenshot: text("payment_screenshot"), // Path to uploaded screenshot
  whatsappConfirmed: boolean("whatsapp_confirmed").default(false),
  // Affiliate tracking
  affiliateId: varchar("affiliate_id"), // Optional: set if booking request is from affiliate
  affiliateName: text("affiliate_name"), // Optional: set if booking request is from affiliate
  // Status tracking
  status: text("status").notNull().default("pending"), // pending, confirmed, cancelled
  adminNotes: text("admin_notes"),
  // Timestamps
  requestDate: timestamp("request_date").notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Affiliate Applications table
export const affiliateApplications = pgTable("affiliate_applications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  // Application details
  fullName: text("full_name").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone").notNull(),
  experience: text("experience"), // Previous marketing/sales experience
  motivation: text("motivation"), // Why they want to become an affiliate
  marketingPlan: text("marketing_plan"), // How they plan to promote SiteNest
  socialMediaLinks: text("social_media_links"), // JSON string of social media profiles
  // Application status
  status: varchar("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  reviewedBy: varchar("reviewed_by").references(() => users.id), // Admin who reviewed
  reviewNotes: text("review_notes"), // Admin notes
  reviewedAt: timestamp("reviewed_at"),
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Affiliate Links table
export const affiliateLinks = pgTable("affiliate_links", {
  id: serial("id").primaryKey(),
  affiliateId: varchar("affiliate_id").notNull().references(() => users.id),
  // Link details
  linkCode: varchar("link_code").notNull().unique(), // Unique identifier for the link
  linkUrl: text("link_url").notNull(), // Full URL with tracking parameters

  // NEW COMMISSION-BASED SYSTEM
  // Long-stay discount options (optional)
  longStayDiscountEnabled: boolean("long_stay_discount_enabled").default(false),
  longStayMinDays: integer("long_stay_min_days").default(5), // Minimum days for discount eligibility
  longStayDiscountType: varchar("long_stay_discount_type").default("percentage"), // 'percentage' or 'flat'
  longStayDiscountValue: integer("long_stay_discount_value").default(0), // Percentage or flat amount

  // LEGACY FIELDS (kept for backward compatibility - will be deprecated)
  priceAdjustment: integer("price_adjustment").default(0), // Amount to add/subtract from base price (in PKR)
  adjustmentType: varchar("adjustment_type").default("add"), // 'add', 'subtract', 'percentage'
  discountPercentage: integer("discount_percentage"), // If using percentage-based discount
  additionalAmount: integer("additional_amount").default(0), // Additional amount to add (in PKR)
  additionalDiscount: integer("additional_discount").default(0), // Additional discount percentage
  // Link settings
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"), // Optional expiration date
  // Tracking
  clickCount: integer("click_count").notNull().default(0),
  conversionCount: integer("conversion_count").notNull().default(0),
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Affiliate Metrics table
export const affiliateMetrics = pgTable("affiliate_metrics", {
  id: serial("id").primaryKey(),
  affiliateId: varchar("affiliate_id").notNull().references(() => users.id),
  linkId: integer("link_id").references(() => affiliateLinks.id),
  // Customer tracking
  customerId: varchar("customer_id").references(() => users.id), // Customer who registered through affiliate link
  // Booking tracking
  bookingRequestId: integer("booking_request_id").references(() => bookingRequests.id),
  apartmentId: integer("apartment_id").references(() => apartments.id),
  // Revenue tracking
  basePrice: integer("base_price"), // Original apartment price
  finalPrice: integer("final_price"), // Price after affiliate adjustments
  affiliateEarning: integer("affiliate_earning"), // Commission earned by affiliate
  commissionRate: integer("commission_rate").default(10), // Commission percentage
  // Event tracking
  eventType: varchar("event_type").notNull(), // 'click', 'registration', 'booking', 'payment'
  eventData: text("event_data"), // JSON string for additional event data
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// New Affiliate Earnings table for commission tracking
export const affiliateEarnings = pgTable("affiliate_earnings", {
  id: serial("id").primaryKey(),
  affiliateId: varchar("affiliate_id").notNull().references(() => users.id),
  bookingId: integer("booking_id").references(() => bookingRequests.id),
  userId: varchar("user_id").notNull().references(() => users.id), // Customer who made the booking
  commissionAmount: integer("commission_amount").notNull(), // Commission in PKR
  commissionRate: integer("commission_rate").default(10), // Commission percentage (default 10%)
  baseAmount: integer("base_amount").notNull(), // Original booking amount
  status: varchar("status").notNull().default("pending"), // 'pending', 'approved', 'withdrawn'
  // Withdrawal tracking
  withdrawalId: integer("withdrawal_id"), // Reference to withdrawal batch
  withdrawalDate: timestamp("withdrawal_date"),
  // Admin tracking
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"), // Admin notes
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Affiliate Withdrawal Batches table
export const affiliateWithdrawals = pgTable("affiliate_withdrawals", {
  id: serial("id").primaryKey(),
  batchName: varchar("batch_name").notNull(), // e.g., "Weekly Batch - Jan 2024 Week 1"
  withdrawalType: varchar("withdrawal_type").notNull().default("weekly"), // 'weekly', 'monthly'
  totalAmount: integer("total_amount").notNull(), // Total amount in this batch
  affiliateCount: integer("affiliate_count").notNull(), // Number of affiliates in this batch
  status: varchar("status").notNull().default("pending"), // 'pending', 'processing', 'completed'
  // Processing details
  processedBy: varchar("processed_by").references(() => users.id),
  processedAt: timestamp("processed_at"),
  paymentMethod: varchar("payment_method"), // 'bank_transfer', 'easypaisa', 'jazzcash'
  paymentReference: varchar("payment_reference"), // Transaction reference
  notes: text("notes"),
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Individual Affiliate Withdrawal Requests table
export const affiliateWithdrawalRequests = pgTable("affiliate_withdrawal_requests", {
  id: serial("id").primaryKey(),
  affiliateId: varchar("affiliate_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(), // Requested withdrawal amount in PKR
  // Bank details
  accountNumber: varchar("account_number").notNull(),
  accountTitle: varchar("account_title").notNull(),
  bankName: varchar("bank_name").notNull(),
  // Status tracking
  status: varchar("status").notNull().default("pending"), // 'pending', 'approved', 'rejected', 'paid'
  // Admin processing
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  adminNotes: text("admin_notes"),
  // Payment tracking
  paymentMethod: varchar("payment_method"), // 'bank_transfer', 'easypaisa', 'jazzcash'
  paymentReference: varchar("payment_reference"),
  paidAt: timestamp("paid_at"),
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Enhanced validation schemas with Zod
const PhoneRegex = /^(\+92|0)?[0-9]{10,11}$/; // Pakistani phone numbers: +92xxxxxxxxxx, 0xxxxxxxxx, or xxxxxxxxxx
const CNICRegex = /^\d{13}$/;

export const apartmentValidation = z.object({
  roomNumber: z.string().min(1, "Room number is required"),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.number().positive("Price must be positive"),
  discountPercentage: z.number().int().min(0).max(100).optional(),
  bedrooms: z.number().int().positive("Number of bedrooms must be positive"),
  bathrooms: z.number().int().positive("Number of bathrooms must be positive"),
  squareFeet: z.number().int().positive("Square feet must be positive"),
  imageUrl: z.string().optional(), // Made optional for file uploads
  images: z.array(z.string()).optional(), // Removed URL validation for file paths
  amenities: z.array(z.string())
});

export const customerValidation = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().regex(PhoneRegex, "Invalid phone number format"),
  cnic: z.string().regex(CNICRegex, "Invalid CNIC format"),
});

// User authentication validation schemas
export const signupValidation = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  cnic: z.string().regex(CNICRegex, "Invalid CNIC format"),
  phone: z.string().regex(PhoneRegex, "Invalid phone number format"),
  country: z.string().min(2, "Country is required"),
  address: z.string().min(5, "Address must be at least 5 characters"),
});

export const loginValidation = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const profileUpdateValidation = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").optional(),
  lastName: z.string().min(2, "Last name must be at least 2 characters").optional(),
  cnic: z.string().regex(CNICRegex, "Invalid CNIC format").optional(),
  phone: z.string().regex(PhoneRegex, "Invalid phone number format").optional(),
  country: z.string().min(2, "Country is required").optional(),
  address: z.string().min(5, "Address must be at least 5 characters").optional(),
});

export const passwordChangeValidation = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const verificationValidation = z.object({
  token: z.string().length(6, "Verification code must be 6 digits"),
});

export const bookingValidation = z.object({
  apartmentId: z.number().int().positive(),
  customerId: z.number().int().positive(),
  checkIn: z.string().refine((date) => {
    const checkInDate = new Date(date);
    const now = new Date();
    return checkInDate >= now;
  }, "Check-in date must be in the future"),
  checkOut: z.string().refine((date) => {
    const checkOutDate = new Date(date);
    const now = new Date();
    return checkOutDate > now;
  }, "Check-out date must be in the future"),
  status: z.enum(["booked", "pending", "cancelled"]),
  paymentStatus: z.enum(["paid", "pending", "unpaid"]),
  hostName: z.string().min(2, "Host name must be at least 2 characters"),
  totalAmount: z.number().positive("Total amount must be positive")
}).refine((data) => {
  const checkInDate = new Date(data.checkIn);
  const checkOutDate = new Date(data.checkOut);
  return checkOutDate > checkInDate;
}, {
  message: "Check-out date must be after check-in date",
  path: ["checkOut"]
});

export const bookingRequestValidation = z.object({
  userId: z.string().min(1, "User ID is required"),
  apartmentId: z.number().int().positive("Apartment ID must be positive"),
  roomNumber: z.string().min(1, "Room number is required"),
  checkIn: z.string().refine((date) => {
    const checkInDate = new Date(date);
    const now = new Date();
    // Allow bookings for today if the time is in the future, or any future date
    return checkInDate >= now || (
      checkInDate.toDateString() === now.toDateString() &&
      checkInDate.getTime() > now.getTime()
    );
  }, "Check-in date and time must be in the future"),
  checkOut: z.string().refine((date) => {
    const checkOutDate = new Date(date);
    const now = new Date();
    return checkOutDate > now;
  }, "Check-out date and time must be in the future"),
  guestCount: z.number().int().positive("Guest count must be positive").optional(),
  arrivalTime: z.string().optional(),
  needsParking: z.boolean().optional(),
  hasPets: z.boolean().optional(),
  mealPreferences: z.string().optional(),
  confirmationAmount: z.number().int().min(500).max(2000).optional(),
  paymentReceived: z.boolean().optional(),
  whatsappConfirmed: z.boolean().optional(),
  status: z.enum(["pending", "confirmed", "cancelled"]).optional(),
  adminNotes: z.string().optional()
}).refine((data) => {
  const checkInDate = new Date(data.checkIn);
  const checkOutDate = new Date(data.checkOut);
  return checkOutDate > checkInDate;
}, {
  message: "Check-out date must be after check-in date",
  path: ["checkOut"]
});

// Insert schemas
export const insertApartmentSchema = createInsertSchema(apartments).omit({
  id: true
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

export const insertBookingRequestSchema = createInsertSchema(bookingRequests).omit({
  id: true,
  requestDate: true,
  createdAt: true,
}).partial({
  guestCount: true,
  arrivalTime: true,
  needsParking: true,
  hasPets: true,
  mealPreferences: true,
  confirmationAmount: true,
  paymentReceived: true,
  paymentScreenshot: true,
  whatsappConfirmed: true,
  adminNotes: true,
  confirmedAt: true,
  status: true, // Make status optional since it has a default value
}).extend({
  // Override checkIn and checkOut to accept strings and transform them to Date objects
  checkIn: z.string().transform((str) => new Date(str)),
  checkOut: z.string().transform((str) => new Date(str)),
});

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

// Affiliate schemas
export const insertAffiliateApplicationSchema = createInsertSchema(affiliateApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reviewedBy: true,
  reviewedAt: true,
});

export const insertAffiliateLinkSchema = createInsertSchema(affiliateLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  linkUrl: true,
  clickCount: true,
  conversionCount: true,
});

export const insertAffiliateMetricSchema = createInsertSchema(affiliateMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertAffiliateEarningSchema = createInsertSchema(affiliateEarnings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAffiliateWithdrawalSchema = createInsertSchema(affiliateWithdrawals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAffiliateWithdrawalRequestSchema = createInsertSchema(affiliateWithdrawalRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Affiliate Application validation
export const affiliateApplicationValidation = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(PhoneRegex, "Invalid Pakistani phone number"),
  experience: z.string().min(10, "Please provide details about your experience"),
  motivation: z.string().min(20, "Please explain your motivation in detail"),
  marketingPlan: z.string().min(30, "Please describe your marketing plan"),
  socialMediaLinks: z.string().optional()
});

// Affiliate Link validation (NEW COMMISSION-BASED SYSTEM)
export const affiliateLinkValidation = z.object({
  // New commission-based fields
  longStayDiscountEnabled: z.boolean().optional(),
  longStayMinDays: z.number().int().min(1).max(365).optional(),
  longStayDiscountType: z.enum(["percentage", "flat"]).optional(),
  longStayDiscountValue: z.number().int().min(0).optional(),

  // Legacy fields (kept for backward compatibility)
  priceAdjustment: z.number().int().optional(),
  adjustmentType: z.enum(["add", "subtract", "percentage"]).optional(),
  discountPercentage: z.number().int().min(0).max(100).optional(),
  additionalAmount: z.number().int().min(0).optional(),
  additionalDiscount: z.number().int().min(0).max(100).optional(),
  expiresAt: z.string().optional() // ISO date string
}).refine((data) => {
  // If long stay discount is enabled, validate the discount value
  if (data.longStayDiscountEnabled) {
    if (data.longStayDiscountType === "percentage") {
      return data.longStayDiscountValue && data.longStayDiscountValue > 0 && data.longStayDiscountValue <= 50;
    } else if (data.longStayDiscountType === "flat") {
      return data.longStayDiscountValue && data.longStayDiscountValue > 0;
    }
  }
  return true;
}, {
  message: "Invalid discount value for long stay discount",
  path: ["longStayDiscountValue"]
});

// Withdrawal request validation
export const withdrawalRequestValidation = z.object({
  amount: z.number().int().min(1000, "Minimum withdrawal amount is 1000 PKR"),
  accountNumber: z.string().min(5, "Account number must be at least 5 characters"),
  accountTitle: z.string().min(2, "Account title must be at least 2 characters"),
  bankName: z.string().min(2, "Bank name must be at least 2 characters"),
});

// Role validation
export const roleValidation = z.enum(["customer", "affiliate", "admin", "super_admin"]);

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

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = typeof reservations.$inferInsert;

export type BookingRequest = typeof bookingRequests.$inferSelect;
export type InsertBookingRequest = z.infer<typeof insertBookingRequestSchema>;

export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

// Authentication types
export type SignupData = z.infer<typeof signupValidation>;
export type LoginData = z.infer<typeof loginValidation>;
export type ProfileUpdateData = z.infer<typeof profileUpdateValidation>;
export type PasswordChangeData = z.infer<typeof passwordChangeValidation>;
export type VerificationData = z.infer<typeof verificationValidation>;

// Booking request types
export type BookingRequestData = z.infer<typeof bookingRequestValidation>;

// Affiliate types
export type AffiliateApplication = typeof affiliateApplications.$inferSelect;
export type InsertAffiliateApplication = z.infer<typeof insertAffiliateApplicationSchema>;
export type AffiliateApplicationData = z.infer<typeof affiliateApplicationValidation>;

export type AffiliateLink = typeof affiliateLinks.$inferSelect;
export type InsertAffiliateLink = z.infer<typeof insertAffiliateLinkSchema>;
export type AffiliateLinkData = z.infer<typeof affiliateLinkValidation>;

export type AffiliateMetric = typeof affiliateMetrics.$inferSelect;
export type InsertAffiliateMetric = z.infer<typeof insertAffiliateMetricSchema>;

export type AffiliateEarning = typeof affiliateEarnings.$inferSelect;
export type InsertAffiliateEarning = z.infer<typeof insertAffiliateEarningSchema>;

export type AffiliateWithdrawal = typeof affiliateWithdrawals.$inferSelect;
export type InsertAffiliateWithdrawal = z.infer<typeof insertAffiliateWithdrawalSchema>;

export type AffiliateWithdrawalRequest = typeof affiliateWithdrawalRequests.$inferSelect;
export type InsertAffiliateWithdrawalRequest = z.infer<typeof insertAffiliateWithdrawalRequestSchema>;
export type WithdrawalRequestData = z.infer<typeof withdrawalRequestValidation>;

export type UserRole = z.infer<typeof roleValidation>;

// Booking interface
// Removed duplicate interface Booking to avoid conflict with exported type Booking above.
