#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Enabling database storage for SiteNest...');

// Create or update .env file to enable database storage
const envPath = path.join(path.dirname(__dirname), '.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

// Add or update USE_DATABASE flag
if (envContent.includes('USE_DATABASE=')) {
  envContent = envContent.replace(/USE_DATABASE=.*/g, 'USE_DATABASE=true');
} else {
  envContent += '\nUSE_DATABASE=true\n';
}

fs.writeFileSync(envPath, envContent);

console.log('✅ Database storage enabled in .env file');
console.log('📝 Added: USE_DATABASE=true');
console.log('');
console.log('🚀 Next steps:');
console.log('1. Run: npm run seed-db (to populate initial data)');
console.log('2. Restart your server: npm run dev');
console.log('');
console.log('💡 Your data will now persist between server restarts!');
