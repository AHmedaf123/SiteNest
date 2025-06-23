/**
 * Enterprise-grade security middleware for SiteNest
 * Implements comprehensive security measures including rate limiting, authentication, and input validation
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { RateLimitError, AuthenticationError, InvalidTokenError, TokenExpiredError } from '../errors';
import { log } from '../utils/logger';
import jwt from 'jsonwebtoken';
import { AUTH_CONFIG } from '../config';
import { InputValidator } from '../utils/validation';

// Rate limiting configurations
export class RateLimitConfig {
  // General API rate limiting
  static readonly RETRY_AFTER_SECONDS = 15 * 60; // 15 minutes in seconds

  // General API rate limiting
  static apiRateLimit = rateLimit({
    windowMs: RateLimitConfig.RETRY_AFTER_SECONDS * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP',
      retryAfter: RateLimitConfig.RETRY_AFTER_SECONDS // 15 minutes in seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      const error = new RateLimitError(RateLimitConfig.RETRY_AFTER_SECONDS);

      log.security('Rate limit exceeded', req.ip, req.get('User-Agent'), {
        endpoint: req.originalUrl,
        method: req.method
      });

      res.status(429).json({
        error: {
          message: error.message,
          code: error.errorCode,
          retryAfter: RateLimitConfig.RETRY_AFTER_SECONDS
        }
      });
    }
  });

  // Strict rate limiting for authentication endpoints
  static authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 auth attempts per windowMs
    message: {
      error: 'Too many authentication attempts',
      retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
    handler: (req: Request, res: Response) => {
      log.security('Authentication rate limit exceeded', req.ip, req.get('User-Agent'), {
        endpoint: req.originalUrl,
        method: req.method,
        body: req.body ? Object.keys(req.body) : []
      });

      res.status(429).json({
        error: {
          message: 'Too many authentication attempts. Please try again later.',
          code: 'AUTH_RATE_LIMIT_EXCEEDED',
          retryAfter: 15 * 60
        }
      });
    }
  });

  // File upload rate limiting
  static uploadRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 uploads per minute
    message: {
      error: 'Too many file uploads',
      retryAfter: 60
    },
    handler: (req: Request, res: Response) => {
      log.security('Upload rate limit exceeded', req.ip, req.get('User-Agent'));
      res.status(429).json({
        error: {
          message: 'Too many file uploads. Please try again later.',
          code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
          retryAfter: 60
        }
      });
    }
  });

  // Booking-specific rate limiting (more lenient for authenticated users)
  static bookingRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // limit each IP to 10 booking attempts per 5 minutes
    message: {
      error: 'Too many booking attempts',
      retryAfter: 5 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      log.security('Booking rate limit exceeded', req.ip, req.get('User-Agent'), {
        endpoint: req.originalUrl,
        method: req.method,
        userId: (req as any).user?.id
      });

      res.status(429).json({
        error: {
          message: 'Too many booking attempts. Please wait a few minutes before trying again.',
          code: 'BOOKING_RATE_LIMIT_EXCEEDED',
          retryAfter: 5 * 60
        }
      });
    }
  });
}

// Security headers configuration
export function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'", 
          "'unsafe-inline'", 
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net"
        ],
        fontSrc: [
          "'self'", 
          "https://fonts.gstatic.com",
          "https://cdn.jsdelivr.net"
        ],
        imgSrc: [
          "'self'", 
          "data:", 
          "https:", 
          "http:",
          "https://maps.googleapis.com", 
          "https://maps.gstatic.com",
          "https://streetviewpixels-pa.googleapis.com"
        ],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Required for some React functionality
          "'unsafe-eval'", // Required for development
          "https://maps.googleapis.com",
          "https://cdn.jsdelivr.net",
          "https://replit.com", // For Replit development banner
          "https://www.googletagmanager.com", // For Firebase Analytics
          "https://www.google-analytics.com" // For Firebase Analytics
        ],
        connectSrc: [
          "'self'",
          "https://api.openai.com",
          "https://accounts.google.com",
          "https://oauth2.googleapis.com",
          "https://maps.googleapis.com",
          "https://replit.com", // For Replit services
          "https://www.google-analytics.com", // For Firebase Analytics
          "https://analytics.google.com", // For Firebase Analytics
          "https://firebase.googleapis.com", // For Firebase services
          "wss://localhost:*", // WebSocket connections for development
          "ws://localhost:*"
        ],
        frameSrc: [
          "'self'",
          "https://www.google.com",
          "https://maps.google.com",
          "https://www.google.com/maps/embed"
        ],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
      }
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  });
}

// Input sanitization middleware
export function inputSanitizationMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // Skip sanitization for certain endpoints that legitimately need long URLs or natural language
    const skipSanitizationPaths = [
      '/api/auth/google/callback',
      '/api/auth/facebook/callback',
      '/api/auth/twitter/callback',
      '/api/track/affiliate',
      '/api/chat/ai',  // Skip for chatbot messages to allow natural language
      '/api/chat/session'
    ];

    const shouldSkipSanitization = skipSanitizationPaths.some(path =>
      req.path.startsWith(path)
    );

    if (shouldSkipSanitization) {
      return next();
    }

    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = InputValidator.sanitizeObject(req.body);
    }

    // Sanitize query parameters with different limits based on context
    if (req.query && typeof req.query === 'object') {
      const sanitizedQuery: any = {};
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string') {
          // Allow longer values for specific query parameters
          const maxLength = ['token', 'user', 'code', 'state', 'redirect_uri'].includes(key) ? 2000 : 500;
          sanitizedQuery[key] = InputValidator.sanitizeString(value, { maxLength });
        } else {
          sanitizedQuery[key] = value;
        }
      }
      req.query = sanitizedQuery;
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      const sanitizedParams: any = {};
      for (const [key, value] of Object.entries(req.params)) {
        if (typeof value === 'string') {
          // Allow longer values for affiliate codes and tokens
          const maxLength = ['affiliateCode', 'token', 'id'].includes(key) ? 200 : 100;
          sanitizedParams[key] = InputValidator.sanitizeString(value, { maxLength });
        } else {
          sanitizedParams[key] = value;
        }
      }
      req.params = sanitizedParams;
    }

    next();
  } catch (error) {
    log.security('Input sanitization failed', req.ip, req.get('User-Agent'), {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: req.originalUrl,
      method: req.method
    });

    res.status(400).json({
      error: {
        message: 'Invalid input detected',
        code: 'INPUT_SANITIZATION_FAILED'
      }
    });
  }
}

// Enhanced JWT authentication middleware with memory optimization
export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    const error = new AuthenticationError('Access token required', {
      requestId: req.headers['x-request-id'] as string
    });

    log.security('Missing authentication token', req.ip, req.get('User-Agent'), {
      endpoint: req.originalUrl,
      method: req.method
    });

    res.status(401).json({
      error: {
        message: error.message,
        code: error.errorCode
      }
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, AUTH_CONFIG.jwt.secret) as any;

    // Check token expiration
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      const error = new TokenExpiredError();

      log.security('Expired token used', req.ip, req.get('User-Agent'), {
        userId: decoded.userId,
        endpoint: req.originalUrl
      });

      res.status(401).json({
        error: {
          message: error.message,
          code: error.errorCode
        }
      });
      return;
    }

    // Add minimal user info to request (memory optimization)
    (req as any).user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    // Reduce logging frequency for successful auth (memory optimization)
    if (Math.random() < 0.1) { // Log only 10% of successful authentications
      log.auth('Token validated', decoded.userId, {
        endpoint: req.originalUrl,
        method: req.method
      });
    }

    next();
  } catch (error) {
    const authError = new InvalidTokenError();

    log.security('Invalid token used', req.ip, req.get('User-Agent'), {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: req.originalUrl
    });

    res.status(401).json({
      error: {
        message: authError.message,
        code: authError.errorCode
      }
    });
  }
}

// CORS configuration for production
export function corsConfig() {
  return {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5000',
        'https://sitenest.com',
        'https://www.sitenest.com',
        'https://app.sitenest.com'
      ];

      if (process.env.NODE_ENV === 'development') {
        allowedOrigins.push('http://localhost:*');
      }

      if (allowedOrigins.some(allowed => origin.match(allowed))) {
        callback(null, true);
      } else {
        log.security('CORS violation', origin, '', {
          rejectedOrigin: origin
        });
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Request-ID', 
      'X-Forwarded-For',
      'User-Agent'
    ],
    exposedHeaders: ['X-Request-ID'],
    maxAge: 86400 // 24 hours
  };
}

// Request size limiting middleware
export function requestSizeLimit(maxSize: string = '10mb') {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxBytes = parseSize(maxSize);

    if (contentLength > maxBytes) {
      log.security('Request size limit exceeded', req.ip, req.get('User-Agent'), {
        contentLength,
        maxBytes,
        endpoint: req.originalUrl
      });

      return res.status(413).json({
        error: {
          message: 'Request entity too large',
          code: 'REQUEST_TOO_LARGE',
          maxSize
        }
      });
    }

    next();
  };
}

// Helper function to parse size strings like '10mb', '1gb', etc.
function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)$/);
  if (!match) {
    throw new Error(`Invalid size format: ${size}`);
  }

  const [, value, unit] = match;
  return parseFloat(value) * units[unit];
}
