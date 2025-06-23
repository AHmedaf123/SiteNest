// Load environment variables from .env file
import { config } from 'dotenv';
config();

import { Pool, neonConfig, PoolConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { log } from './utils/logger';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Enterprise-grade database connection configuration
const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum connections
  min: parseInt(process.env.DB_POOL_MIN || '5'),  // Minimum connections
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // 30 seconds
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'), // 10 seconds
  maxUses: parseInt(process.env.DB_MAX_USES || '7500'), // Max uses per connection
};

export const pool = new Pool(poolConfig);

// Database connection health monitoring
export class DatabaseHealthMonitor {
  private static healthCheckInterval: NodeJS.Timeout | null = null;
  private static isHealthy = true;

  static async checkConnection(): Promise<boolean> {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();

      if (!this.isHealthy) {
        log.info('Database connection restored');
        this.isHealthy = true;
      }

      return true;
    } catch (error) {
      if (this.isHealthy) {
        log.error('Database connection lost', error);
        this.isHealthy = false;
      }
      return false;
    }
  }

  static startHealthMonitoring(): void {
    if (this.healthCheckInterval) return;

    this.healthCheckInterval = setInterval(async () => {
      await this.checkConnection();
    }, 30000); // Check every 30 seconds

    log.info('Database health monitoring started');
  }

  static stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      log.info('Database health monitoring stopped');
    }
  }

  static getHealthStatus(): boolean {
    return this.isHealthy;
  }
}

// Enhanced database client with connection retry and monitoring
export class DatabaseClient {
  private static instance: DatabaseClient;
  private db: ReturnType<typeof drizzle>;
  private isShuttingDown = false;

  private constructor() {
    this.db = drizzle({ client: pool, schema });
    DatabaseHealthMonitor.startHealthMonitoring();
  }

  static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient();
    }
    return DatabaseClient.instance;
  }

  getDb() {
    return this.db;
  }

  isConnectionHealthy(): boolean {
    return !this.isShuttingDown && DatabaseHealthMonitor.getHealthStatus();
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined = undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check if database is healthy and not shutting down
        if (this.isShuttingDown) {
          throw new Error('Database is shutting down');
        }

        if (!DatabaseHealthMonitor.getHealthStatus()) {
          throw new Error('Database connection is not healthy');
        }

        const result = await operation();

        // Log successful retry if it wasn't the first attempt
        if (attempt > 1) {
          log.info(`Database operation succeeded on attempt ${attempt}`);
        }

        return result;
      } catch (error) {
        lastError = error as Error;

        log.warn(
          `Database operation failed on attempt ${attempt}/${maxRetries}: ${
            (error instanceof Error ? error.message : String(error))
          }`,
          {
            attempt,
            maxRetries,
            willRetry: attempt < maxRetries
          }
        );

        // Don't retry on certain types of errors
        if (this.isNonRetryableError(error as Error)) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          await this.sleep(delay * Math.pow(2, attempt - 1));
        }
      }
    }

    log.error(`Database operation failed after ${maxRetries} attempts`, lastError);
    throw lastError ?? new Error('Database operation failed after all retries');
  }

  private isNonRetryableError(error: Error): boolean {
    const nonRetryablePatterns = [
      'syntax error',
      'permission denied',
      'relation does not exist',
      'column does not exist',
      'duplicate key value',
      'foreign key constraint'
    ];

    const errorMessage = error.message.toLowerCase();
    return nonRetryablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async gracefulShutdown(): Promise<void> {
    if (this.isShuttingDown) {
      log.warn('Database shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    log.info('Initiating database graceful shutdown');

    try {
      DatabaseHealthMonitor.stopHealthMonitoring();
      await pool.end();
      log.info('Database connections closed successfully');
    } catch (error) {
      log.error('Error during database shutdown', error);
    }
  }
}

export const db = DatabaseClient.getInstance().getDb();

// Export database client instance for graceful shutdown
export const databaseClient = DatabaseClient.getInstance();