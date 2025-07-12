#!/usr/bin/env node

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('🚀 Starting REC-ONE Backend Server...')
console.log('====================================')

// Set environment variables
process.env.PORT = '3002'
process.env.NODE_ENV = 'development'

// Change to backend directory
const backendDir = join(__dirname, 'backend')
process.chdir(backendDir)

console.log('📁 Working directory:', process.cwd())
console.log('🔧 Environment variables:')
console.log('   PORT:', process.env.PORT)
console.log('   NODE_ENV:', process.env.NODE_ENV)

// Start the server
console.log('🚀 Starting server with npm start...')

const serverProcess = spawn('npm', ['start'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    PORT: '3002',
    NODE_ENV: 'development'
  }
})

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error.message)
  process.exit(1)
})

serverProcess.on('exit', (code) => {
  console.log(`🛑 Server process exited with code ${code}`)
  process.exit(code)
})

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...')
  serverProcess.kill('SIGINT')
  process.exit(0)
})
