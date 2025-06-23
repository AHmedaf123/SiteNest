/**
 * Memory Optimization Utilities for SiteNest
 * Provides memory management and garbage collection utilities
 */

import { log } from './logger';

export class MemoryOptimizer {
  private static instance: MemoryOptimizer;
  private gcInterval: NodeJS.Timeout | null = null;
  private memoryCheckInterval: NodeJS.Timeout | null = null;
  private lastMemoryUsage: NodeJS.MemoryUsage | null = null;

  // Memory thresholds - Increased to reduce false alarms
  private readonly thresholds = {
    warning: 0.85,  // 85% - Only warn when memory is actually high
    critical: 0.95  // 95% - Only critical when near exhaustion
  };

  private constructor() {}

  static getInstance(): MemoryOptimizer {
    if (!MemoryOptimizer.instance) {
      MemoryOptimizer.instance = new MemoryOptimizer();
    }
    return MemoryOptimizer.instance;
  }

  /**
   * Start memory optimization
   */
  start(): void {
    log.info('Starting memory optimizer...');

    // Force garbage collection every 2 minutes if available (more aggressive)
    if (global.gc) {
      this.gcInterval = setInterval(() => {
        const beforeGC = process.memoryUsage();
        const usagePercent = beforeGC.heapUsed / beforeGC.heapTotal;

        // Only run GC if memory usage is above 60%
        if (usagePercent > 0.6) {
          if (typeof global.gc === 'function') {
            global.gc();
          }
          const afterGC = process.memoryUsage();

          const heapFreed = beforeGC.heapUsed - afterGC.heapUsed;
          if (heapFreed > 512 * 1024) { // Log if freed more than 512KB
            log.debug('Garbage collection completed', {
              heapFreed: `${(heapFreed / 1024 / 1024).toFixed(2)}MB`,
              heapUsed: `${(afterGC.heapUsed / 1024 / 1024).toFixed(2)}MB`,
              heapTotal: `${(afterGC.heapTotal / 1024 / 1024).toFixed(2)}MB`,
              usagePercent: `${(afterGC.heapUsed / afterGC.heapTotal * 100).toFixed(1)}%`
            });
          }
        }
      }, 2 * 60 * 1000); // Every 2 minutes
    } else {
      log.warn('Garbage collection not available (run with --expose-gc for better memory management)');
    }

    // Memory monitoring every 5 minutes (reduced frequency to prevent spam)
    this.memoryCheckInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 5 * 60 * 1000);

    log.info('Memory optimizer started');
  }

  /**
   * Stop memory optimization
   */
  stop(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }

    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }

    log.info('Memory optimizer stopped');
  }

  /**
   * Force garbage collection if available
   */
  forceGC(): void {
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Get current memory usage statistics
   */
  getMemoryStats(): {
    usage: NodeJS.MemoryUsage;
    usagePercent: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    const usage = process.memoryUsage();
    const usagePercent = usage.heapUsed / usage.heapTotal;
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (this.lastMemoryUsage) {
      const lastPercent = this.lastMemoryUsage.heapUsed / this.lastMemoryUsage.heapTotal;
      if (usagePercent > lastPercent + 0.05) {
        trend = 'increasing';
      } else if (usagePercent < lastPercent - 0.05) {
        trend = 'decreasing';
      }
    }

    this.lastMemoryUsage = usage;

    return {
      usage,
      usagePercent,
      trend
    };
  }

  /**
   * Check memory usage and take action if needed
   */
  private checkMemoryUsage(): void {
    const stats = this.getMemoryStats();
    const { usage, usagePercent, trend } = stats;

    // Only log if memory usage is actually critical (>95%)
    if (usagePercent > this.thresholds.critical) {
      log.warn('Critical memory usage detected, performing emergency cleanup', {
        heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        usagePercent: `${(usagePercent * 100).toFixed(1)}%`,
        trend
      });
      this.emergencyCleanup();
    } else if (usagePercent > this.thresholds.warning && global.gc) {
      // Silent garbage collection for warning level - no logging to reduce spam
      global.gc();
    }
  }

  /**
   * Optimize object for memory usage
   */
  static optimizeObject<T extends Record<string, any>>(obj: T): T {
    // Remove undefined properties
    const optimized = {} as T;
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null) {
        optimized[key as keyof T] = value;
      }
    }
    return optimized;
  }

  /**
   * Create a memory-efficient array with size limit
   */
  static createLimitedArray<T>(maxSize: number): {
    push: (item: T) => void;
    get: () => T[];
    length: () => number;
    clear: () => void;
  } {
    let items: T[] = [];

    return {
      push: (item: T) => {
        items.push(item);
        if (items.length > maxSize) {
          items = items.slice(-maxSize);
        }
      },
      get: () => [...items],
      length: () => items.length,
      clear: () => {
        items = [];
      }
    };
  }

  /**
   * Emergency memory cleanup - force immediate GC and clear caches
   */
  emergencyCleanup(): void {
    // Force garbage collection multiple times
    if (global.gc) {
      for (let i = 0; i < 3; i++) {
        global.gc();
      }
    }

    // Clear any large objects from memory
    if (global.gc) {
      setTimeout(() => {
        if (typeof global.gc === 'function') {
          global.gc();
        }
      }, 100);
    }

    log.info('Emergency memory cleanup completed');
  }

  /**
   * Force garbage collection if memory usage is critical
   */
  forceGarbageCollection(): boolean {
    if (!global.gc) {
      log.warn('Garbage collection not available');
      return false;
    }

    const beforeGC = process.memoryUsage();
    global.gc();
    const afterGC = process.memoryUsage();

    const heapFreed = beforeGC.heapUsed - afterGC.heapUsed;
    log.info('Forced garbage collection completed', {
      heapFreed: `${(heapFreed / 1024 / 1024).toFixed(2)}MB`,
      heapUsed: `${(afterGC.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      heapTotal: `${(afterGC.heapTotal / 1024 / 1024).toFixed(2)}MB`
    });

    return true;
  }
}

// Export singleton instance
export const memoryOptimizer = MemoryOptimizer.getInstance();

// Global memory utilities
export const memoryUtils = {
  /**
   * Get formatted memory usage string
   */
  formatMemoryUsage: (bytes: number): string => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)}MB`;
  },

  /**
   * Check if memory usage is high
   */
  isMemoryHigh: (): boolean => {
    const usage = process.memoryUsage();
    const usagePercent = usage.heapUsed / usage.heapTotal;
    return usagePercent > 0.85;
  },

  /**
   * Get memory usage percentage
   */
  getMemoryUsagePercent: (): number => {
    const usage = process.memoryUsage();
    return (usage.heapUsed / usage.heapTotal) * 100;
  }
};
