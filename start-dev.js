#!/usr/bin/env node

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('🚀 Starting REC-ONE Development Environment')
console.log('==========================================')

// Function to spawn a process with colored output
function spawnProcess(name, command, args, cwd, color) {
  const colorCodes = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
  }

  const proc = spawn(command, args, {
    cwd,
    stdio: 'pipe',
    shell: true
  })

  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim())
    lines.forEach(line => {
      console.log(`${colorCodes[color]}[${name}]${colorCodes.reset} ${line}`)
    })
  })

  proc.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim())
    lines.forEach(line => {
      console.log(`${colorCodes.red}[${name} ERROR]${colorCodes.reset} ${line}`)
    })
  })

  proc.on('close', (code) => {
    console.log(`${colorCodes[color]}[${name}]${colorCodes.reset} Process exited with code ${code}`)
  })

  return proc
}

// Start backend server
console.log('📡 Starting Backend API Server...')
const backend = spawnProcess(
  'BACKEND',
  'npm',
  ['run', 'dev'],
  join(__dirname, 'backend'),
  'blue'
)

// Wait a bit for backend to start
setTimeout(() => {
  console.log('🌐 Starting Frontend Development Server...')
  const frontend = spawnProcess(
    'FRONTEND',
    'npm',
    ['run', 'dev'],
    join(__dirname, 'frontend'),
    'green'
  )

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down development servers...')
    backend.kill('SIGINT')
    frontend.kill('SIGINT')
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down development servers...')
    backend.kill('SIGTERM')
    frontend.kill('SIGTERM')
    process.exit(0)
  })

}, 2000)

console.log('\n📋 Development URLs:')
console.log('   Frontend: http://localhost:5173')
console.log('   Backend:  http://localhost:3001')
console.log('   API Docs: http://localhost:3001/api/v1')
console.log('   Health:   http://localhost:3001/health')
console.log('\n💡 Press Ctrl+C to stop all servers')
