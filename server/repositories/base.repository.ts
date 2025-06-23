/**
 * Base Repository Class
 * Provides common database operations with proper error handling and logging
 */

import { DatabaseClient } from '../db';
import { log } from '../utils/logger';
import { DatabaseError, RecordNotFoundError } from '../errors';
import { eq, and, or, desc, asc, SQL } from 'drizzle-orm';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export abstract class BaseRepository<T = any> {
  protected db = DatabaseClient.getInstance().getDb();
  protected tableName: string;
  protected repositoryName: string;

  constructor(tableName: string, repositoryName: string) {
    this.tableName = tableName;
    this.repositoryName = repositoryName;
  }

  /**
   * Execute database operation with proper error handling and logging
   */
  protected async executeQuery<R>(
    operation: () => Promise<R>,
    operationName: string,
    context?: Record<string, any>
  ): Promise<R> {
    const startTime = Date.now();
    
    try {
      log.debug(`${this.repositoryName}: Starting ${operationName}`, {
        table: this.tableName,
        ...context
      });

      const result = await DatabaseClient.getInstance().executeWithRetry(operation);
      
      const duration = Date.now() - startTime;
      log.debug(`${this.repositoryName}: Completed ${operationName}`, {
        table: this.tableName,
        duration: `${duration}ms`,
        ...context
      });

      // Log slow queries
      if (duration > 1000) {
        log.warn(`${this.repositoryName}: Slow query detected`, {
          operation: operationName,
          table: this.tableName,
          duration: `${duration}ms`,
          ...context
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      log.error(`${this.repositoryName}: Failed ${operationName}`, error, {
        table: this.tableName,
        duration: `${duration}ms`,
        ...context
      });

      // Convert database errors to appropriate business errors
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('not found') || message.includes('no rows')) {
          throw new RecordNotFoundError(this.tableName, 'unknown');
        }
        
        if (message.includes('duplicate key') || message.includes('unique constraint')) {
          throw new DatabaseError(`Duplicate record in ${this.tableName}`, context);
        }
        
        if (message.includes('foreign key') || message.includes('constraint')) {
          throw new DatabaseError(`Constraint violation in ${this.tableName}`, context);
        }
        
        if (message.includes('connection') || message.includes('timeout')) {
          throw new DatabaseError('Database connection error', context);
        }
      }

      throw new DatabaseError(`Database operation failed in ${this.tableName}`, context);
    }
  }

  /**
   * Create a new record
   */
  abstract create(data: Partial<T>): Promise<T>;

  /**
   * Find record by ID
   */
  abstract findById(id: string | number): Promise<T | null>;

  /**
   * Update record by ID
   */
  abstract update(id: string | number, data: Partial<T>): Promise<T>;

  /**
   * Delete record by ID
   */
  abstract delete(id: string | number): Promise<boolean>;

  /**
   * Find records with conditions
   */
  abstract findMany(conditions?: Record<string, any>, options?: PaginationOptions): Promise<PaginationResult<T>>;

  /**
   * Count records with conditions
   */
  abstract count(conditions?: Record<string, any>): Promise<number>;

  /**
   * Check if record exists
   */
  abstract exists(conditions: Record<string, any>): Promise<boolean>;

  /**
   * Batch create records
   */
  abstract createMany(data: Partial<T>[]): Promise<T[]>;

  /**
   * Batch update records
   */
  abstract updateMany(conditions: Record<string, any>, data: Partial<T>): Promise<number>;

  /**
   * Batch delete records
   */
  abstract deleteMany(conditions: Record<string, any>): Promise<number>;

  /**
   * Execute raw SQL query (use with caution)
   */
  protected async executeRawQuery<R>(
    query: string,
    params?: any[],
    operationName: string = 'rawQuery'
  ): Promise<R> {
    return this.executeQuery(async () => {
      // This would need to be implemented based on your database driver
      // For now, we'll throw an error to indicate it's not implemented
      throw new Error('Raw query execution not implemented');
    }, operationName, { query, params });
  }

  /**
   * Begin database transaction
   */
  protected async beginTransaction(): Promise<any> {
    return this.executeQuery(async () => {
      // Transaction implementation would depend on your database driver
      // For Drizzle ORM, you would use db.transaction()
      throw new Error('Transaction support not implemented');
    }, 'beginTransaction');
  }

  /**
   * Commit database transaction
   */
  protected async commitTransaction(transaction: any): Promise<void> {
    return this.executeQuery(async () => {
      // Commit implementation
      throw new Error('Transaction commit not implemented');
    }, 'commitTransaction');
  }

  /**
   * Rollback database transaction
   */
  protected async rollbackTransaction(transaction: any): Promise<void> {
    return this.executeQuery(async () => {
      // Rollback implementation
      throw new Error('Transaction rollback not implemented');
    }, 'rollbackTransaction');
  }

  /**
   * Build pagination metadata
   */
  protected buildPaginationMetadata(
    total: number,
    page: number,
    limit: number
  ): PaginationResult<T>['pagination'] {
    const totalPages = Math.ceil(total / limit);
    
    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }

  /**
   * Validate pagination parameters
   */
  protected validatePaginationOptions(options: PaginationOptions): {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder: 'asc' | 'desc';
  } {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10)); // Max 100 items per page
    const sortOrder = options.sortOrder === 'asc' ? 'asc' : 'desc';
    
    return {
      page,
      limit,
      sortBy: options.sortBy,
      sortOrder
    };
  }

  /**
   * Build WHERE conditions from object
   */
  protected buildWhereConditions(conditions: Record<string, any>, table: any): SQL[] {
    const whereConditions: SQL[] = [];
    
    for (const [key, value] of Object.entries(conditions)) {
      if (value !== undefined && value !== null) {
        if (table[key]) {
          if (Array.isArray(value)) {
            // Handle IN conditions
            whereConditions.push(table[key].in(value));
          } else if (typeof value === 'object' && value.operator) {
            // Handle complex conditions like { operator: 'gte', value: 100 }
            switch (value.operator) {
              case 'gte':
                whereConditions.push(table[key].gte(value.value));
                break;
              case 'lte':
                whereConditions.push(table[key].lte(value.value));
                break;
              case 'gt':
                whereConditions.push(table[key].gt(value.value));
                break;
              case 'lt':
                whereConditions.push(table[key].lt(value.value));
                break;
              case 'like':
                whereConditions.push(table[key].like(`%${value.value}%`));
                break;
              case 'ilike':
                whereConditions.push(table[key].ilike(`%${value.value}%`));
                break;
              default:
                whereConditions.push(eq(table[key], value.value));
            }
          } else {
            // Simple equality condition
            whereConditions.push(eq(table[key], value));
          }
        }
      }
    }
    
    return whereConditions;
  }

  /**
   * Build ORDER BY clause
   */
  protected buildOrderBy(table: any, sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc'): SQL | undefined {
    if (!sortBy || !table[sortBy]) {
      return undefined;
    }
    
    const column = table[sortBy];
    return sortOrder === 'asc' ? asc(column) : desc(column);
  }

  /**
   * Log repository operation
   */
  protected logOperation(
    operation: string,
    data?: Record<string, any>,
    userId?: string
  ): void {
    log.info(`${this.repositoryName}: ${operation}`, {
      repository: this.repositoryName,
      table: this.tableName,
      operation,
      userId,
      ...data
    });
  }

  /**
   * Sanitize data before database operations
   */
  protected sanitizeData(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        // Remove any potential SQL injection patterns
        if (typeof value === 'string') {
          sanitized[key] = value.replace(/['"`;]/g, '');
        } else {
          sanitized[key] = value;
        }
      }
    }
    
    return sanitized;
  }

  /**
   * Validate required fields
   */
  protected validateRequiredFields(data: Record<string, any>, requiredFields: string[]): void {
    const missingFields = requiredFields.filter(field => 
      data[field] === undefined || data[field] === null || data[field] === ''
    );

    if (missingFields.length > 0) {
      throw new DatabaseError(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }
}
