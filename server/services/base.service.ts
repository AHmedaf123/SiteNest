/**
 * Base Service Class
 * Provides common functionality for all service classes including logging, error handling, and validation
 */

import { log } from '../utils/logger';
import { DatabaseError, ValidationError, RecordNotFoundError } from '../errors';
import { DatabaseClient } from '../db';

export abstract class BaseService {
  protected db = DatabaseClient.getInstance().getDb();
  protected serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * Execute database operation with retry logic and error handling
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      log.debug(`${this.serviceName}: Starting ${operationName}`, context);
      
      const result = await DatabaseClient.getInstance().executeWithRetry(operation);
      
      const duration = Date.now() - startTime;
      log.debug(`${this.serviceName}: Completed ${operationName}`, {
        ...context,
        duration: `${duration}ms`
      });

      // Log slow operations
      if (duration > 1000) {
        log.warn(`${this.serviceName}: Slow operation detected`, {
          operation: operationName,
          duration: `${duration}ms`,
          ...context
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      log.error(`${this.serviceName}: Failed ${operationName}`, error, {
        ...context,
        duration: `${duration}ms`
      });

      // Convert database errors to appropriate business errors
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('no rows')) {
          throw new RecordNotFoundError('Record', 'unknown', undefined);
        }
        
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          throw new DatabaseError('Record already exists', context);
        }
        
        if (error.message.includes('foreign key') || error.message.includes('constraint')) {
          throw new ValidationError('Invalid reference to related record', undefined);
        }
      }

      throw error;
    }
  }

  /**
   * Validate required fields
   */
  protected validateRequired(data: Record<string, any>, requiredFields: string[]): void {
    const missingFields = requiredFields.filter(field => 
      data[field] === undefined || data[field] === null || data[field] === ''
    );

    if (missingFields.length > 0) {
      throw new ValidationError(
        `Missing required fields: ${missingFields.join(', ')}`,
        missingFields.map(field => ({
          field,
          message: 'This field is required',
          code: 'required'
        }))
      );
    }
  }

  /**
   * Validate field types
   */
  protected validateTypes(data: Record<string, any>, typeValidations: Record<string, string>): void {
    const errors: Array<{ field: string; message: string; code: string }> = [];

    for (const [field, expectedType] of Object.entries(typeValidations)) {
      const value = data[field];
      
      if (value !== undefined && value !== null) {
        const actualType = typeof value;
        
        if (expectedType === 'array' && !Array.isArray(value)) {
          errors.push({
            field,
            message: `Expected array, got ${actualType}`,
            code: 'invalid_type'
          });
        } else if (expectedType !== 'array' && actualType !== expectedType) {
          errors.push({
            field,
            message: `Expected ${expectedType}, got ${actualType}`,
            code: 'invalid_type'
          });
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Type validation failed', errors);
    }
  }

  /**
   * Validate business rules
   */
  protected validateBusinessRules(
    data: Record<string, any>, 
    rules: Array<{
      condition: (data: Record<string, any>) => boolean;
      message: string;
      field?: string;
    }>
  ): void {
    const errors: Array<{ field: string; message: string; code: string }> = [];

    for (const rule of rules) {
      if (!rule.condition(data)) {
        errors.push({
          field: rule.field || 'general',
          message: rule.message,
          code: 'business_rule_violation'
        });
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Business rule validation failed', errors);
    }
  }

  /**
   * Log service operation
   */
  protected logOperation(
    operation: string, 
    data?: Record<string, any>, 
    userId?: string
  ): void {
    log.info(`${this.serviceName}: ${operation}`, {
      service: this.serviceName,
      operation,
      userId,
      ...data
    });
  }

  /**
   * Log security event
   */
  protected logSecurityEvent(
    event: string, 
    severity: 'low' | 'medium' | 'high' | 'critical',
    data?: Record<string, any>,
    userId?: string
  ): void {
    log.security(
      `${this.serviceName}: ${event}`,
      undefined,
      undefined,
      {
        service: this.serviceName,
        event,
        severity,
        userId,
        ...(data || {}),
        timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Create audit trail entry
   */
  protected async createAuditTrail(
    action: string,
    resourceType: string,
    resourceId: string | number,
    userId: string,
    changes?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // This would typically insert into an audit_logs table
      log.info(`${this.serviceName}: ${action} (AUDIT)`, {
        service: this.serviceName,
        action,
        resourceType,
        resourceId: resourceId.toString(),
        userId,
        changes,
        metadata,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // Audit logging should not fail the main operation
      log.error('Failed to create audit trail', error, {
        service: this.serviceName,
        action,
        resourceType,
        resourceId,
        userId
      });
    }
  }

  /**
   * Check if user has permission for operation
   */
  protected checkPermission(
    userRole: string, 
    requiredRole: string | string[],
    operation: string
  ): boolean {
    const roleHierarchy = {
      'super_admin': 4,
      'admin': 3,
      'affiliate': 2,
      'customer': 1
    };

    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
    
    if (Array.isArray(requiredRole)) {
      const hasPermission = requiredRole.some(role => {
        const requiredLevel = roleHierarchy[role as keyof typeof roleHierarchy] || 0;
        return userLevel >= requiredLevel;
      });
      
      if (!hasPermission) {
        this.logSecurityEvent(
          `Unauthorized access attempt: ${operation}`,
          'medium',
          { userRole, requiredRole, operation }
        );
      }
      
      return hasPermission;
    } else {
      const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;
      const hasPermission = userLevel >= requiredLevel;
      
      if (!hasPermission) {
        this.logSecurityEvent(
          `Unauthorized access attempt: ${operation}`,
          'medium',
          { userRole, requiredRole, operation }
        );
      }
      
      return hasPermission;
    }
  }

  /**
   * Paginate results
   */
  protected paginateResults<T>(
    items: T[],
    page: number = 1,
    limit: number = 10
  ): {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  } {
    const total = items.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return {
      items: items.slice(startIndex, endIndex),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Format currency amount
   */
  protected formatCurrency(amount: number, currency: string = 'PKR'): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Calculate date difference in days
   */
  protected calculateDaysDifference(startDate: Date, endDate: Date): number {
    const timeDifference = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDifference / (1000 * 3600 * 24));
  }

  /**
   * Generate unique identifier
   */
  protected generateId(prefix: string = ''): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}${timestamp}${random}`.toUpperCase();
  }
}
