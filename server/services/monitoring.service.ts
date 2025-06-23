/**
 * Performance Monitoring Service
 * Provides comprehensive application monitoring including metrics collection, alerting, and health checks
 */

import { log } from '../utils/logger';
import { cacheService } from './cache.service';
import { DatabaseHealthMonitor } from '../db';

export interface PerformanceMetrics {
  timestamp: Date;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
  activeConnections?: number;
  cacheHitRate?: number;
  errorRate?: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: {
    database: boolean;
    cache: boolean;
    memory: boolean;
    cpu: boolean;
  };
  metrics: {
    memoryUsagePercent: number;
    cpuUsagePercent: number;
    responseTimeP95: number;
    errorRate: number;
    cacheHitRate: number;
  };
  alerts: Alert[];
}

export interface Alert {
  id: string;
  type: 'warning' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  metadata?: Record<string, any>;
}

export class MonitoringService {
  private static instance: MonitoringService;
  private metrics: PerformanceMetrics[] = [];
  private alerts: Alert[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsCleanupInterval: NodeJS.Timeout | null = null;
  private lastCpuUsage: NodeJS.CpuUsage | null = null;
  private lastCpuMeasureTime: number | null = null;

  // Thresholds for alerting - Increased to reduce false alarms
  private readonly thresholds = {
    responseTime: {
      warning: 3000, // 3 seconds
      critical: 8000  // 8 seconds
    },
    memoryUsage: {
      warning: 0.85,   // 85%
      critical: 0.95   // 95%
    },
    cpuUsage: {
      warning: 0.8,   // 80%
      critical: 0.95   // 95%
    },
    errorRate: {
      warning: 0.1,  // 10%
      critical: 0.2   // 20%
    },
    cacheHitRate: {
      warning: 0.5,   // 50%
      critical: 0.3   // 30%
    }
  };

  private constructor() {
    this.startHealthMonitoring();
    this.startMetricsCleanup();
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Record API endpoint performance metrics
   */
  recordApiMetrics(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number
  ): void {
    const metrics: PerformanceMetrics = {
      timestamp: new Date(),
      endpoint,
      method,
      statusCode,
      responseTime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: this.getCpuUsage()
    };

    this.metrics.push(metrics);

    // Check for performance alerts
    this.checkPerformanceAlerts(metrics);

    // Only log very slow requests (critical level)
    if (responseTime > this.thresholds.responseTime.critical) {
      log.warn('Very slow API response detected', {
        endpoint,
        method,
        responseTime: `${responseTime}ms`,
        statusCode
      });
    }

    // Keep only last 500 metrics in memory (reduced from 1000 to save memory)
    if (this.metrics.length > 500) {
      this.metrics = this.metrics.slice(-500);
    }

    // Force garbage collection every 100 metrics to prevent memory buildup
    if (this.metrics.length % 100 === 0 && global.gc) {
      global.gc();
    }
  }

  /**
   * Get current system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const now = new Date();
    const recentMetrics = this.getRecentMetrics(5 * 60 * 1000); // Last 5 minutes

    // Check service health
    const databaseHealth = DatabaseHealthMonitor.getHealthStatus();
    const cacheHealth = await cacheService.healthCheck();
    const memoryHealth = this.checkMemoryHealth();
    const cpuHealth = this.checkCpuHealth();

    // Calculate metrics
    const responseTimeP95 = this.calculatePercentile(
      recentMetrics.map(m => m.responseTime),
      0.95
    );

    const errorRate = this.calculateErrorRate(recentMetrics);
    const cacheStats = cacheService.getStats();
    const cacheHitRate = cacheStats.hits / (cacheStats.hits + cacheStats.misses) || 0;

    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = memoryUsage.heapUsed / memoryUsage.heapTotal;

    const cpuUsagePercent = this.getCpuUsagePercent() / 100; // Convert to decimal for consistency

    // Determine overall health status
    let status: SystemHealth['status'] = 'healthy';
    if (!databaseHealth || !cacheHealth || !memoryHealth || !cpuHealth) {
      status = 'unhealthy';
    } else if (
      responseTimeP95 > this.thresholds.responseTime.warning ||
      errorRate > this.thresholds.errorRate.warning ||
      memoryUsagePercent > this.thresholds.memoryUsage.warning ||
      cpuUsagePercent > this.thresholds.cpuUsage.warning
    ) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: now,
      services: {
        database: databaseHealth,
        cache: cacheHealth,
        memory: memoryHealth,
        cpu: cpuHealth
      },
      metrics: {
        memoryUsagePercent,
        cpuUsagePercent,
        responseTimeP95,
        errorRate,
        cacheHitRate
      },
      alerts: this.getActiveAlerts()
    };
  }

  /**
   * Get performance metrics for a specific time period
   */
  getMetrics(
    startTime: Date,
    endTime: Date,
    endpoint?: string
  ): PerformanceMetrics[] {
    return this.metrics.filter(metric => {
      const inTimeRange = metric.timestamp >= startTime && metric.timestamp <= endTime;
      const matchesEndpoint = !endpoint || metric.endpoint === endpoint;
      return inTimeRange && matchesEndpoint;
    });
  }

  /**
   * Get aggregated metrics for dashboard
   */
  getAggregatedMetrics(timeWindow: number = 60 * 60 * 1000): {
    averageResponseTime: number;
    requestCount: number;
    errorCount: number;
    errorRate: number;
    slowRequestCount: number;
    topEndpoints: Array<{ endpoint: string; count: number; avgResponseTime: number }>;
  } {
    const recentMetrics = this.getRecentMetrics(timeWindow);

    const requestCount = recentMetrics.length;
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = requestCount > 0 ? errorCount / requestCount : 0;
    const slowRequestCount = recentMetrics.filter(
      m => m.responseTime > this.thresholds.responseTime.warning
    ).length;

    const averageResponseTime = requestCount > 0
      ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / requestCount
      : 0;

    // Calculate top endpoints
    const endpointStats = new Map<string, { count: number; totalTime: number }>();
    recentMetrics.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      const existing = endpointStats.get(key) || { count: 0, totalTime: 0 };
      endpointStats.set(key, {
        count: existing.count + 1,
        totalTime: existing.totalTime + metric.responseTime
      });
    });

    const topEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        count: stats.count,
        avgResponseTime: stats.totalTime / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      averageResponseTime,
      requestCount,
      errorCount,
      errorRate,
      slowRequestCount,
      topEndpoints
    };
  }

  /**
   * Create a new alert
   */
  createAlert(
    type: Alert['type'],
    message: string,
    metadata?: Record<string, any>
  ): Alert {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: new Date(),
      resolved: false,
      metadata
    };

    this.alerts.push(alert);

    // Log alert
    if (type === 'critical') {
      log.critical('Critical alert created', alert);
    } else {
      log.warn('Warning alert created', alert);
    }

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    return alert;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      log.info('Alert resolved', { alertId, message: alert.message });
      return true;
    }
    return false;
  }

  /**
   * Get active (unresolved) alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getSystemHealth();

        // Only log health status changes if they are critical
        if (health.status === 'unhealthy') {
          log.error('System health critical', {
            status: health.status,
            services: health.services,
            metrics: health.metrics
          });
        }

        // Auto-resolve alerts if system is healthy
        if (health.status === 'healthy') {
          this.getActiveAlerts().forEach(alert => {
            if (alert.type === 'warning') {
              this.resolveAlert(alert.id);
            }
          });
        }
      } catch (error) {
        log.error('Health check failed', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes (reduced from 30 seconds)

    log.info('Health monitoring started with reduced frequency');
  }

  /**
   * Start metrics cleanup
   */
  private startMetricsCleanup(): void {
    this.metricsCleanupInterval = setInterval(() => {
      const cutoff = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago (reduced from 24 hours)
      const initialMetricsCount = this.metrics.length;
      const initialAlertsCount = this.alerts.length;

      // Clean up old metrics
      this.metrics = this.metrics.filter(metric => metric.timestamp > cutoff);

      // Clean up old alerts (keep only last 6 hours)
      const alertCutoff = new Date(Date.now() - 6 * 60 * 60 * 1000);
      this.alerts = this.alerts.filter(alert => alert.timestamp > alertCutoff);

      const removedMetrics = initialMetricsCount - this.metrics.length;
      const removedAlerts = initialAlertsCount - this.alerts.length;

      if (removedMetrics > 0 || removedAlerts > 0) {
        log.debug('Memory cleanup completed', {
          removedMetrics,
          removedAlerts,
          remainingMetrics: this.metrics.length,
          remainingAlerts: this.alerts.length
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }, 2 * 60 * 1000); // Every 2 minutes (reduced from 1 hour)

    log.info('Metrics cleanup started with aggressive memory management');
  }

  /**
   * Check for performance alerts
   */
  private checkPerformanceAlerts(metrics: PerformanceMetrics): void {
    // Response time alerts
    if (metrics.responseTime > this.thresholds.responseTime.critical) {
      this.createAlert(
        'critical',
        `Critical response time: ${metrics.responseTime}ms for ${metrics.method} ${metrics.endpoint}`,
        { responseTime: metrics.responseTime, endpoint: metrics.endpoint }
      );
    } else if (metrics.responseTime > this.thresholds.responseTime.warning) {
      this.createAlert(
        'warning',
        `Slow response time: ${metrics.responseTime}ms for ${metrics.method} ${metrics.endpoint}`,
        { responseTime: metrics.responseTime, endpoint: metrics.endpoint }
      );
    }

    // Memory usage alerts
    const memoryUsagePercent = metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal;
    if (memoryUsagePercent > this.thresholds.memoryUsage.critical) {
      this.createAlert(
        'critical',
        `Critical memory usage: ${(memoryUsagePercent * 100).toFixed(1)}%`,
        { memoryUsage: metrics.memoryUsage }
      );
    } else if (memoryUsagePercent > this.thresholds.memoryUsage.warning) {
      this.createAlert(
        'warning',
        `High memory usage: ${(memoryUsagePercent * 100).toFixed(1)}%`,
        { memoryUsage: metrics.memoryUsage }
      );
    }
  }

  /**
   * Get recent metrics within time window
   */
  private getRecentMetrics(timeWindow: number): PerformanceMetrics[] {
    const cutoff = new Date(Date.now() - timeWindow);
    return this.metrics.filter(metric => metric.timestamp > cutoff);
  }

  /**
   * Calculate percentile from array of numbers
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index] || 0;
  }

  /**
   * Calculate error rate from metrics
   */
  private calculateErrorRate(metrics: PerformanceMetrics[]): number {
    if (metrics.length === 0) return 0;
    
    const errorCount = metrics.filter(m => m.statusCode >= 400).length;
    return errorCount / metrics.length;
  }

  /**
   * Get CPU usage percentage
   */
  private getCpuUsagePercent(): number {
    try {
      const now = Date.now();
      const currentUsage = process.cpuUsage();

      // If this is the first measurement, initialize and return 0
      if (!this.lastCpuUsage || !this.lastCpuMeasureTime) {
        this.lastCpuUsage = currentUsage;
        this.lastCpuMeasureTime = now;
        return 0;
      }

      // Calculate the difference in CPU usage
      const cpuDelta = process.cpuUsage(this.lastCpuUsage);
      const timeDelta = (now - this.lastCpuMeasureTime) * 1000; // Convert to microseconds

      // Calculate CPU percentage
      const cpuPercent = ((cpuDelta.user + cpuDelta.system) / timeDelta) * 100;

      // Update last measurements
      this.lastCpuUsage = currentUsage;
      this.lastCpuMeasureTime = now;

      // Return a reasonable value (cap at 100%)
      return Math.min(Math.max(cpuPercent, 0), 100);
    } catch (error) {
      log.debug('CPU usage measurement failed', { error });
      return 0; // Return 0% if measurement fails
    }
  }

  /**
   * Get CPU usage (legacy method for compatibility)
   */
  private getCpuUsage(): NodeJS.CpuUsage | undefined {
    try {
      const currentUsage = process.cpuUsage(this.lastCpuUsage || undefined);
      this.lastCpuUsage = process.cpuUsage();
      return currentUsage;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Check memory health
   */
  private checkMemoryHealth(): boolean {
    try {
      const memoryUsage = process.memoryUsage();
      const usagePercent = memoryUsage.heapUsed / memoryUsage.heapTotal;
      const isHealthy = usagePercent < this.thresholds.memoryUsage.critical;

      log.debug('Memory health check', {
        heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        usagePercent: `${(usagePercent * 100).toFixed(2)}%`,
        threshold: `${(this.thresholds.memoryUsage.critical * 100).toFixed(2)}%`,
        isHealthy
      });

      return isHealthy;
    } catch (error) {
      log.warn('Memory health check failed, assuming healthy', { error });
      return true; // Assume healthy if can't measure
    }
  }

  /**
   * Check CPU health
   */
  private checkCpuHealth(): boolean {
    try {
      const cpuPercent = this.getCpuUsagePercent();
      const isHealthy = cpuPercent < (this.thresholds.cpuUsage.critical * 100); // Convert threshold to percentage

      log.debug('CPU health check', {
        cpuPercent: cpuPercent.toFixed(2),
        threshold: (this.thresholds.cpuUsage.critical * 100).toFixed(2),
        isHealthy
      });

      return isHealthy;
    } catch (error) {
      log.warn('CPU health check failed, assuming healthy', { error });
      return true; // Assume healthy if can't measure
    }
  }

  /**
   * Graceful shutdown
   */
  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.metricsCleanupInterval) {
      clearInterval(this.metricsCleanupInterval);
      this.metricsCleanupInterval = null;
    }

    log.info('Monitoring service shutdown completed');
  }
}

// Export singleton instance
export const monitoringService = MonitoringService.getInstance();
