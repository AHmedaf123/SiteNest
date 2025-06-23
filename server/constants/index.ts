/**
 * SiteNest Application Constants
 * Centralized constants for the entire application
 */

/**
 * User Roles and Permissions
 */
export const USER_ROLES = {
  CUSTOMER: 'customer',
  AFFILIATE: 'affiliate', 
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

/**
 * Booking Status Constants
 */
export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const;

export type BookingStatus = typeof BOOKING_STATUS[keyof typeof BOOKING_STATUS];

/**
 * Payment Status Constants
 */
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

/**
 * Authentication Providers
 */
export const AUTH_PROVIDERS = {
  LOCAL: 'local',
  GOOGLE: 'google',
  REPLIT: 'replit',
} as const;

export type AuthProvider = typeof AUTH_PROVIDERS[keyof typeof AUTH_PROVIDERS];

/**
 * Verification Types
 */
export const VERIFICATION_TYPES = {
  EMAIL: 'email',
  PHONE: 'phone',
  WHATSAPP: 'whatsapp',
} as const;

export type VerificationType = typeof VERIFICATION_TYPES[keyof typeof VERIFICATION_TYPES];

/**
 * Chat Session Status
 */
export const CHAT_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
} as const;

export type ChatStatus = typeof CHAT_STATUS[keyof typeof CHAT_STATUS];

/**
 * Affiliate Application Status
 */
export const AFFILIATE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
} as const;

export type AffiliateStatus = typeof AFFILIATE_STATUS[keyof typeof AFFILIATE_STATUS];

/**
 * API Response Status
 */
export const API_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  VALIDATION_ERROR: 'validation_error',
} as const;

/**
 * File Upload Constants
 */
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
} as const;

/**
 * Pagination Constants
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

/**
 * Cache Keys
 */
export const CACHE_KEYS = {
  APARTMENTS: 'apartments',
  REVIEWS: 'reviews',
  USER_SESSION: 'user_session',
  OTP: 'otp',
  BOOKING_AVAILABILITY: 'booking_availability',
} as const;

/**
 * Cache TTL (Time To Live) in seconds
 */
export const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

/**
 * Socket Events
 */
export const SOCKET_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  USER_REGISTERED: 'user_registered',
  BOOKING_CREATED: 'booking_created',
  BOOKING_UPDATED: 'booking_updated',
  REVIEW_ADDED: 'review_added',
  AFFILIATE_METRICS_UPDATE: 'affiliate_metrics_update',
} as const;

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation failed',
  INTERNAL_ERROR: 'Internal server error',
  INVALID_CREDENTIALS: 'Invalid credentials',
  USER_NOT_FOUND: 'User not found',
  APARTMENT_NOT_FOUND: 'Apartment not found',
  BOOKING_NOT_FOUND: 'Booking not found',
  INVALID_OTP: 'Invalid or expired OTP',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  PHONE_ALREADY_EXISTS: 'Phone number already exists',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
} as const;

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  VERIFICATION_SENT: 'Verification code sent',
  VERIFICATION_SUCCESS: 'Verification successful',
  BOOKING_CREATED: 'Booking request created successfully',
  BOOKING_UPDATED: 'Booking updated successfully',
  REVIEW_ADDED: 'Review added successfully',
  APARTMENT_CREATED: 'Apartment created successfully',
  APARTMENT_UPDATED: 'Apartment updated successfully',
} as const;

/**
 * Regular Expressions for Validation
 */
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_PK: /^(\+92|0)?[0-9]{10}$/,
  CNIC: /^[0-9]{5}-[0-9]{7}-[0-9]$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  ROOM_NUMBER: /^[A-Z0-9]{1,10}$/,
} as const;

/**
 * Default Values
 */
export const DEFAULTS = {
  PROFILE_IMAGE: '/api/uploads/default-avatar.png',
  APARTMENT_IMAGE: '/api/uploads/default-apartment.jpg',
  CURRENCY: 'PKR',
  COUNTRY: 'Pakistan',
  TIMEZONE: 'Asia/Karachi',
  LANGUAGE: 'en',
} as const;

/**
 * Business Hours
 */
export const BUSINESS_HOURS = {
  OPEN: 9, // 9 AM
  CLOSE: 21, // 9 PM
  TIMEZONE: 'Asia/Karachi',
} as const;

/**
 * Notification Types
 */
export const NOTIFICATION_TYPES = {
  EMAIL: 'email',
  SMS: 'sms',
  WHATSAPP: 'whatsapp',
  PUSH: 'push',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];
