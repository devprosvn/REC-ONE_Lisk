#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

console.log('🗄️ Manual Table Creation for REC-ONE')
console.log('===================================')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createTables() {
  console.log('📊 Creating tables manually...')

  // Create users table
  try {
    console.log('1. Creating users table...')
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          wallet_address: '0x0000000000000000000000000000000000000000',
          username: 'test',
          total_energy_generated: 0,
          total_energy_sold: 0,
          total_energy_bought: 0,
          total_earnings_vnd: 0,
          reputation_score: 100
        }
      ])
      .select()

    if (error) {
      if (error.code === '42P01') {
        console.log('⚠️ Users table does not exist - needs manual creation')
        console.log('   Go to Supabase Dashboard → Table Editor → Create Table')
        console.log('   Table name: users')
        console.log('   Columns:')
        console.log('   - id (uuid, primary key, default: gen_random_uuid())')
        console.log('   - wallet_address (text, unique, not null)')
        console.log('   - username (text)')
        console.log('   - email (text)')
        console.log('   - total_energy_generated (numeric, default: 0)')
        console.log('   - total_energy_sold (numeric, default: 0)')
        console.log('   - total_energy_bought (numeric, default: 0)')
        console.log('   - total_earnings_vnd (numeric, default: 0)')
        console.log('   - reputation_score (int4, default: 100)')
        console.log('   - created_at (timestamptz, default: now())')
        console.log('   - updated_at (timestamptz, default: now())')
      } else {
        console.log('❌ Error creating users:', error.message)
      }
    } else {
      console.log('✅ Users table exists and working')
      // Clean up test data
      await supabase
        .from('users')
        .delete()
        .eq('wallet_address', '0x0000000000000000000000000000000000000000')
    }
  } catch (err) {
    console.log('⚠️ Users table check failed:', err.message)
  }

  // Create energy_generation table
  try {
    console.log('2. Creating energy_generation table...')
    const { data, error } = await supabase
      .from('energy_generation')
      .select('*')
      .limit(1)

    if (error && error.code === '42P01') {
      console.log('⚠️ Energy generation table does not exist - needs manual creation')
      console.log('   Table name: energy_generation')
      console.log('   Columns:')
      console.log('   - id (uuid, primary key, default: gen_random_uuid())')
      console.log('   - user_id (uuid, foreign key to users.id)')
      console.log('   - wallet_address (text, not null)')
      console.log('   - quantity (numeric, not null)')
      console.log('   - tx_hash (text, unique, not null)')
      console.log('   - block_number (int8)')
      console.log('   - gas_used (int8)')
      console.log('   - gas_price (int8)')
      console.log('   - timestamp (timestamptz, default: now())')
      console.log('   - created_at (timestamptz, default: now())')
    } else {
      console.log('✅ Energy generation table exists')
    }
  } catch (err) {
    console.log('⚠️ Energy generation table check failed:', err.message)
  }

  // Create energy_offers table
  try {
    console.log('3. Creating energy_offers table...')
    const { data, error } = await supabase
      .from('energy_offers')
      .select('*')
      .limit(1)

    if (error && error.code === '42P01') {
      console.log('⚠️ Energy offers table does not exist - needs manual creation')
      console.log('   Table name: energy_offers')
      console.log('   Columns:')
      console.log('   - id (uuid, primary key, default: gen_random_uuid())')
      console.log('   - offer_id (int8, unique, not null)')
      console.log('   - seller_id (uuid, foreign key to users.id)')
      console.log('   - seller_wallet (text, not null)')
      console.log('   - buyer_id (uuid, foreign key to users.id)')
      console.log('   - buyer_wallet (text)')
      console.log('   - quantity (numeric, not null)')
      console.log('   - price_per_kwh_eth (numeric, not null)')
      console.log('   - price_per_kwh_vnd (numeric, not null)')
      console.log('   - total_price_eth (numeric, not null)')
      console.log('   - total_price_vnd (numeric, not null)')
      console.log('   - status (text, default: "active")')
      console.log('   - tx_hash_created (text, not null)')
      console.log('   - tx_hash_completed (text)')
      console.log('   - block_number_created (int8)')
      console.log('   - block_number_completed (int8)')
      console.log('   - created_at (timestamptz, default: now())')
      console.log('   - completed_at (timestamptz)')
      console.log('   - updated_at (timestamptz, default: now())')
    } else {
      console.log('✅ Energy offers table exists')
    }
  } catch (err) {
    console.log('⚠️ Energy offers table check failed:', err.message)
  }

  console.log('\n🎯 Manual Setup Instructions:')
  console.log('1. Go to: https://supabase.com/dashboard/project/jzzljxhqrbxeiqozptek')
  console.log('2. Click "Table Editor" in the left sidebar')
  console.log('3. Click "Create a new table" button')
  console.log('4. Create tables with the column specifications above')
  console.log('5. Or use SQL Editor and paste the SQL from create-tables.sql')
  console.log('\n📋 Required Tables:')
  console.log('- users')
  console.log('- energy_generation')
  console.log('- energy_offers')
  console.log('- transactions (optional)')
  console.log('- price_history (optional)')
}

async function testAPI() {
  console.log('\n🧪 Testing API endpoints...')
  
  try {
    // Test users endpoint
    const response = await fetch('http://localhost:3002/api/v1/users/0x1234567890123456789012345678901234567890')
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Users API working')
    } else {
      console.log('⚠️ Users API response:', result.message)
    }
  } catch (err) {
    console.log('❌ API test failed:', err.message)
  }
}

async function main() {
  await createTables()
  await testAPI()
  
  console.log('\n🚀 Next Steps:')
  console.log('1. Create tables manually in Supabase Dashboard')
  console.log('2. Test frontend integration')
  console.log('3. Generate energy and create offers')
  console.log('4. Verify data is saved to database')
}

main().catch(console.error)
