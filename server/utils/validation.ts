/**
 * Enterprise-grade input validation and sanitization utilities
 * Provides comprehensive validation for all user inputs with security focus
 */

import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { ValidationError, InputSanitizationError } from '../errors';

// Pakistani-specific validation patterns
const PAKISTANI_PHONE_REGEX = /^(\+92|0)?[0-9]{10,11}$/;
const PAKISTANI_CNIC_REGEX = /^\d{5}-\d{7}-\d$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Security patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
  /(--|\/\*|\*\/|;|'|"|`)/,
  /(\bOR\b|\bAND\b).*?[=<>]/i
];

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi
];

const NOSQL_INJECTION_PATTERNS = [
  /\$where/i,
  /\$ne/i,
  /\$gt/i,
  /\$lt/i,
  /\$regex/i,
  /\$or/i,
  /\$and/i
];

export class InputValidator {
  /**
   * Sanitize string input to prevent XSS and injection attacks
   */
  static sanitizeString(input: string, options: {
    allowHtml?: boolean;
    maxLength?: number;
    trimWhitespace?: boolean;
  } = {}): string {
    const {
      allowHtml = false,
      maxLength = 1000,
      trimWhitespace = true
    } = options;

    if (typeof input !== 'string') {
      throw new InputSanitizationError('input', 'Must be a string');
    }

    let sanitized = input;

    // Trim whitespace if requested
    if (trimWhitespace) {
      sanitized = sanitized.trim();
    }

    // Check length
    if (sanitized.length > maxLength) {
      throw new InputSanitizationError('input', `Exceeds maximum length of ${maxLength} characters`);
    }

    // Check for SQL injection patterns
    for (const pattern of SQL_INJECTION_PATTERNS) {
      if (pattern.test(sanitized)) {
        throw new InputSanitizationError('input', 'Contains potentially malicious SQL patterns');
      }
    }

    // Check for NoSQL injection patterns
    for (const pattern of NOSQL_INJECTION_PATTERNS) {
      if (pattern.test(sanitized)) {
        throw new InputSanitizationError('input', 'Contains potentially malicious NoSQL patterns');
      }
    }

    // Handle HTML content
    if (allowHtml) {
      // Use DOMPurify to sanitize HTML
      sanitized = DOMPurify.sanitize(sanitized, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
        ALLOWED_ATTR: []
      });
    } else {
      // Check for XSS patterns
      for (const pattern of XSS_PATTERNS) {
        if (pattern.test(sanitized)) {
          throw new InputSanitizationError('input', 'Contains potentially malicious script content');
        }
      }

      // Escape HTML entities
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    }

    return sanitized;
  }

  /**
   * Validate Pakistani phone number
   */
  static validatePakistaniPhone(phone: string): boolean {
    const sanitized = this.sanitizeString(phone, { maxLength: 20 });
    return PAKISTANI_PHONE_REGEX.test(sanitized);
  }

  /**
   * Validate Pakistani CNIC
   */
  static validatePakistaniCNIC(cnic: string): boolean {
    const sanitized = this.sanitizeString(cnic, { maxLength: 15 });
    return PAKISTANI_CNIC_REGEX.test(sanitized);
  }

  /**
   * Validate email address with additional security checks
   */
  static validateEmail(email: string): boolean {
    const sanitized = this.sanitizeString(email, { maxLength: 254 });

    if (!EMAIL_REGEX.test(sanitized)) {
      return false;
    }

    // Additional security checks
    const suspiciousPatterns = [
      /\+.*@/,  // Plus addressing that might be used for spam
      /\.{2,}/, // Multiple consecutive dots
      /@.*@/,   // Multiple @ symbols
    ];

    return !suspiciousPatterns.some(pattern => pattern.test(sanitized));
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): boolean {
    return PASSWORD_REGEX.test(password);
  }

  /**
   * Validate date range for bookings
   */
  static validateDateRange(checkIn: string, checkOut: string): {
    valid: boolean;
    error?: string;
    checkInDate?: Date;
    checkOutDate?: Date;
  } {
    try {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const now = new Date();

      // Check if dates are valid
      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        return { valid: false, error: 'Invalid date format' };
      }

      // Check if check-in is in the future (allow same day if time is in future)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (checkInDate < today) {
        return { valid: false, error: 'Check-in date must be today or in the future' };
      }

      // Check if check-out is after check-in
      if (checkOutDate <= checkInDate) {
        return { valid: false, error: 'Check-out date must be after check-in date' };
      }

      // Check maximum booking duration (e.g., 30 days)
      const maxDuration = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      if (checkOutDate.getTime() - checkInDate.getTime() > maxDuration) {
        return { valid: false, error: 'Booking duration cannot exceed 30 days' };
      }

      // Check maximum advance booking (e.g., 1 year)
      const maxAdvance = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
      if (checkInDate.getTime() - now.getTime() > maxAdvance) {
        return { valid: false, error: 'Cannot book more than 1 year in advance' };
      }

      return { valid: true, checkInDate, checkOutDate };
    } catch (error) {
      return { valid: false, error: 'Invalid date format' };
    }
  }

  /**
   * Validate monetary amount in PKR
   */
  static validatePKRAmount(amount: number, options: {
    min?: number;
    max?: number;
    allowZero?: boolean;
  } = {}): boolean {
    const { min = 0, max = 10000000, allowZero = false } = options;

    if (typeof amount !== 'number' || isNaN(amount)) {
      return false;
    }

    if (!allowZero && amount === 0) {
      return false;
    }

    if (amount < min || amount > max) {
      return false;
    }

    // Check for reasonable decimal places (PKR typically uses 2 decimal places max)
    const decimalPlaces = (amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      return false;
    }

    return true;
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(file: Express.Multer.File, options: {
    allowedMimeTypes?: string[];
    maxSize?: number;
    allowedExtensions?: string[];
  } = {}): { valid: boolean; error?: string } {
    const {
      allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'],
      maxSize = 5 * 1024 * 1024, // 5MB
      allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp']
    } = options;

    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    // Check file size
    if (file.size > maxSize) {
      return { valid: false, error: `File size exceeds maximum of ${maxSize} bytes` };
    }

    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return { valid: false, error: `File type ${file.mimetype} not allowed` };
    }

    // Check file extension
    const extension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (!allowedExtensions.includes(extension)) {
      return { valid: false, error: `File extension ${extension} not allowed` };
    }

    // Check for suspicious file names
    const suspiciousPatterns = [
      /\.(php|asp|jsp|exe|bat|cmd|sh)$/i,
      /\.\./,
      /[<>:"|?*]/
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(file.originalname))) {
      return { valid: false, error: 'Suspicious file name detected' };
    }

    return { valid: true };
  }

  /**
   * Sanitize object recursively
   */
  static sanitizeObject(obj: any, depth: number = 0): any {
    if (depth > 10) {
      throw new InputSanitizationError('object', 'Object nesting too deep');
    }

    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, depth + 1));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeString(key, { maxLength: 100 });
        sanitized[sanitizedKey] = this.sanitizeObject(value, depth + 1);
      }
      return sanitized;
    }

    return obj;
  }
}

