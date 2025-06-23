import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { log } from './utils/logger';

// Context type for error constructors
export type ErrorContext = {
  requestId?: string;
  userId?: string;
  metadata?: Record<string, any>;
};

// Base error class with enhanced properties
export abstract class BaseError extends Error {
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;
  abstract readonly errorCode: string;

  public readonly timestamp: Date;
  public readonly requestId?: string;
  public readonly userId?: string;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    context?: ErrorContext
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.requestId = context?.requestId;
    this.userId = context?.userId;
    this.context = context?.metadata;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      timestamp: this.timestamp,
      requestId: this.requestId,
      userId: this.userId,
      context: this.context,
      isOperational: this.isOperational
    };
  }
}

// Validation Errors
export class ValidationError extends BaseError {
  readonly statusCode = 400;
  readonly isOperational = true;
  readonly errorCode: string;

  constructor(
    message: string,
    public readonly validationErrors?: Array<{
      field: string;
      message: string;
      code: string;
    }>,
    context?: ErrorContext,
    errorCode: string = 'VALIDATION_ERROR'
  ) {
    super(message, context);
    this.errorCode = errorCode;
  }
}

export class InputSanitizationError extends ValidationError {
  constructor(
    field: string,
    reason: string,
    context?: ErrorContext
  ) {
    super(
      `Invalid input in field '${field}': ${reason}`,
      undefined,
      context,
      'INPUT_SANITIZATION_ERROR'
    );
  }
}

// Authentication Errors
export class AuthenticationError extends BaseError {
  readonly statusCode = 401;
  readonly isOperational = true;
  readonly errorCode: string = 'AUTHENTICATION_ERROR';
  constructor(message: string = 'Authentication error', context?: ErrorContext) {
    super(message, context);
  }
}

export class TokenExpiredError extends AuthenticationError {
  readonly errorCode = 'TOKEN_EXPIRED';
  constructor(context?: ErrorContext) {
    super('Authentication token has expired', context);
  }
}

export class InvalidTokenError extends AuthenticationError {
  readonly errorCode = 'INVALID_TOKEN';
  constructor(context?: ErrorContext) {
    super('Invalid authentication token', context);
  }
}

export class AccountLockoutError extends AuthenticationError {
  readonly errorCode = 'ACCOUNT_LOCKED';
  constructor(lockoutDuration: number, context?: ErrorContext) {
    super(`Account locked due to multiple failed login attempts. Try again in ${lockoutDuration} minutes.`, context);
  }
}

// Authorization Errors
export class AuthorizationError extends BaseError {
  readonly statusCode = 403;
  readonly isOperational = true;
  readonly errorCode: string = 'AUTHORIZATION_ERROR';
  constructor(requiredRole: string, context?: ErrorContext) {
    super(`Insufficient permissions. Required role: ${requiredRole}`, context);
  }
}

// Database Errors
export class DatabaseError extends BaseError {
  readonly statusCode = 500;
  readonly isOperational = true;
  readonly errorCode: string = 'DATABASE_ERROR';
  constructor(message: string = 'Database error occurred', context?: ErrorContext) {
    super(message, context);
  }
}

export class DatabaseConnectionError extends DatabaseError {
  readonly errorCode = 'DATABASE_CONNECTION_ERROR';
  constructor(context?: ErrorContext) {
    super('Database connection failed. Please try again later.', context);
  }
}

export class DatabaseTimeoutError extends DatabaseError {
  readonly errorCode = 'DATABASE_TIMEOUT_ERROR';
  constructor(operation: string, context?: ErrorContext) {
    super(`Database operation '${operation}' timed out`, context);
  }
}

export class RecordNotFoundError extends BaseError {
  readonly statusCode = 404;
  readonly isOperational = true;
  readonly errorCode: string = 'RECORD_NOT_FOUND';
  constructor(resource: string, identifier: string | number, context?: ErrorContext) {
    super(`${resource} with identifier '${identifier}' not found`, context);
  }
}

export class DuplicateRecordError extends BaseError {
  readonly statusCode = 409;
  readonly isOperational = true;
  readonly errorCode: string = 'DUPLICATE_RECORD';
  constructor(resource: string, field: string, value: string, context?: ErrorContext) {
    super(`${resource} with ${field} '${value}' already exists`, context);
  }
}

// Business Logic Errors
export class BusinessLogicError extends BaseError {
  readonly statusCode = 422;
  readonly isOperational = true;
  readonly errorCode: string = 'BUSINESS_LOGIC_ERROR';
  constructor(message: string = 'Business logic error occurred', context?: ErrorContext) {
    super(message, context);
  }
}

export class BookingNotAvailableError extends BusinessLogicError {
  readonly errorCode = 'BOOKING_NOT_AVAILABLE';
  constructor(reason: string, context?: ErrorContext) {
    super(`Booking not available: ${reason}`, context);
  }
}

export class InsufficientFundsError extends BusinessLogicError {
  readonly errorCode = 'INSUFFICIENT_FUNDS';
  constructor(required: number, available: number, context?: ErrorContext) {
    super(`Insufficient funds. Required: ${required}, Available: ${available}`, context);
  }
}

