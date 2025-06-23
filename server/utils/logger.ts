/**
 * SiteNest Logging Utility
 * Centralized logging system for the application
 */

import winston from 'winston';
import { SERVER_CONFIG, isDevelopment } from '../config';

/**
 * Log levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug',
}

/**
 * Create Winston logger instance
 */
const createLogger = () => {
  const formats = [
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ];

  if (isDevelopment) {
    formats.push(
      winston.format.colorize({ all: true }),
      winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let log = `${timestamp} [${level}]: ${message}`;
        
        if (Object.keys(meta).length > 0) {
          log += ` ${JSON.stringify(meta)}`;
        }
        
        if (stack) {
          log += `\n${stack}`;
        }
        
        return log;
      })
    );
  }

  return winston.createLogger({
    level: isDevelopment ? 'debug' : 'info',
    format: winston.format.combine(...formats),
    defaultMeta: { service: 'sitenest' },
    transports: [
      new winston.transports.Console({
        silent: process.env.NODE_ENV === 'test',
      }),
      // Console only for production deployment
    ],
  });
};

export const logger = createLogger();

/**
 * Structured logging functions
 */
export const log = {
  /**
   * Log error messages
   */
  error: (message: string, error?: Error | unknown, meta?: object) => {
    logger.error(message, {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      ...meta,
    });
  },

  /**
   * Log warning messages
   */
  warn: (message: string, meta?: object) => {
    logger.warn(message, meta);
  },

  /**
   * Log info messages
   */
  info: (message: string, meta?: object) => {
    logger.info(message, meta);
  },

  /**
   * Log HTTP requests
   */
  http: (message: string, meta?: object) => {
    logger.http(message, meta);
  },

  /**
   * Log debug messages
   */
  debug: (message: string, meta?: object) => {
    logger.debug(message, meta);
  },

  /**
   * Log critical messages (same as error but with critical severity)
   */
  critical: (message: string, error?: Error | unknown, meta?: object) => {
    logger.error(message, {
      severity: 'critical',
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      ...meta,
    });
  },

  /**
   * Log authentication events
   */
  auth: (event: string, userId?: string, meta?: object) => {
    logger.info(`AUTH: ${event}`, {
      userId,
      category: 'authentication',
      ...meta,
    });
  },

  /**
   * Log booking events
   */
  booking: (event: string, bookingId?: string, userId?: string, meta?: object) => {
    logger.info(`BOOKING: ${event}`, {
      bookingId,
      userId,
      category: 'booking',
      ...meta,
    });
  },

  /**
   * Log payment events
   */
  payment: (event: string, amount?: number, currency?: string, meta?: object) => {
    logger.info(`PAYMENT: ${event}`, {
      amount,
      currency,
      category: 'payment',
      ...meta,
    });
  },

  /**
   * Log security events
   */
  security: (event: string, ip?: string, userAgent?: string, meta?: object) => {
    logger.warn(`SECURITY: ${event}`, {
      ip,
      userAgent,
      category: 'security',
      ...meta,
    });
  },

  /**
   * Log database events
   */
  database: (event: string, table?: string, meta?: object) => {
    logger.debug(`DATABASE: ${event}`, {
      table,
      category: 'database',
      ...meta,
    });
  },

  /**
   * Log API events
   */
  api: (method: string, path: string, statusCode: number, duration: number, meta?: object) => {
    const level = statusCode >= 400 ? 'warn' : 'info';
    logger[level](`API: ${method} ${path}`, {
      method,
      path,
      statusCode,
      duration,
      category: 'api',
      ...meta,
    });
  },

  /**
   * Log affiliate events
   */
  affiliate: (event: string, affiliateId?: string, meta?: object) => {
    logger.info(`AFFILIATE: ${event}`, {
      affiliateId,
      category: 'affiliate',
      ...meta,
    });
  },

  /**
   * Log email events
   */
  email: (event: string, recipient?: string, subject?: string, meta?: object) => {
    logger.info(`EMAIL: ${event}`, {
      recipient,
      subject,
      category: 'email',
      ...meta,
    });
  },

  /**
   * Log file upload events
   */
  upload: (event: string, filename?: string, size?: number, meta?: object) => {
    logger.info(`UPLOAD: ${event}`, {
      filename,
      size,
      category: 'upload',
      ...meta,
    });
  },
};

/**
 * Express middleware for request logging
 */
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;
    
    log.api(method, originalUrl, statusCode, duration, {
      ip,
      userAgent: req.get('User-Agent'),
    });
  });
  
  next();
};

/**
 * Error logging middleware
 */
export const errorLogger = (err: Error, req: any, res: any, next: any) => {
  log.error('Unhandled error', err, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  
  next(err);
};

export default logger;