// Legacy function compatibility (keeping for backward compatibility)
export function isValidEmail(email: string): boolean {
  return InputValidator.validateEmail(email);
}

export function isValidPhonePK(phone: string): boolean {
  return InputValidator.validatePakistaniPhone(phone);
}

export function isValidCNIC(cnic: string): boolean {
  return InputValidator.validatePakistaniCNIC(cnic);
}

export function isValidPassword(password: string): boolean {
  return InputValidator.validatePassword(password);
}

export function sanitizeString(input: string): string {
  return InputValidator.sanitizeString(input);
}

export function isValidDateRange(checkIn: string, checkOut: string): boolean {
  return InputValidator.validateDateRange(checkIn, checkOut).valid;
}

// Enhanced Zod schemas with security validation
export const secureStringSchema = (maxLength: number = 1000) =>
  z.string()
    .max(maxLength)
    .transform((val) => InputValidator.sanitizeString(val, { maxLength }));

export const pakistaniPhoneSchema = z.string()
  .refine(InputValidator.validatePakistaniPhone, 'Invalid Pakistani phone number');

export const pakistaniCNICSchema = z.string()
  .refine(InputValidator.validatePakistaniCNIC, 'Invalid Pakistani CNIC format');

export const secureEmailSchema = z.string()
  .email('Invalid email format')
  .refine(InputValidator.validateEmail, 'Email contains suspicious patterns');

export const securePasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .refine(InputValidator.validatePassword, 'Password must contain uppercase, lowercase, number, and special character');

export const pkrAmountSchema = (min: number = 0, max: number = 10000000) =>
  z.number()
    .refine((val) => InputValidator.validatePKRAmount(val, { min, max }),
            `Amount must be between ${min} and ${max} PKR`);

export const dateRangeSchema = z.object({
  checkIn: z.string(),
  checkOut: z.string()
}).refine(
  (data) => InputValidator.validateDateRange(data.checkIn, data.checkOut).valid,
  (data) => ({
    message: InputValidator.validateDateRange(data.checkIn, data.checkOut).error || 'Invalid date range'
  })
);

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Additional utility functions for backward compatibility
export function isValidPrice(price: number): boolean {
  return InputValidator.validatePKRAmount(price, { min: 1, max: 100000 });
}

export function isValidFileType(mimeType: string): boolean {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  return allowedTypes.includes(mimeType);
}

export function isValidFileSize(size: number): boolean {
  const maxSize = 5 * 1024 * 1024; // 5MB
  return size <= maxSize;
}

export function isValidRating(rating: number): boolean {
  return rating >= 1 && rating <= 5 && Number.isInteger(rating);
}

export function isValidGuestCount(count: number): boolean {
  return count >= 1 && count <= 10;
}

export function isValidBookingStatus(status: string): boolean {
  const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
  return validStatuses.includes(status);
}

export function isValidPaymentStatus(status: string): boolean {
  const validStatuses = ['pending', 'paid', 'failed', 'refunded'];
  return validStatuses.includes(status);
}

export function isValidUserRole(role: string): boolean {
  const validRoles = ['customer', 'affiliate', 'admin', 'super_admin'];
  return validRoles.includes(role);
}