// Rate Limiting Errors
export class RateLimitError extends BaseError {
  readonly statusCode = 429;
  readonly isOperational = true;
  readonly errorCode: string = 'RATE_LIMIT_EXCEEDED';
  constructor(retryAfter: number, context?: ErrorContext) {
    super(`Rate limit exceeded. Try again in ${retryAfter} seconds.`, context);
  }
}

// External Service Errors
export class ExternalServiceError extends BaseError {
  readonly statusCode = 502;
  readonly isOperational = true;
  readonly errorCode: string = 'EXTERNAL_SERVICE_UNAVAILABLE';
  constructor(service: string, context?: ErrorContext) {
    super(`External service '${service}' is currently unavailable`, context);
  }
}

// File Upload Errors
export class FileUploadError extends BaseError {
  readonly statusCode = 400;
  readonly isOperational = true;
  readonly errorCode: string = 'FILE_UPLOAD_ERROR';
  constructor(message: string = 'File upload error occurred', context?: ErrorContext) {
    super(message, context);
  }
}

export class FileSizeLimitError extends FileUploadError {
  readonly errorCode = 'FILE_SIZE_LIMIT_EXCEEDED';
  constructor(maxSize: number, actualSize: number, context?: ErrorContext) {
    super(`File size ${actualSize} bytes exceeds maximum allowed size of ${maxSize} bytes`, context);
  }
}

export class FileTypeNotAllowedError extends FileUploadError {
  readonly errorCode = 'FILE_TYPE_NOT_ALLOWED';
  constructor(allowedTypes: string[], actualType: string, context?: ErrorContext) {
    super(`File type '${actualType}' not allowed. Allowed types: ${allowedTypes.join(', ')}`, context);
  }
}

// Error Handler Utility Class
export class ErrorHandler {
  static handleZodError(error: ZodError, requestId?: string): ValidationError {
    const validationErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));

    return new ValidationError(
      'Validation failed',
      validationErrors,
      { requestId }
    );
  }

  static handleDatabaseError(error: Error, operation: string, requestId?: string): DatabaseError {
    const message = error.message.toLowerCase();

    if (message.includes('connection') || message.includes('connect')) {
      return new DatabaseConnectionError({ requestId });
    }

    if (message.includes('timeout')) {
      return new DatabaseTimeoutError(operation, { requestId });
    }

    if (message.includes('duplicate key') || message.includes('unique constraint')) {
      return new DatabaseError('Duplicate key or unique constraint violation', { requestId });
    }

    return new DatabaseError(`Database operation '${operation}' failed`, { requestId });
  }

  static isOperationalError(error: Error): boolean {
    if (error instanceof BaseError) {
      return error.isOperational;
    }
    return false;
  }

  static logError(error: Error, context?: Record<string, any>): void {
    if (error instanceof BaseError) {
      log.error(error.message, error, {
        errorCode: error.errorCode,
        statusCode: error.statusCode,
        requestId: error.requestId,
        userId: error.userId,
        isOperational: error.isOperational,
        ...error.context,
        ...context
      });
    } else {
      log.error('Unhandled error', error, context);
    }
  }
}

// Express Error Handling Middleware
export function errorHandlingMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Generate request ID if not present
  const requestId = req.headers['x-request-id'] as string ||
                   req.headers['request-id'] as string ||
                   generateRequestId();

  // Get user ID from request if available
  const userId = (req as any).user?.id;

  let handledError: BaseError;

  // Convert known error types to our custom errors
  if (error instanceof ZodError) {
    handledError = ErrorHandler.handleZodError(error, requestId);
  } else if (error instanceof BaseError) {
    handledError = error;
  } else if (error.name === 'ValidationError') {
    handledError = new ValidationError(error.message, undefined, { requestId, userId });
  } else if (error.message?.includes('database') || error.message?.includes('connection')) {
    handledError = ErrorHandler.handleDatabaseError(error, 'unknown', requestId);
  } else {
    // Unknown error - create a proper internal server error
    handledError = new InternalServerError(
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message,
      { requestId, userId }
    );
  }

  // Log the error
  ErrorHandler.logError(handledError, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId,
    userId
  });

  // Send error response
  const errorResponse = {
    error: {
      message: handledError.message,
      code: handledError.errorCode,
      timestamp: handledError.timestamp || new Date(),
      requestId,
      ...(process.env.NODE_ENV !== 'production' && {
        stack: handledError.stack
      })
    }
  };

  // Add validation errors if present
  if (handledError instanceof ValidationError && handledError.validationErrors) {
    (errorResponse.error as any).validationErrors = handledError.validationErrors;
  }

  res.status(handledError.statusCode || 500).json(errorResponse);
}

// Add missing InternalServerError class
export class InternalServerError extends BaseError {
  readonly statusCode = 500;
  readonly isOperational = false;
  readonly errorCode: string = 'INTERNAL_SERVER_ERROR';
  constructor(message: string = 'Internal server error', context?: ErrorContext) {
    super(message, context);
  }
}

// Utility function to generate request IDs
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Request ID middleware
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers['x-request-id'] as string ||
                   req.headers['request-id'] as string ||
                   generateRequestId();

  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
}