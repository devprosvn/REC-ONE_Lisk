import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please check your .env file.')
}

// Create Supabase client for public operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

// Create Supabase admin client for server operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Database table names
export const TABLES = {
  USERS: 'users',
  TRANSACTIONS: 'transactions', 
  ENERGY_OFFERS: 'energy_offers',
  ENERGY_GENERATION: 'energy_generation',
  PRICE_HISTORY: 'price_history',
  USER_STATS: 'user_stats',
  SYSTEM_LOGS: 'system_logs'
}

// Test database connection
export async function testConnection() {
  try {
    // Try auth connection first (doesn't require tables)
    const { data: authData, error: authError } = await supabase.auth.getSession()

    if (authError && authError.message !== 'Auth session missing!') {
      throw authError
    }

    // Try to query users table if it exists
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (error && error.code === 'PGRST116') {
      console.log('⚠️ Tables not created yet, but connection is working')
      return true
    } else if (error) {
      throw error
    }

    console.log('✅ Supabase connection and tables verified')
    return true
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message)
    return false
  }
}

export default supabase
