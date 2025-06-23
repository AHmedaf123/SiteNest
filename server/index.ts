/**
 * SiteNest Server Entry Point
 * Premium Luxury Apartment Booking Platform
 */

import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { SERVER_CONFIG, validateConfig } from "./config";
import { log, requestLogger, errorLogger } from "./utils/logger";
import { errorResponse } from "./utils/response";
import {
  securityHeaders,
  corsConfig,
  RateLimitConfig,
  inputSanitizationMiddleware,
  requestSizeLimit
} from "./middleware/security";
import {
  errorHandlingMiddleware,
  requestIdMiddleware
} from "./errors";
import { monitoringService } from "./services/monitoring.service";
import { cacheService } from "./services/cache.service";
import { DatabaseHealthMonitor, databaseClient } from "./db";
import { memoryOptimizer } from "./utils/memory-optimizer";
import { ChatbotDataSyncService } from "./services/chatbot-data-sync.service";

// Validate configuration on startup
validateConfig();

const app = express();

// Security middleware (must be first)
app.use(securityHeaders());
app.use(requestIdMiddleware);
app.use(cors(corsConfig()));

// Rate limiting
app.use('/api/auth', RateLimitConfig.authRateLimit);
app.use('/api/upload', RateLimitConfig.uploadRateLimit);
app.use('/api', RateLimitConfig.apiRateLimit);

// Request parsing with size limits
app.use(requestSizeLimit('10mb'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());

// Input sanitization
app.use(inputSanitizationMiddleware);

// Request logging middleware
app.use(requestLogger);

// Performance monitoring middleware (conditional)
if (process.env.ENABLE_MONITORING === 'true') {
  app.use((req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      monitoringService.recordApiMetrics(
        req.route?.path || req.path,
        req.method,
        res.statusCode,
        responseTime
      );
    });

    next();
  });
}

(async () => {
  // Health check endpoint (before routes)
  app.get('/health', async (req, res) => {
    try {
      const health = await monitoringService.getSystemHealth();
      const statusCode = health.status === 'healthy' ? 200 :
                        health.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json({
        status: health.status,
        timestamp: health.timestamp,
        services: health.services,
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (error) {
      log.error('Health check failed', error);
      res.status(503).json({
        status: 'unhealthy',
        error: 'Health check failed'
      });
    }
  });

  // Metrics endpoint for monitoring
  app.get('/metrics', async (req, res) => {
    try {
      const metrics = monitoringService.getAggregatedMetrics();
      const cacheStats = cacheService.getStats();

      res.json({
        performance: metrics,
        cache: cacheStats,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      });
    } catch (error) {
      log.error('Metrics endpoint failed', error);
      res.status(500).json({ error: 'Metrics unavailable' });
    }
  });

  const server = await registerRoutes(app);

  // Enhanced error handling middleware
  app.use(errorLogger);
  app.use(errorHandlingMiddleware);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Server configuration
  const port = SERVER_CONFIG.port;
  const host = SERVER_CONFIG.host;

  const startServer = async (portToTry: number) => {
    // Initialize services before starting server
    await initializeServices();

    const serverInstance = server.listen(portToTry, host, () => {
      log.info(`🚀 SiteNest server running on http://${host}:${portToTry}`, {
        environment: SERVER_CONFIG.nodeEnv,
        port: portToTry,
        host,
      });
      log.info(`📊 Health check: http://${host}:${portToTry}/health`);
      log.info(`📈 Metrics: http://${host}:${portToTry}/metrics`);
    });

    serverInstance.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        log.error(`Port ${portToTry} is already in use`, err);
        log.info('For SiteNest to work properly with Google OAuth, it must run on port 5000');
        process.exit(1);
      } else {
        log.error('Server startup error', err);
        throw err;
      }
    });

    // Enhanced graceful shutdown
    setupGracefulShutdown(serverInstance);
  };

  await startServer(port);
})();

/**
 * Initialize all services
 */
async function initializeServices(): Promise<void> {
  try {
    log.info('Initializing enterprise services...');

    // Start database health monitoring
    DatabaseHealthMonitor.startHealthMonitoring();

    // Test cache connection
    const cacheHealthy = await cacheService.healthCheck();
    if (cacheHealthy) {
      log.info('✅ Cache service connected');
    } else {
      log.warn('⚠️ Cache service not available');
    }

    // Initialize monitoring (conditional)
    if (process.env.ENABLE_MONITORING === 'true') {
      log.info('✅ Monitoring service initialized');
    } else {
      log.info('⚠️ Monitoring service disabled');
    }

    // Start memory optimization (conditional)
    if (process.env.ENABLE_MONITORING !== 'true') {
      log.info('⚠️ Memory optimizer disabled to reduce system load');
    } else {
      memoryOptimizer.start();
      log.info('✅ Memory optimizer started');
    }

    log.info('🎉 All enterprise services initialized successfully');
  } catch (error) {
    log.error('Service initialization failed', error);
    throw error;
  }
}

/**
 * Setup enhanced graceful shutdown handlers
 */
function setupGracefulShutdown(serverInstance: any): void {
  const shutdown = async (signal: string) => {
    log.info(`${signal} received, initiating graceful shutdown...`);

    // Stop accepting new connections
    serverInstance.close(async () => {
      log.info('HTTP server closed');
      await gracefulShutdown();
      process.exit(0);
    });

    // Force shutdown after timeout
    setTimeout(() => {
      log.error('Graceful shutdown timeout, forcing exit');
      process.exit(1);
    }, 30000); // 30 seconds timeout
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    log.error('Uncaught exception', error);
    gracefulShutdown().then(() => process.exit(1));
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    log.error('Unhandled promise rejection', reason, { promise });
    gracefulShutdown().then(() => process.exit(1));
  });
}

/**
 * Graceful shutdown of all services
 */
async function gracefulShutdown(): Promise<void> {
  try {
    log.info('Starting graceful shutdown...');

    // Shutdown chatbot data sync service
    ChatbotDataSyncService.shutdown();
    log.info('✅ Chatbot data sync service shutdown');

    // Shutdown monitoring service (conditional)
    if (process.env.ENABLE_MONITORING === 'true') {
      monitoringService.shutdown();
      log.info('✅ Monitoring service shutdown');
    }

    // Shutdown memory optimizer (conditional)
    if (process.env.ENABLE_MONITORING === 'true') {
      memoryOptimizer.stop();
      log.info('✅ Memory optimizer stopped');
    }

    // Shutdown cache service
    await cacheService.shutdown();
    log.info('✅ Cache service shutdown');

    // Shutdown database connections
    await databaseClient.gracefulShutdown();
    log.info('✅ Database connections closed');

    log.info('🏁 Graceful shutdown completed');
  } catch (error) {
    log.error('Error during graceful shutdown', error);
  }
}
