import { supabaseAdmin } from '../config/supabase.js'

// Database schema setup
const createTables = async () => {
  console.log('🚀 Setting up REC-ONE database schema...')

  try {
    // 1. Users table - Store user profiles and wallet info
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          wallet_address TEXT UNIQUE NOT NULL,
          username TEXT,
          email TEXT,
          avatar_url TEXT,
          total_energy_generated DECIMAL DEFAULT 0,
          total_energy_sold DECIMAL DEFAULT 0,
          total_energy_bought DECIMAL DEFAULT 0,
          total_earnings_vnd DECIMAL DEFAULT 0,
          total_spent_vnd DECIMAL DEFAULT 0,
          reputation_score INTEGER DEFAULT 100,
          is_verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
        CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at);
      `
    })

    // 2. Energy Generation table - Track energy production
    await supabaseAdmin.rpc('exec_sql', {
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
        
        CREATE INDEX IF NOT EXISTS idx_generation_user ON energy_generation(user_id);
        CREATE INDEX IF NOT EXISTS idx_generation_wallet ON energy_generation(wallet_address);
        CREATE INDEX IF NOT EXISTS idx_generation_timestamp ON energy_generation(timestamp);
        CREATE INDEX IF NOT EXISTS idx_generation_tx ON energy_generation(tx_hash);
      `
    })

    // 3. Energy Offers table - Track marketplace offers
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS energy_offers (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          offer_id BIGINT UNIQUE NOT NULL,
          seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
          seller_wallet TEXT NOT NULL,
          quantity DECIMAL NOT NULL,
          price_per_kwh_eth DECIMAL NOT NULL,
          price_per_kwh_vnd DECIMAL NOT NULL,
          total_price_eth DECIMAL NOT NULL,
          total_price_vnd DECIMAL NOT NULL,
          status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled')),
          tx_hash_created TEXT NOT NULL,
          tx_hash_completed TEXT,
          buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
          buyer_wallet TEXT,
          block_number_created BIGINT,
          block_number_completed BIGINT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          completed_at TIMESTAMP WITH TIME ZONE,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_offers_offer_id ON energy_offers(offer_id);
        CREATE INDEX IF NOT EXISTS idx_offers_seller ON energy_offers(seller_id);
        CREATE INDEX IF NOT EXISTS idx_offers_status ON energy_offers(status);
        CREATE INDEX IF NOT EXISTS idx_offers_created ON energy_offers(created_at);
      `
    })

    // 4. Transactions table - All blockchain transactions
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS transactions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          tx_hash TEXT UNIQUE NOT NULL,
          from_address TEXT NOT NULL,
          to_address TEXT NOT NULL,
          transaction_type TEXT NOT NULL CHECK (transaction_type IN ('energy_generation', 'offer_creation', 'energy_purchase', 'offer_cancellation')),
          offer_id BIGINT,
          quantity DECIMAL,
          price_eth DECIMAL,
          price_vnd DECIMAL,
          gas_used BIGINT,
          gas_price BIGINT,
          gas_fee_eth DECIMAL,
          gas_fee_vnd DECIMAL,
          block_number BIGINT NOT NULL,
          block_timestamp TIMESTAMP WITH TIME ZONE,
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          confirmed_at TIMESTAMP WITH TIME ZONE
        );
        
        CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(tx_hash);
        CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_address);
        CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
        CREATE INDEX IF NOT EXISTS idx_transactions_block ON transactions(block_number);
        CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(block_timestamp);
      `
    })

    // 5. Price History table - Track VND/ETH exchange rates
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS price_history (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          eth_to_usd DECIMAL NOT NULL,
          vnd_to_usd DECIMAL NOT NULL,
          eth_to_vnd DECIMAL NOT NULL,
          source TEXT DEFAULT 'api',
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_price_timestamp ON price_history(timestamp);
      `
    })

    // 6. User Stats table - Aggregated statistics
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS user_stats (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          energy_generated DECIMAL DEFAULT 0,
          energy_sold DECIMAL DEFAULT 0,
          energy_bought DECIMAL DEFAULT 0,
          earnings_vnd DECIMAL DEFAULT 0,
          spent_vnd DECIMAL DEFAULT 0,
          offers_created INTEGER DEFAULT 0,
          offers_sold INTEGER DEFAULT 0,
          purchases_made INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, date)
        );
        
        CREATE INDEX IF NOT EXISTS idx_stats_user_date ON user_stats(user_id, date);
      `
    })

    // 7. System Logs table - Application logs
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS system_logs (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
          message TEXT NOT NULL,
          metadata JSONB,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          wallet_address TEXT,
          tx_hash TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_logs_level ON system_logs(level);
        CREATE INDEX IF NOT EXISTS idx_logs_created ON system_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_logs_user ON system_logs(user_id);
      `
    })

    console.log('✅ Database schema created successfully!')

    // Insert initial data
    await insertInitialData()

  } catch (error) {
    console.error('❌ Error creating database schema:', error)
    throw error
  }
}

// Insert initial data
const insertInitialData = async () => {
  try {
    // Insert initial exchange rates and tariff reference
    await supabaseAdmin
      .from('price_history')
      .insert([
        {
          eth_to_usd: 2000,
          vnd_to_usd: 0.0000417, // 1/24000
          eth_to_vnd: 48000000, // 2000 * 24000
          source: 'initial'
        }
      ])

    // Insert Vietnam electricity tariff reference data
    const tariffData = [
      { tier: 'Tier 1', min_kwh: 0, max_kwh: 50, price_vnd: 1984, description: 'Basic consumption' },
      { tier: 'Tier 2', min_kwh: 51, max_kwh: 100, price_vnd: 2050, description: 'Low consumption' },
      { tier: 'Tier 3', min_kwh: 101, max_kwh: 200, price_vnd: 2380, description: 'Medium consumption' },
      { tier: 'Tier 4', min_kwh: 201, max_kwh: 300, price_vnd: 2998, description: 'High consumption' },
      { tier: 'Tier 5', min_kwh: 301, max_kwh: 400, price_vnd: 3350, description: 'Very high consumption' },
      { tier: 'Tier 6', min_kwh: 401, max_kwh: null, price_vnd: 3460, description: 'Maximum tier' }
    ]

    // Create tariff reference table if it doesn't exist
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS vietnam_electricity_tariff (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          tier TEXT NOT NULL,
          min_kwh INTEGER NOT NULL,
          max_kwh INTEGER,
          price_vnd DECIMAL NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_tariff_tier ON vietnam_electricity_tariff(tier);
      `
    })

    // Insert tariff data
    for (const tariff of tariffData) {
      await supabaseAdmin
        .from('vietnam_electricity_tariff')
        .upsert(tariff, { onConflict: 'tier' })
    }

    console.log('✅ Initial data inserted successfully!')
  } catch (error) {
    console.error('❌ Error inserting initial data:', error)
  }
}

