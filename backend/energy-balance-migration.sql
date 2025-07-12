-- Energy Balance Migration SQL
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/jzzljxhqrbxeiqozptek/sql

-- 1. Add available_energy_balance column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS available_energy_balance DECIMAL DEFAULT 0;

-- 2. Update existing users to set available_energy_balance = total_energy_generated - total_energy_sold
UPDATE users 
SET available_energy_balance = COALESCE(total_energy_generated, 0) - COALESCE(total_energy_sold, 0)
WHERE available_energy_balance = 0 OR available_energy_balance IS NULL;

-- 3. Create or replace the energy balance functions

-- Function to update user energy stats with balance tracking
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

-- Function to get available energy balance
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

-- Function to validate energy offer against available balance
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

-- 4. Test the functions
SELECT 'Testing get_available_energy_balance function:' as test_step;
SELECT get_available_energy_balance('0x742d35cc6634c0532925a3b8d4c9db96590c6c87') as sample_balance;

SELECT 'Testing validate_energy_offer function:' as test_step;
SELECT validate_energy_offer('0x742d35cc6634c0532925a3b8d4c9db96590c6c87', 10) as can_create_offer;

-- 5. Show current user statistics
SELECT 'Current user statistics:' as info;
SELECT 
  wallet_address,
  total_energy_generated,
  total_energy_sold,
  available_energy_balance,
  (total_energy_generated - total_energy_sold) as calculated_balance
FROM users 
ORDER BY created_at DESC 
LIMIT 5;

-- 6. Show energy offers statistics
SELECT 'Energy offers statistics:' as info;
SELECT 
  seller_wallet,
  COUNT(*) as total_offers,
  SUM(quantity) as total_quantity,
  SUM(CASE WHEN status = 'active' THEN quantity ELSE 0 END) as pending_quantity
FROM energy_offers 
GROUP BY seller_wallet
ORDER BY total_quantity DESC
LIMIT 5;
