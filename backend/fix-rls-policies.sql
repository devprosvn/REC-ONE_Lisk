-- Fix Row Level Security Policies for REC-ONE
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/jzzljxhqrbxeiqozptek/sql

-- Disable RLS for development (enable in production with proper policies)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE energy_generation DISABLE ROW LEVEL SECURITY;
ALTER TABLE energy_offers DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE price_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats DISABLE ROW LEVEL SECURITY;

-- Alternative: Create permissive policies (uncomment if you want to keep RLS enabled)
/*
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_generation ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Allow all operations on users" ON users
FOR ALL USING (true) WITH CHECK (true);

-- Create policies for energy_generation table
CREATE POLICY "Allow all operations on energy_generation" ON energy_generation
FOR ALL USING (true) WITH CHECK (true);

-- Create policies for energy_offers table
CREATE POLICY "Allow all operations on energy_offers" ON energy_offers
FOR ALL USING (true) WITH CHECK (true);

-- Create policies for transactions table
CREATE POLICY "Allow all operations on transactions" ON transactions
FOR ALL USING (true) WITH CHECK (true);

-- Create policies for price_history table
CREATE POLICY "Allow all operations on price_history" ON price_history
FOR ALL USING (true) WITH CHECK (true);

-- Create policies for user_stats table
CREATE POLICY "Allow all operations on user_stats" ON user_stats
FOR ALL USING (true) WITH CHECK (true);
*/

-- Test the fix
SELECT 'RLS Status Check:' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'energy_generation', 'energy_offers', 'transactions', 'price_history', 'user_stats')
ORDER BY tablename;

-- Test user creation
INSERT INTO users (wallet_address, username) 
VALUES ('0x742d35cc6634c0532925a3b8d4c9db96590c6c87', 'Test_User')
ON CONFLICT (wallet_address) DO NOTHING;

-- Test energy generation insert
INSERT INTO energy_generation (
  wallet_address, 
  quantity, 
  tx_hash, 
  block_number, 
  timestamp
) VALUES (
  '0x742d35cc6634c0532925a3b8d4c9db96590c6c87',
  50,
  '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  123456,
  NOW()
);

-- Test update_user_energy_stats function
SELECT update_user_energy_stats(
  '0x742d35cc6634c0532925a3b8d4c9db96590c6c87',
  'generated',
  50,
  0
);

-- Check results
SELECT 'Test Results:' as info;
SELECT 
  wallet_address,
  total_energy_generated,
  available_energy_balance,
  created_at
FROM users 
WHERE wallet_address = '0x742d35cc6634c0532925a3b8d4c9db96590c6c87';

SELECT 'Energy Generation Records:' as info;
SELECT 
  wallet_address,
  quantity,
  tx_hash,
  created_at
FROM energy_generation 
WHERE wallet_address = '0x742d35cc6634c0532925a3b8d4c9db96590c6c87'
ORDER BY created_at DESC
LIMIT 5;
