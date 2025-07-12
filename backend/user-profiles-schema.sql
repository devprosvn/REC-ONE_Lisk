-- REC-ONE User Profiles & Authentication Schema
-- Enhanced user management with Supabase Auth integration

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create profiles table linked to Supabase Auth
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  wallet_address TEXT UNIQUE,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  phone TEXT,
  energy_producer_type TEXT CHECK (energy_producer_type IN ('solar', 'wind', 'hydro', 'biomass', 'other')),
  installation_capacity DECIMAL(10,2), -- kW capacity
  installation_date DATE,
  verified BOOLEAN DEFAULT FALSE,
  reputation_score INTEGER DEFAULT 0,
  total_energy_sold DECIMAL(15,3) DEFAULT 0,
  total_energy_bought DECIMAL(15,3) DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view all profiles (for marketplace)
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Update existing energy_offers table to reference profiles
ALTER TABLE energy_offers 
ADD COLUMN IF NOT EXISTS seller_profile_id UUID REFERENCES profiles(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address ON profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_energy_offers_seller_profile ON energy_offers(seller_profile_id);

-- Create view for user stats
CREATE OR REPLACE VIEW user_stats AS
SELECT 
  p.id,
  p.display_name,
  p.wallet_address,
  p.avatar_url,
  p.reputation_score,
  p.energy_producer_type,
  p.installation_capacity,
  COUNT(DISTINCT eo.id) as total_offers_created,
  COUNT(DISTINCT CASE WHEN eo.status = 'sold' THEN eo.id END) as total_offers_sold,
  COUNT(DISTINCT CASE WHEN eo.status = 'active' THEN eo.id END) as active_offers,
  COALESCE(SUM(CASE WHEN eo.status = 'sold' THEN eo.quantity END), 0) as total_energy_sold,
  COALESCE(SUM(CASE WHEN eo.status = 'sold' THEN eo.total_price_eth END), 0) as total_eth_earned,
  COALESCE(AVG(CASE WHEN eo.status = 'sold' THEN eo.price_per_kwh_eth END), 0) as avg_price_per_kwh
FROM profiles p
LEFT JOIN energy_offers eo ON p.id = eo.seller_profile_id
GROUP BY p.id, p.display_name, p.wallet_address, p.avatar_url, p.reputation_score, 
         p.energy_producer_type, p.installation_capacity;

-- Create trades table for transaction history
CREATE TABLE IF NOT EXISTS trades (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  offer_id BIGINT NOT NULL,
  buyer_profile_id UUID REFERENCES profiles(id),
  seller_profile_id UUID REFERENCES profiles(id),
  buyer_wallet_address TEXT NOT NULL,
  seller_wallet_address TEXT NOT NULL,
  quantity DECIMAL(10,3) NOT NULL,
  price_per_kwh_eth DECIMAL(18,8) NOT NULL,
  total_price_eth DECIMAL(18,8) NOT NULL,
  price_per_kwh_vnd DECIMAL(15,2),
  total_price_vnd DECIMAL(18,2),
  transaction_hash TEXT NOT NULL UNIQUE,
  block_number BIGINT,
  block_timestamp TIMESTAMP WITH TIME ZONE,
  gas_used BIGINT,
  gas_price BIGINT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for trades
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Users can view trades they're involved in
CREATE POLICY "Users can view their trades" ON trades
  FOR SELECT USING (
    auth.uid() = buyer_profile_id OR 
    auth.uid() = seller_profile_id
  );

-- Create indexes for trades
CREATE INDEX IF NOT EXISTS idx_trades_buyer_profile ON trades(buyer_profile_id);
CREATE INDEX IF NOT EXISTS idx_trades_seller_profile ON trades(seller_profile_id);
CREATE INDEX IF NOT EXISTS idx_trades_transaction_hash ON trades(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at DESC);

-- Create view for user trade history
CREATE OR REPLACE VIEW user_trade_history AS
SELECT 
  t.*,
  bp.display_name as buyer_name,
  bp.avatar_url as buyer_avatar,
  sp.display_name as seller_name,
  sp.avatar_url as seller_avatar,
  CASE 
    WHEN t.buyer_profile_id = auth.uid() THEN 'buy'
    WHEN t.seller_profile_id = auth.uid() THEN 'sell'
    ELSE 'unknown'
  END as trade_type
FROM trades t
LEFT JOIN profiles bp ON t.buyer_profile_id = bp.id
LEFT JOIN profiles sp ON t.seller_profile_id = sp.id
WHERE t.buyer_profile_id = auth.uid() OR t.seller_profile_id = auth.uid()
ORDER BY t.created_at DESC;

-- Function to update user stats after trade
CREATE OR REPLACE FUNCTION update_user_stats_after_trade()
RETURNS TRIGGER AS $$
BEGIN
  -- Update seller stats
  UPDATE profiles 
  SET 
    total_energy_sold = total_energy_sold + NEW.quantity,
    total_transactions = total_transactions + 1,
    reputation_score = reputation_score + 1,
    updated_at = NOW()
  WHERE id = NEW.seller_profile_id;
  
  -- Update buyer stats
  UPDATE profiles 
  SET 
    total_energy_bought = total_energy_bought + NEW.quantity,
    total_transactions = total_transactions + 1,
    updated_at = NOW()
  WHERE id = NEW.buyer_profile_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update stats when trade is completed
CREATE TRIGGER update_stats_on_trade_completion
  AFTER INSERT ON trades
  FOR EACH ROW 
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_user_stats_after_trade();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.trades TO authenticated;
GRANT SELECT ON public.user_stats TO authenticated;
GRANT SELECT ON public.user_trade_history TO authenticated;

-- Comments for documentation
COMMENT ON TABLE profiles IS 'User profiles with enhanced information and Supabase Auth integration';
COMMENT ON TABLE trades IS 'Complete transaction history with user-friendly information';
COMMENT ON VIEW user_stats IS 'Aggregated statistics for each user';
COMMENT ON VIEW user_trade_history IS 'User-specific trade history with names and avatars';

-- Create indexer state table for tracking blockchain sync
CREATE TABLE IF NOT EXISTS indexer_state (
  service_name TEXT PRIMARY KEY,
  last_processed_block BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policy for indexer state (admin only)
ALTER TABLE indexer_state ENABLE ROW LEVEL SECURITY;

-- Only allow service accounts to access indexer state
CREATE POLICY "Indexer state is service only" ON indexer_state
  FOR ALL USING (false); -- No public access

-- Grant permissions for indexer service
GRANT ALL ON indexer_state TO service_role;

-- Create updated_at trigger for indexer_state
CREATE TRIGGER handle_indexer_state_updated_at
  BEFORE UPDATE ON indexer_state
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Comments
COMMENT ON TABLE indexer_state IS 'Tracks the last processed block for each indexer service';

-- Sample data for testing (optional)
-- INSERT INTO profiles (id, wallet_address, display_name, email, energy_producer_type, installation_capacity)
-- VALUES
--   ('550e8400-e29b-41d4-a716-446655440000', '0x742d35cc6634c0532925a3b8d4c9db96590c6c87', 'Solar Farm Owner', 'solar@example.com', 'solar', 100.5),
--   ('550e8400-e29b-41d4-a716-446655440001', '0x123456789abcdef123456789abcdef123456789a', 'Wind Energy Co', 'wind@example.com', 'wind', 250.0);
