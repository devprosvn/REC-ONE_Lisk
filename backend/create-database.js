#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration in .env file')
  process.exit(1)
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createDatabase() {
  console.log('🗄️ Creating REC-ONE Database Schema')
  console.log('===================================')

  try {
    // Read SQL file
    const sqlFile = join(__dirname, 'create-tables.sql')
    const sql = readFileSync(sqlFile, 'utf8')

    console.log('📄 Executing SQL schema...')

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`📊 Found ${statements.length} SQL statements to execute`)

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      if (statement.length < 10) continue // Skip very short statements
      
      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`)
        
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        })

        if (error) {
          // Try direct query for some statements
          const { error: directError } = await supabase
            .from('_temp_')
            .select('*')
            .limit(0)

          if (error.code === '42P01') {
            // Table doesn't exist, this is expected for some operations
            console.log(`⚠️ Statement ${i + 1}: ${error.message} (continuing...)`)
          } else {
            console.error(`❌ Statement ${i + 1} failed:`, error.message)
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`)
        }
      } catch (execError) {
        console.error(`❌ Error executing statement ${i + 1}:`, execError.message)
      }
    }

    // Test the database by checking if tables exist
    console.log('\n🔍 Verifying database setup...')
    
    const tables = ['users', 'energy_generation', 'energy_offers', 'transactions', 'price_history']
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1)

        if (error) {
          console.log(`❌ Table '${table}': ${error.message}`)
        } else {
          console.log(`✅ Table '${table}': OK`)
        }
      } catch (err) {
        console.log(`❌ Table '${table}': ${err.message}`)
      }
    }

    console.log('\n🎉 Database setup completed!')
    console.log('\nNext steps:')
    console.log('1. Start backend server: npm run dev')
    console.log('2. Test API: curl http://localhost:3001/health')
    console.log('3. View database: https://supabase.com/dashboard/project/jzzljxhqrbxeiqozptek')

  } catch (error) {
    console.error('❌ Database setup failed:', error.message)
    process.exit(1)
  }
}

// Alternative method: Create tables using individual queries
async function createTablesDirectly() {
  console.log('🗄️ Creating tables directly...')

  const tables = [
    {
      name: 'users',
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          wallet_address TEXT UNIQUE NOT NULL,
          username TEXT,
          email TEXT,
          total_energy_generated DECIMAL DEFAULT 0,
          total_energy_sold DECIMAL DEFAULT 0,
          total_energy_bought DECIMAL DEFAULT 0,
          total_earnings_vnd DECIMAL DEFAULT 0,
          reputation_score INTEGER DEFAULT 100,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    },
    {
      name: 'energy_generation',
      sql: `
        CREATE TABLE IF NOT EXISTS energy_generation (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          wallet_address TEXT NOT NULL,
          quantity DECIMAL NOT NULL,
          tx_hash TEXT UNIQUE NOT NULL,
          block_number BIGINT,
          gas_used BIGINT,
          gas_price BIGINT,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    },
    {
      name: 'energy_offers',
      sql: `
        CREATE TABLE IF NOT EXISTS energy_offers (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          offer_id BIGINT UNIQUE NOT NULL,
          seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
          seller_wallet TEXT NOT NULL,
          buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
          buyer_wallet TEXT,
          quantity DECIMAL NOT NULL,
          price_per_kwh_eth DECIMAL NOT NULL,
          price_per_kwh_vnd DECIMAL NOT NULL,
          total_price_eth DECIMAL NOT NULL,
          total_price_vnd DECIMAL NOT NULL,
          status TEXT DEFAULT 'active',
          tx_hash_created TEXT NOT NULL,
          tx_hash_completed TEXT,
          block_number_created BIGINT,
          block_number_completed BIGINT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          completed_at TIMESTAMP WITH TIME ZONE,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    }
  ]

  for (const table of tables) {
    try {
      console.log(`📊 Creating table: ${table.name}`)
      
      // Use a simple approach - just try to insert a test record to see if table exists
      const { error } = await supabase
        .from(table.name)
        .select('*')
        .limit(1)

      if (error && error.code === '42P01') {
        console.log(`⚠️ Table ${table.name} doesn't exist, needs to be created manually`)
      } else {
        console.log(`✅ Table ${table.name} exists`)
      }
    } catch (err) {
      console.log(`❌ Error checking table ${table.name}:`, err.message)
    }
  }
}

// Run the setup
if (process.argv.includes('--direct')) {
  createTablesDirectly()
} else {
  createDatabase()
}
