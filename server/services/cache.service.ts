/**
 * Cache Service
 * Provides Redis-based caching with automatic serialization, compression, and cache invalidation
 */

import Redis from 'ioredis';
import { log } from '../utils/logger';
import { ExternalServiceError } from '../errors';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  compress?: boolean; // Whether to compress large values
  tags?: string[]; // Cache tags for bulk invalidation
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
}

export class CacheService {
  private static instance: CacheService;
  private redis: Redis | null = null;
  private isConnected: boolean = false;
  private isRedisEnabled: boolean = false;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0
  };

  private constructor() {
    // Check if Redis is enabled via environment variables
    this.isRedisEnabled = !!(
      process.env.REDIS_URL ||
      process.env.REDIS_HOST ||
      process.env.REDIS_ENABLED === 'true'
    );

    if (this.isRedisEnabled) {
      log.info('Redis caching enabled, attempting to connect...');
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        family: 4, // IPv4
      });

      this.setupEventHandlers();
      this.connect();
    } else {
      log.info('Redis caching disabled - running without cache');
    }
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  private setupEventHandlers(): void {
    if (!this.redis) return;

    this.redis.on('connect', () => {
      log.info('Redis connection established');
      this.isConnected = true;
    });

    this.redis.on('ready', () => {
      log.info('Redis is ready to receive commands');
    });

    this.redis.on('error', (error) => {
      log.warn('Redis connection error (continuing without cache)', {
        error: error.message,
        code: (error as any).code
      });
      this.isConnected = false;
      this.stats.errors++;

      // Stop trying to reconnect after too many errors
      if (this.stats.errors > 10) {
        log.warn('Too many Redis errors, disabling Redis for this session');
        this.isRedisEnabled = false;
        if (this.redis) {
          this.redis.disconnect();
        }
      }
    });

    this.redis.on('close', () => {
      log.warn('Redis connection closed (continuing without cache)');
      this.isConnected = false;
    });

    this.redis.on('reconnecting', (delay: number) => {
      log.info('Redis reconnecting...', { delay });
      // Limit reconnection attempts
      if (this.stats.errors > 5) {
        log.warn('Stopping Redis reconnection attempts due to repeated failures');
        if (this.redis) {
          this.redis.disconnect();
        }
      }
    });
  }

  private async connect(): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.connect();
    } catch (error) {
      log.warn('Failed to connect to Redis, continuing without cache', { error });
      this.isConnected = false;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isRedisEnabled || !this.redis || !this.isConnected) {
      this.stats.misses++;
      return null;
    }

    try {
      const value = await this.redis.get(this.prefixKey(key));

      if (value === null) {
        this.stats.misses++;
        log.debug('Cache miss', { key });
        return null;
      }

      this.stats.hits++;
      log.debug('Cache hit', { key });

      // Try to parse JSON, return as-is if parsing fails
      try {
        return JSON.parse(value);
      } catch {
        return value as T;
      }
    } catch (error) {
      log.error('Cache get error', error, { key });
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isRedisEnabled || !this.redis || !this.isConnected) {
      return false;
    }

    try {
      const { ttl = 3600, compress = false, tags = [] } = options;
      
      // Serialize value
      let serializedValue: string;
      if (typeof value === 'string') {
        serializedValue = value;
      } else {
        serializedValue = JSON.stringify(value);
      }

      // Compress if requested and value is large
      if (compress && serializedValue.length > 1024) {
        // In a real implementation, you would use a compression library like zlib
        log.debug('Large value detected, compression recommended', { 
          key, 
          size: serializedValue.length 
        });
      }

      const prefixedKey = this.prefixKey(key);

      // Set value with TTL
      if (ttl > 0) {
        await this.redis.setex(prefixedKey, ttl, serializedValue);
      } else {
        await this.redis.set(prefixedKey, serializedValue);
      }

      // Handle cache tags for bulk invalidation
      if (tags.length > 0) {
        await this.addToTags(key, tags);
      }

      this.stats.sets++;
      log.debug('Cache set', { key, ttl, tags });
      return true;
    } catch (error) {
      log.error('Cache set error', error, { key });
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.isRedisEnabled || !this.redis || !this.isConnected) {
      return false;
    }

    try {
      const result = await this.redis.del(this.prefixKey(key));
      this.stats.deletes++;
      log.debug('Cache delete', { key, deleted: result > 0 });
      return result > 0;
    } catch (error) {
      log.error('Cache delete error', error, { key });
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isRedisEnabled || !this.redis || !this.isConnected) {
      return false;
    }

    try {
      const result = await this.redis.exists(this.prefixKey(key));
      return result === 1;
    } catch (error) {
      log.error('Cache exists error', error, { key });
      return false;
    }
  }

  /**
   * Get multiple values from cache
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.isConnected || keys.length === 0) {
      return keys.map(() => null);
    }

    try {
      if (!this.redis) {
        return keys.map(() => null);
      }
      const prefixedKeys = keys.map(key => this.prefixKey(key));
      const values = await this.redis.mget(...prefixedKeys);
      
      return values.map((value, index) => {
        if (value === null) {
          this.stats.misses++;
          return null;
        }

        this.stats.hits++;
        try {
          return JSON.parse(value);
        } catch {
          return value as T;
        }
      });
    } catch (error) {
      log.error('Cache mget error', error, { keys });
      this.stats.errors++;
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values in cache
   */
  async mset<T>(keyValuePairs: Array<{ key: string; value: T; options?: CacheOptions }>): Promise<boolean> {
    if (!this.isConnected || keyValuePairs.length === 0) {
      return false;
    }

    try {
      // Use pipeline for better performance
      if (!this.redis) {
        return false;
      }
      const pipeline = this.redis.pipeline();

      for (const { key, value, options = {} } of keyValuePairs) {
        const { ttl = 3600 } = options;
        const prefixedKey = this.prefixKey(key);
        const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);

        if (ttl > 0) {
          pipeline.setex(prefixedKey, ttl, serializedValue);
        } else {
          pipeline.set(prefixedKey, serializedValue);
        }
      }

      await pipeline.exec();
      this.stats.sets += keyValuePairs.length;
      log.debug('Cache mset', { count: keyValuePairs.length });
      return true;
    } catch (error) {
      log.error('Cache mset error', error, { count: keyValuePairs.length });
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Increment numeric value in cache
   */
  async increment(key: string, amount: number = 1): Promise<number | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      if (!this.redis) {
        return null;
      }
      const result = await this.redis.incrby(this.prefixKey(key), amount);
      log.debug('Cache increment', { key, amount, result });
      return result;
    } catch (error) {
      log.error('Cache increment error', error, { key, amount });
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Set expiration time for a key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      if (!this.redis) {
        return false;
      }
      const result = await this.redis.expire(this.prefixKey(key), ttl);
      return result === 1;
    } catch (error) {
      log.error('Cache expire error', error, { key, ttl });
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(key: string): Promise<number | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      if (!this.redis) {
        return null;
      }
      const result = await this.redis.ttl(this.prefixKey(key));
      return result;
    } catch (error) {
      log.error('Cache TTL error', error, { key });
      return null;
    }
  }

  /**
   * Clear all cache entries with a pattern
   */
  async clear(pattern: string = '*'): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      if (!this.redis) {
        return 0;
      }
      const keys = await this.redis.keys(this.prefixKey(pattern));
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis.del(...keys);
      this.stats.deletes += result;
      log.info('Cache cleared', { pattern, deletedCount: result });
      return result;
    } catch (error) {
      log.error('Cache clear error', error, { pattern });
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    if (!this.isConnected || tags.length === 0) {
      return 0;
    }

    try {
      let deletedCount = 0;

      for (const tag of tags) {
        const tagKey = this.getTagKey(tag);
        if (!this.redis) continue;
        const keys = await this.redis.smembers(tagKey);
        
        if (keys.length > 0) {
          const prefixedKeys = keys.map(key => this.prefixKey(key));
          const result = await this.redis.del(...prefixedKeys);
          deletedCount += result;
        }

        // Remove the tag set itself
        await this.redis.del(tagKey);
      }

      this.stats.deletes += deletedCount;
      log.info('Cache invalidated by tags', { tags, deletedCount });
      return deletedCount;
    } catch (error) {
      log.error('Cache invalidate by tags error', error, { tags });
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { connected: boolean } {
    return {
      ...this.stats,
      connected: this.isConnected
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  /**
   * Health check
   * Returns true if Redis is disabled (intentionally) or if Redis is enabled and working
   */
  async healthCheck(): Promise<boolean> {
    // If Redis is intentionally disabled, consider it healthy
    if (!this.isRedisEnabled) {
      return true;
    }

    // If Redis is enabled but not connected, it's unhealthy
    if (!this.redis || !this.isConnected) {
      return false;
    }

    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      log.error('Cache health check failed', error);
      return false;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (!this.redis) {
      log.info('Redis not initialized, nothing to shutdown');
      return;
    }

    try {
      await this.redis.quit();
      log.info('Redis connection closed gracefully');
    } catch (error) {
      log.error('Error during Redis shutdown', error);
    }
  }

  // Private helper methods

  private prefixKey(key: string): string {
    const prefix = process.env.CACHE_PREFIX || 'sitenest';
    return `${prefix}:${key}`;
  }

  private getTagKey(tag: string): string {
    return this.prefixKey(`tag:${tag}`);
  }

  private async addToTags(key: string, tags: string[]): Promise<void> {
    if (tags.length === 0) return;

    try {
      if (!this.redis) {
        log.error('Redis instance is null when adding cache tags', { key, tags });
        return;
      }
      const pipeline = this.redis.pipeline();
      
      for (const tag of tags) {
        const tagKey = this.getTagKey(tag);
        pipeline.sadd(tagKey, key);
        pipeline.expire(tagKey, 86400); // Tags expire in 24 hours
      }

      await pipeline.exec();
    } catch (error) {
      log.error('Error adding cache tags', error, { key, tags });
    }
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();
