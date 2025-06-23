#!/usr/bin/env node

/**
 * Start SiteNest server with optimized garbage collection
 * This script enables garbage collection and memory optimization flags
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Memory optimization flags
const nodeFlags = [
  '--expose-gc',                    // Enable manual garbage collection
  '--max-old-space-size=512',       // Limit heap to 512MB
  '--max-semi-space-size=64',       // Limit semi-space to 64MB
  '--optimize-for-size'             // Optimize for memory usage
];

// Environment variables
const env = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '5000'
};

console.log('🚀 Starting SiteNest with memory optimization...');
console.log('🔧 Node flags:', nodeFlags.join(' '));
console.log('🌍 Environment:', env.NODE_ENV);
console.log('🔌 Port:', env.PORT);

// Start the server
const serverProcess = spawn('npx', [
  'tsx',
  ...nodeFlags,
  path.join(__dirname, '..', 'server', 'index.ts')
], {
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
    process.exit(code);
  }
  console.log('✅ Server shutdown gracefully');
});

// Handle shutdown signals
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  serverProcess.kill('SIGTERM');
});
