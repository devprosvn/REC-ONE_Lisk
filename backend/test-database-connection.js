#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

console.log('🔧 Testing Database Connection')
console.log('==============================')
console.log('URL:', supabaseUrl)
console.log('Key:', supabaseKey ? 'Present' : 'Missing')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabaseConnection() {
  try {
    // Test 1: Basic connection
    console.log('\n1. Testing basic connection...')
    const { data, error } = await supabase.from('users').select('count').limit(1)
    if (error) {
      console.error('❌ Basic connection failed:', error)
    } else {
      console.log('✅ Basic connection working')
    }

    // Test 2: Test database functions
    console.log('\n2. Testing database functions...')
    
    // Test get_available_energy_balance function
    const { data: balanceData, error: balanceError } = await supabase.rpc('get_available_energy_balance', {
      user_wallet: '0x742d35cc6634c0532925a3b8d4c9db96590c6c87'
    })

    if (balanceError) {
      console.error('❌ get_available_energy_balance function failed:', balanceError)
    } else {
      console.log('✅ get_available_energy_balance function working, result:', balanceData)
    }

    // Test update_user_energy_stats function
    console.log('\n3. Testing update_user_energy_stats function...')
    const { data: updateData, error: updateError } = await supabase.rpc('update_user_energy_stats', {
      user_wallet: '0x742d35cc6634c0532925a3b8d4c9db96590c6c87',
      stat_type: 'generated',
      quantity_val: 10,
      earnings_val: 0
    })

    if (updateError) {
      console.error('❌ update_user_energy_stats function failed:', updateError)
    } else {
      console.log('✅ update_user_energy_stats function working')
    }

    // Test 4: Check user after update
    console.log('\n4. Checking user after update...')
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('wallet_address, total_energy_generated, available_energy_balance')
      .eq('wallet_address', '0x742d35cc6634c0532925a3b8d4c9db96590c6c87')
      .single()

    if (userError) {
      console.error('❌ User query failed:', userError)
    } else {
      console.log('✅ User data:', userData)
    }

    // Test 5: Test energy_generation table insert
    console.log('\n5. Testing energy_generation table insert...')
    const { data: genData, error: genError } = await supabase
      .from('energy_generation')
      .insert([
        {
          wallet_address: '0x742d35cc6634c0532925a3b8d4c9db96590c6c87',
          quantity: 25,
          tx_hash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
          block_number: 123456,
          timestamp: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (genError) {
      console.error('❌ Energy generation insert failed:', genError)
    } else {
      console.log('✅ Energy generation insert working:', genData)
    }

    console.log('\n🎉 Database Connection Test Complete')
    console.log('===================================')

  } catch (error) {
    console.error('❌ Database test failed:', error)
  }
}

testDatabaseConnection()
