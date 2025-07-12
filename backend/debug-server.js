#!/usr/bin/env node

console.log('🔍 Debug Server Start...')

try {
  console.log('1. Loading express...')
  const express = await import('express')
  console.log('✅ Express loaded')

  console.log('2. Loading dotenv...')
  const dotenv = await import('dotenv')
  dotenv.default.config()
  console.log('✅ Dotenv loaded')

  console.log('3. Loading supabase config...')
  const { testConnection } = await import('./src/config/supabase.js')
  console.log('✅ Supabase config loaded')

  console.log('4. Testing database connection...')
  const dbConnected = await testConnection()
  console.log(`✅ Database: ${dbConnected ? 'Connected' : 'Failed'}`)

  console.log('5. Loading routes...')
  const { setupRoutes } = await import('./src/routes/index.js')
  console.log('✅ Routes loaded')

  console.log('6. Creating express app...')
  const app = express.default()
  const PORT = process.env.PORT || 3001

  console.log('7. Setting up basic middleware...')
  app.use(express.default.json())

  console.log('8. Setting up routes...')
  setupRoutes(app)

  console.log('9. Starting server...')
  const server = app.listen(PORT, () => {
    console.log(`✅ Server started on port ${PORT}`)
    console.log(`📡 Test URL: http://localhost:${PORT}/api/v1`)
  })

  server.on('error', (error) => {
    console.error('❌ Server error:', error.message)
  })

} catch (error) {
  console.error('❌ Debug failed:', error.message)
  console.error('Stack:', error.stack)
  process.exit(1)
}
