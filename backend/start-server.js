#!/usr/bin/env node

// Simple server starter script
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('🚀 Starting REC-ONE Backend Server...')

// Set environment variables
process.env.PORT = process.env.PORT || '3001'
process.env.NODE_ENV = process.env.NODE_ENV || 'development'

// Start the server
const serverPath = join(__dirname, 'src', 'server.js')

try {
  // Import and start the server directly
  await import('./src/server.js')
} catch (error) {
  console.error('❌ Failed to start server:', error.message)
  process.exit(1)
}