// Create RPC functions for database operations
const createRPCFunctions = async () => {
  try {
    // Function to execute raw SQL (if admin privileges available)
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION exec_sql(sql text)
        RETURNS void AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    })

    // Function to update user reputation
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION update_reputation(wallet_addr text, reputation_change integer)
        RETURNS void AS $$
        BEGIN
          UPDATE users
          SET reputation_score = GREATEST(0, LEAST(1000, reputation_score + reputation_change)),
              updated_at = NOW()
          WHERE wallet_address = wallet_addr;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    })

    // Function to get user statistics
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION get_user_daily_stats(wallet_addr text, target_date date)
        RETURNS TABLE(
          energy_generated decimal,
          energy_sold decimal,
          energy_bought decimal,
          earnings_vnd decimal,
          spent_vnd decimal
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT
            COALESCE(SUM(eg.quantity), 0) as energy_generated,
            COALESCE(SUM(CASE WHEN eo.status = 'sold' THEN eo.quantity ELSE 0 END), 0) as energy_sold,
            COALESCE(SUM(CASE WHEN t.transaction_type = 'energy_purchase' AND t.from_address = wallet_addr THEN t.quantity ELSE 0 END), 0) as energy_bought,
            COALESCE(SUM(CASE WHEN eo.status = 'sold' THEN eo.total_price_vnd ELSE 0 END), 0) as earnings_vnd,
            COALESCE(SUM(CASE WHEN t.transaction_type = 'energy_purchase' AND t.from_address = wallet_addr THEN t.price_vnd ELSE 0 END), 0) as spent_vnd
          FROM users u
          LEFT JOIN energy_generation eg ON u.id = eg.user_id AND DATE(eg.created_at) = target_date
          LEFT JOIN energy_offers eo ON u.id = eo.seller_id AND DATE(eo.created_at) = target_date
          LEFT JOIN transactions t ON (t.from_address = wallet_addr OR t.to_address = wallet_addr) AND DATE(t.created_at) = target_date
          WHERE u.wallet_address = wallet_addr
          GROUP BY u.id;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    })

    console.log('✅ RPC functions created successfully!')
  } catch (error) {
    console.log('ℹ️ Some RPC functions may already exist or require admin privileges')
    console.log('   You can create them manually in Supabase SQL Editor if needed')
  }
}

// Main setup function
const setupDatabase = async () => {
  try {
    console.log('🚀 Starting REC-ONE database setup...')

    await createRPCFunctions()
    await createTables()

    console.log('🎉 Database setup completed successfully!')
    console.log('📊 You can now view your tables in Supabase Dashboard:')
    console.log('   https://supabase.com/dashboard/project/jzzljxhqrbxeiqozptek')

  } catch (error) {
    console.error('❌ Database setup failed:', error)
    process.exit(1)
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase()
}

export { setupDatabase, createTables, insertInitialData }
