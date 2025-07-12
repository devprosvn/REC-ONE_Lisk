#!/usr/bin/env node

import { setupDatabase } from './src/setup/database.js'
import { testConnection } from './src/config/supabase.js'
import { logger } from './src/utils/logger.js'

async function main() {
  console.log('🚀 REC-ONE Backend Setup')
  console.log('========================')

  try {
    // Test connection first
    console.log('1. Testing Supabase connection...')
    const connected = await testConnection()
    
    if (!connected) {
      console.error('❌ Failed to connect to Supabase')
      console.log('Please check your .env configuration:')
      console.log('- SUPABASE_URL')
      console.log('- SUPABASE_ANON_KEY')
      process.exit(1)
    }

    console.log('✅ Supabase connection successful')

    // Setup database schema
    console.log('\n2. Setting up database schema...')
    await setupDatabase()

    console.log('\n🎉 Setup completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Start the server: npm run dev')
    console.log('2. Test API: curl http://localhost:3001/health')
    console.log('3. View database: https://supabase.com/dashboard/project/jzzljxhqrbxeiqozptek')

  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    logger.error('Setup failed', { error: error.message, stack: error.stack })
    process.exit(1)
  }
}

main()
