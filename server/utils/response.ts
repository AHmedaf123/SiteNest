/**
 * SiteNest API Response Utilities
 * Standardized response format for all API endpoints
 */

import { Response } from 'express';
import { API_STATUS } from '../constants';
import { log } from './logger';

/**
 * Standard API response interface
 */
export interface ApiResponse<T = any> {
  status: 'success' | 'error' | 'validation_error';
  message: string;
  data?: T;
  errors?: string[] | object;
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

/**
 * Pagination metadata interface
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Create standardized success response
 */
export function successResponse<T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200,
  pagination?: PaginationMeta
): Response {
  const response: ApiResponse<T> = {
    status: API_STATUS.SUCCESS,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...(pagination && { pagination }),
    },
  };

  return res.status(statusCode).json(response);
}

/**
 * Create standardized error response
 */
export function errorResponse(
  res: Response,
  message: string,
  statusCode: number = 500,
  errors?: string[] | object
): Response {
  const response: ApiResponse = {
    status: API_STATUS.ERROR,
    message,
    errors,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  // Log error for debugging
  log.error(`API Error: ${message}`, { statusCode, errors });

  return res.status(statusCode).json(response);
}

/**
 * Create standardized validation error response
 */
export function validationErrorResponse(
  res: Response,
  message: string = 'Validation failed',
  errors: string[] | object,
  statusCode: number = 400
): Response {
  const response: ApiResponse = {
    status: API_STATUS.VALIDATION_ERROR,
    message,
    errors,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  return res.status(statusCode).json(response);
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(
  res: Response,
  message: string = 'Unauthorized access'
): Response {
  return errorResponse(res, message, 401);
}

/**
 * Create forbidden response
 */
export function forbiddenResponse(
  res: Response,
  message: string = 'Access forbidden'
): Response {
  return errorResponse(res, message, 403);
}

/**
 * Create not found response
 */
export function notFoundResponse(
  res: Response,
  message: string = 'Resource not found'
): Response {
  return errorResponse(res, message, 404);
}

/**
 * Create conflict response
 */
export function conflictResponse(
  res: Response,
  message: string = 'Resource conflict'
): Response {
  return errorResponse(res, message, 409);
}

/**
 * Create too many requests response
 */
export function tooManyRequestsResponse(
  res: Response,
  message: string = 'Too many requests'
): Response {
  return errorResponse(res, message, 429);
}

/**
 * Create internal server error response
 */
export function internalServerErrorResponse(
  res: Response,
  message: string = 'Internal server error'
): Response {
  return errorResponse(res, message, 500);
}

/**
 * Create paginated response
 */
export function paginatedResponse<T>(
  res: Response,
  message: string,
  data: T[],
  pagination: PaginationMeta,
  statusCode: number = 200
): Response {
  return successResponse(res, message, data, statusCode, pagination);
}

/**
 * Create created response
 */
export function createdResponse<T>(
  res: Response,
  message: string,
  data?: T
): Response {
  return successResponse(res, message, data, 201);
}

/**
 * Create no content response
 */
export function noContentResponse(res: Response): Response {
  return res.status(204).send();
}

/**
 * Handle async route errors
 */
export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page: Math.max(1, page),
    limit: Math.max(1, limit),
    total,
    totalPages: Math.max(1, totalPages),
  };
}

/**
 * Validate pagination parameters
 */
export function validatePagination(page?: string, limit?: string) {
  const parsedPage = page ? parseInt(page, 10) : 1;
  const parsedLimit = limit ? parseInt(limit, 10) : 10;
  
  return {
    page: Math.max(1, isNaN(parsedPage) ? 1 : parsedPage),
    limit: Math.min(100, Math.max(1, isNaN(parsedLimit) ? 10 : parsedLimit)),
  };
}

/**
 * Format error for API response
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unknown error occurred';
}

/**
 * Check if response was already sent
 */
export function isResponseSent(res: Response): boolean {
  return res.headersSent;
}

/**
 * Safe JSON response (prevents double responses)
 */
export function safeJsonResponse(res: Response, data: any, statusCode: number = 200): Response | void {
  if (isResponseSent(res)) {
    log.warn('Attempted to send response after headers were already sent');
    return;
  }
  
  return res.status(statusCode).json(data);
}
