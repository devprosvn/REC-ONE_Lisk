#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

console.log('🔗 REC-ONE Simple Database Setup')
console.log('================================')
console.log('Supabase URL:', supabaseUrl)
console.log('Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'Not found')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration in .env file')
  process.exit(1)
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  console.log('\n🔍 Testing Supabase connection...')
  
  try {
    // Try a simple query that doesn't require tables
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5)

    if (error) {
      console.log('⚠️ Direct table query failed, trying alternative...')
      
      // Try auth endpoint
      const { data: authData, error: authError } = await supabase.auth.getSession()
      
      if (authError) {
        console.error('❌ Connection failed:', authError.message)
        return false
      } else {
        console.log('✅ Connection successful (via auth)')
        return true
      }
    } else {
      console.log('✅ Connection successful')
      console.log('📊 Existing tables:', data?.map(t => t.table_name).join(', ') || 'None')
      return true
    }
  } catch (err) {
    console.error('❌ Connection test failed:', err.message)
    return false
  }
}

async function createBasicTables() {
  console.log('\n📊 Creating basic tables for testing...')
  
  // Try to create a simple test table first
  try {
    const { data, error } = await supabase
      .from('test_table')
      .select('*')
      .limit(1)

    if (error && error.code === '42P01') {
      console.log('⚠️ Tables need to be created manually in Supabase Dashboard')
      console.log('\n📋 Manual Setup Instructions:')
      console.log('1. Go to: https://supabase.com/dashboard/project/jzzljxhqrbxeiqozptek')
      console.log('2. Click on "SQL Editor"')
      console.log('3. Copy and paste the SQL from create-tables.sql')
      console.log('4. Click "Run" to execute')
      console.log('\nOr use the Table Editor to create tables manually:')
      console.log('- users')
      console.log('- energy_generation') 
      console.log('- energy_offers')
      console.log('- transactions')
      console.log('- price_history')
    } else {
      console.log('✅ Database access working')
    }
  } catch (err) {
    console.log('⚠️ Table creation requires manual setup')
  }
}

async function insertTestData() {
  console.log('\n🧪 Testing data insertion...')
  
  try {
    // Try to insert a test user
    const testWallet = '0x1234567890123456789012345678901234567890'
    
    const { data, error } = await supabase
      .from('users')
      .upsert([
        {
          wallet_address: testWallet,
          username: 'test_user',
          total_energy_generated: 0,
          total_energy_sold: 0,
          total_energy_bought: 0,
          total_earnings_vnd: 0,
          reputation_score: 100
        }
      ])
      .select()

    if (error) {
      console.log('⚠️ Data insertion failed:', error.message)
      if (error.code === '42P01') {
        console.log('   → Tables need to be created first')
      }
    } else {
      console.log('✅ Test data insertion successful')
      console.log('📄 Test user created:', data)
      
      // Clean up test data
      await supabase
        .from('users')
        .delete()
        .eq('wallet_address', testWallet)
      
      console.log('🧹 Test data cleaned up')
    }
  } catch (err) {
    console.log('⚠️ Data insertion test failed:', err.message)
  }
}

async function main() {
  const connected = await testConnection()
  
  if (connected) {
    await createBasicTables()
    await insertTestData()
    
    console.log('\n🎯 Next Steps:')
    console.log('1. Create tables manually using Supabase Dashboard')
    console.log('2. Copy SQL from create-tables.sql')
    console.log('3. Run: npm run dev (to start backend server)')
    console.log('4. Test: curl http://localhost:3001/health')
  } else {
    console.log('\n❌ Setup failed - check your Supabase configuration')
  }
}

main().catch(console.error)
