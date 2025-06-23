#!/usr/bin/env node

/**
 * Optimized startup script for SiteNest
 * Enables garbage collection and memory optimization
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting SiteNest with memory optimizations...');

// Node.js flags for better memory management
const nodeFlags = [
  '--expose-gc',                    // Enable manual garbage collection
  '--max-old-space-size=512',       // Limit heap size to 512MB
  '--optimize-for-size',            // Optimize for memory usage over speed
  '--gc-interval=100',              // More frequent garbage collection
  '--max-semi-space-size=64',       // Limit new space size
];

// Path to the main server file
const serverPath = path.join(__dirname, '..', 'server', 'index.ts');

// Environment variables for production
const env = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV || 'production',
  ENABLE_MONITORING: 'true',
  LOG_LEVEL: 'info'
};

console.log('📊 Memory optimization flags:', nodeFlags.join(' '));

// Start the server with optimizations
const serverProcess = spawn('node', [...nodeFlags, '-r', 'tsx/cjs', serverPath], {
  stdio: 'inherit',
  env,
  shell: true
});

// Handle process events
serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

serverProcess.on('exit', (code, signal) => {
  if (code !== 0) {
    console.error(`❌ Server exited with code ${code} and signal ${signal}`);
    process.exit(code || 1);
  } else {
    console.log('✅ Server shutdown gracefully');
  }
});

// Handle shutdown signals
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down server...');
  serverProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down server...');
  serverProcess.kill('SIGINT');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception in startup script:', error);
  serverProcess.kill('SIGTERM');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection in startup script:', reason);
  serverProcess.kill('SIGTERM');
  process.exit(1);
});

console.log('✅ SiteNest startup script initialized');
