/**
 * SiteNest Configuration Management
 * Centralized configuration for all environment variables and constants
 */

import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Database Configuration
 */
export const DATABASE_CONFIG = {
  url: process.env.DATABASE_URL,
  testUrl: process.env.TEST_DATABASE_URL,
} as const;

/**
 * Server Configuration
 */
export const SERVER_CONFIG = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 5000,
  host: process.env.HOST || 'localhost',
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET || 'sitenest-default-secret-change-in-production',
} as const;

/**
 * Authentication Configuration
 */
export const AUTH_CONFIG = {
  jwt: {
    secret: process.env.JWT_SECRET || 'sitenest-jwt-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/auth/google/callback',
  },
  otp: {
    expiryMinutes: 10,
    length: 6,
  },
} as const;

/**
 * Email Configuration
 */
export const EMAIL_CONFIG = {
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASSWORD,
  service: 'gmail',
  from: process.env.EMAIL_FROM || 'noreply@sitenest.com',
} as const;

/**
 * Twilio/WhatsApp Configuration
 */
export const TWILIO_CONFIG = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  phoneNumber: process.env.TWILIO_PHONE_NUMBER || '+14155238886',
  sandboxKeyword: 'join sitenest',
} as const;

/**
 * OpenAI Configuration
 */
export const OPENAI_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-3.5-turbo',
  maxTokens: 500,
  temperature: 0.7,
} as const;

/**
 * File Upload Configuration
 */
export const UPLOAD_CONFIG = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  uploadDir: 'uploads',
  profileDir: 'uploads/profiles',
  apartmentDir: 'uploads/apartments',
} as const;

/**
 * Rate Limiting Configuration
 */
export const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // limit each IP to 100 requests per windowMs
  authWindowMs: 15 * 60 * 1000, // 15 minutes for auth endpoints
  authMaxRequests: 5, // limit auth attempts
} as const;

/**
 * Business Configuration
 */
export const BUSINESS_CONFIG = {
  name: 'SiteNest',
  tagline: 'Where Luxury Isn\'t Just Lived — It\'s Experienced',
  location: {
    address: 'Cube Apartments Tower 2, Bahria Enclave Sector A, Islamabad, Pakistan',
    coordinates: { lat: 33.6844, lng: 73.0479 },
  },
  contact: {
    phone: '+92-311-5197087',
    email: 'mahmadafzal880@gmail.com',
    whatsapp: '+92-311-5197087',
  },
  currency: 'PKR',
  timezone: 'Asia/Karachi',
  booking: {
    advancePaymentMin: 500,
    advancePaymentMax: 2000,
    confirmationTimeoutHours: 24,
  },
} as const;

/**
 * Replit Configuration
 */
export const REPLIT_CONFIG = {
  replId: process.env.REPL_ID,
  domains: process.env.REPLIT_DOMAINS,
  issuerUrl: process.env.ISSUER_URL || 'https://replit.com/oidc',
} as const;

/**
 * Validation helper to ensure required environment variables are set
 */
export function validateConfig() {
  const requiredVars = [
    { key: 'DATABASE_URL', value: DATABASE_CONFIG.url },
    { key: 'OPENAI_API_KEY', value: OPENAI_CONFIG.apiKey },
  ];

  const missing = requiredVars.filter(({ value }) => !value);
  
  if (missing.length > 0) {
    const missingKeys = missing.map(({ key }) => key).join(', ');
    throw new Error(`Missing required environment variables: ${missingKeys}`);
  }
}

/**
 * Development mode check
 */
export const isDevelopment = SERVER_CONFIG.nodeEnv === 'development';
export const isProduction = SERVER_CONFIG.nodeEnv === 'production';
export const isTest = SERVER_CONFIG.nodeEnv === 'test';
