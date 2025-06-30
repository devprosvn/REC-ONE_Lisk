-- REC-ONE Database Schema
-- Execute this SQL in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
  email TEXT,
  total_energy_generated DECIMAL DEFAULT 0,
  total_energy_sold DECIMAL DEFAULT 0,
  total_energy_bought DECIMAL DEFAULT 0,
  available_energy_balance DECIMAL DEFAULT 0,
  total_earnings_vnd DECIMAL DEFAULT 0,
  reputation_score INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Energy Generation table
CREATE TABLE IF NOT EXISTS energy_generation (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
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

-- Energy Offers table
CREATE TABLE IF NOT EXISTS energy_offers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
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
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled')),
  tx_hash_created TEXT NOT NULL,
  tx_hash_completed TEXT,
  block_number_created BIGINT,
  block_number_completed BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tx_hash TEXT UNIQUE NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  offer_id BIGINT,
  quantity DECIMAL,
  price_eth DECIMAL,
  price_vnd DECIMAL,
  gas_used BIGINT,
  gas_price BIGINT,
  block_number BIGINT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Price History table
CREATE TABLE IF NOT EXISTS price_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  eth_to_usd DECIMAL NOT NULL,
  vnd_to_usd DECIMAL NOT NULL,
  eth_to_vnd DECIMAL NOT NULL,
  source TEXT DEFAULT 'api',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Stats table
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  energy_generated DECIMAL DEFAULT 0,
  energy_sold DECIMAL DEFAULT 0,
  energy_bought DECIMAL DEFAULT 0,
  earnings_vnd DECIMAL DEFAULT 0,
  offers_created INTEGER DEFAULT 0,
  offers_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- System Logs table
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vietnam Electricity Tariff Reference table
CREATE TABLE IF NOT EXISTS vietnam_electricity_tariff (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tier TEXT NOT NULL UNIQUE,
  min_kwh INTEGER NOT NULL,
  max_kwh INTEGER,
  price_vnd DECIMAL NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_energy_generation_user ON energy_generation(user_id);
CREATE INDEX IF NOT EXISTS idx_energy_generation_wallet ON energy_generation(wallet_address);
CREATE INDEX IF NOT EXISTS idx_energy_generation_tx ON energy_generation(tx_hash);
CREATE INDEX IF NOT EXISTS idx_energy_offers_seller ON energy_offers(seller_id);
CREATE INDEX IF NOT EXISTS idx_energy_offers_buyer ON energy_offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_energy_offers_status ON energy_offers(status);
CREATE INDEX IF NOT EXISTS idx_energy_offers_created ON energy_offers(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions(to_address);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_date ON user_stats(user_id, date);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at);

-- Insert Vietnam electricity tariff data
INSERT INTO vietnam_electricity_tariff (tier, min_kwh, max_kwh, price_vnd, description) VALUES
('Tier 1', 0, 50, 1984, 'Basic consumption'),
('Tier 2', 51, 100, 2050, 'Low consumption'),
('Tier 3', 101, 200, 2380, 'Medium consumption'),
('Tier 4', 201, 300, 2998, 'High consumption'),
('Tier 5', 301, 400, 3350, 'Very high consumption'),
('Tier 6', 401, NULL, 3460, 'Maximum tier')
ON CONFLICT (tier) DO NOTHING;

-- Insert initial price history
INSERT INTO price_history (eth_to_usd, vnd_to_usd, eth_to_vnd, source) VALUES
(2000, 0.0000417, 48000000, 'initial')
ON CONFLICT DO NOTHING;

-- Create RPC function to get user statistics
CREATE OR REPLACE FUNCTION get_user_statistics(user_wallet TEXT)
RETURNS TABLE (
  total_energy_generated DECIMAL,
  total_energy_sold DECIMAL,
  total_energy_bought DECIMAL,
  total_earnings_vnd DECIMAL,
  active_offers_count BIGINT,
  completed_offers_count BIGINT,
  reputation_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.total_energy_generated,
    u.total_energy_sold,
    u.total_energy_bought,
    u.total_earnings_vnd,
    (SELECT COUNT(*) FROM energy_offers WHERE seller_wallet = user_wallet AND status = 'active'),
    (SELECT COUNT(*) FROM energy_offers WHERE seller_wallet = user_wallet AND status = 'sold'),
    u.reputation_score
  FROM users u
  WHERE u.wallet_address = user_wallet;
END;
$$ LANGUAGE plpgsql;

-- Create function to update user stats with energy balance tracking
CREATE OR REPLACE FUNCTION update_user_energy_stats(
  user_wallet TEXT,
  stat_type TEXT,
  quantity_val DECIMAL,
  earnings_val DECIMAL DEFAULT 0
) RETURNS VOID AS $$
DECLARE
  user_id_val UUID;
BEGIN
  -- Get or create user
  INSERT INTO users (wallet_address)
  VALUES (user_wallet)
  ON CONFLICT (wallet_address) DO NOTHING;

  SELECT id INTO user_id_val FROM users WHERE wallet_address = user_wallet;

  -- Update user stats based on type
  IF stat_type = 'generated' THEN
    UPDATE users SET
      total_energy_generated = total_energy_generated + quantity_val,
      available_energy_balance = available_energy_balance + quantity_val,
      updated_at = NOW()
    WHERE id = user_id_val;
  ELSIF stat_type = 'sold' THEN
    UPDATE users SET
      total_energy_sold = total_energy_sold + quantity_val,
      available_energy_balance = available_energy_balance - quantity_val,
      total_earnings_vnd = total_earnings_vnd + earnings_val,
      reputation_score = reputation_score + 1,
      updated_at = NOW()
    WHERE id = user_id_val;
  ELSIF stat_type = 'bought' THEN
    UPDATE users SET
      total_energy_bought = total_energy_bought + quantity_val,
      updated_at = NOW()
    WHERE id = user_id_val;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to check available energy balance
CREATE OR REPLACE FUNCTION get_available_energy_balance(user_wallet TEXT)
RETURNS DECIMAL AS $$
DECLARE
  balance_val DECIMAL;
BEGIN
  SELECT available_energy_balance INTO balance_val
  FROM users
  WHERE wallet_address = user_wallet;

  RETURN COALESCE(balance_val, 0);
END;
$$ LANGUAGE plpgsql;

-- Create function to validate energy offer against available balance
CREATE OR REPLACE FUNCTION validate_energy_offer(
  user_wallet TEXT,
  offer_quantity DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
  available_balance DECIMAL;
  pending_offers DECIMAL;
  total_committed DECIMAL;
BEGIN
  -- Get current available balance
  SELECT available_energy_balance INTO available_balance
  FROM users
  WHERE wallet_address = user_wallet;

  -- Get total quantity in pending offers
  SELECT COALESCE(SUM(quantity), 0) INTO pending_offers
  FROM energy_offers
  WHERE seller_wallet = user_wallet AND status = 'active';

  -- Calculate total committed energy
  total_committed = pending_offers + offer_quantity;

  -- Check if user has enough available energy
  RETURN COALESCE(available_balance, 0) >= total_committed;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (optional)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE energy_generation ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE energy_offers ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE users IS 'User profiles and wallet information';
COMMENT ON TABLE energy_generation IS 'Energy production records from blockchain';
COMMENT ON TABLE energy_offers IS 'Marketplace energy offers';
COMMENT ON TABLE transactions IS 'All blockchain transactions';
COMMENT ON TABLE price_history IS 'VND/ETH exchange rate history';
COMMENT ON TABLE user_stats IS 'Daily aggregated user statistics';
COMMENT ON TABLE system_logs IS 'Application logs and events';
COMMENT ON TABLE vietnam_electricity_tariff IS 'Vietnam electricity pricing reference';

-- Grant permissions (adjust as needed)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
