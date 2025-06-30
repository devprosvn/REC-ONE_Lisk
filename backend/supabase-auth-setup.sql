-- Supabase Auth & User Profiles Setup for REC-ONE
-- This creates the necessary tables and policies for user management

-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  wallet_address TEXT UNIQUE,
  bio TEXT,
  location TEXT,
  phone TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  reputation_score INTEGER DEFAULT 0,
  total_energy_sold DECIMAL DEFAULT 0,
  total_energy_bought DECIMAL DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address ON public.profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_profiles_reputation ON public.profiles(reputation_score DESC);

-- Create trades table for transaction history
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  offer_id BIGINT NOT NULL,
  buyer_id UUID REFERENCES public.profiles(id),
  seller_id UUID REFERENCES public.profiles(id),
  buyer_wallet TEXT NOT NULL,
  seller_wallet TEXT NOT NULL,
  buyer_name TEXT,
  seller_name TEXT,
  quantity DECIMAL NOT NULL,
  price_per_kwh DECIMAL NOT NULL,
  total_price DECIMAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ETH',
  chain_id INTEGER NOT NULL,
  chain_name TEXT NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  block_number BIGINT,
  gas_used BIGINT,
  gas_price BIGINT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for trades
CREATE INDEX IF NOT EXISTS idx_trades_offer_id ON public.trades(offer_id);
CREATE INDEX IF NOT EXISTS idx_trades_buyer_id ON public.trades(buyer_id);
CREATE INDEX IF NOT EXISTS idx_trades_seller_id ON public.trades(seller_id);
CREATE INDEX IF NOT EXISTS idx_trades_tx_hash ON public.trades(tx_hash);
CREATE INDEX IF NOT EXISTS idx_trades_chain_id ON public.trades(chain_id);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON public.trades(created_at DESC);

-- Create user_sessions table for tracking active sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  chain_name TEXT NOT NULL,
  session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_end TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_wallet ON public.user_sessions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active);

-- Row Level Security Policies

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trades policies
CREATE POLICY "Users can view all trades" ON public.trades
  FOR SELECT USING (true);

CREATE POLICY "System can insert trades" ON public.trades
  FOR INSERT WITH CHECK (true);

-- User sessions policies
CREATE POLICY "Users can view own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update profile updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update user statistics
CREATE OR REPLACE FUNCTION public.update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update seller stats
  UPDATE public.profiles
  SET 
    total_energy_sold = total_energy_sold + NEW.quantity,
    total_transactions = total_transactions + 1,
    reputation_score = reputation_score + 1,
    updated_at = NOW()
  WHERE id = NEW.seller_id;
  
  -- Update buyer stats
  UPDATE public.profiles
  SET 
    total_energy_bought = total_energy_bought + NEW.quantity,
    total_transactions = total_transactions + 1,
    updated_at = NOW()
  WHERE id = NEW.buyer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update user stats when trade is completed
CREATE TRIGGER update_user_stats_on_trade
  AFTER INSERT ON public.trades
  FOR EACH ROW 
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.update_user_stats();

-- Create view for user profiles with stats
CREATE OR REPLACE VIEW public.user_profiles_with_stats AS
SELECT 
  p.*,
  COALESCE(seller_trades.total_sold, 0) as total_sold_amount,
  COALESCE(buyer_trades.total_bought, 0) as total_bought_amount,
  COALESCE(seller_trades.sell_count, 0) as sell_transaction_count,
  COALESCE(buyer_trades.buy_count, 0) as buy_transaction_count,
  CASE 
    WHEN p.total_transactions > 0 THEN 
      ROUND((p.reputation_score::DECIMAL / p.total_transactions) * 100, 2)
    ELSE 0 
  END as reputation_percentage
FROM public.profiles p
LEFT JOIN (
  SELECT 
    seller_id,
    SUM(total_price) as total_sold,
    COUNT(*) as sell_count
  FROM public.trades 
  WHERE status = 'completed'
  GROUP BY seller_id
) seller_trades ON p.id = seller_trades.seller_id
LEFT JOIN (
  SELECT 
    buyer_id,
    SUM(total_price) as total_bought,
    COUNT(*) as buy_count
  FROM public.trades 
  WHERE status = 'completed'
  GROUP BY buyer_id
) buyer_trades ON p.id = buyer_trades.buyer_id;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.trades TO authenticated;
GRANT ALL ON public.user_sessions TO authenticated;
GRANT SELECT ON public.user_profiles_with_stats TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.profiles IS 'User profiles with wallet integration';
COMMENT ON TABLE public.trades IS 'Transaction history from blockchain events';
COMMENT ON TABLE public.user_sessions IS 'User session tracking for analytics';
COMMENT ON VIEW public.user_profiles_with_stats IS 'User profiles with calculated statistics';

COMMENT ON COLUMN public.profiles.wallet_address IS 'Primary wallet address for the user';
COMMENT ON COLUMN public.profiles.reputation_score IS 'User reputation based on successful transactions';
COMMENT ON COLUMN public.trades.chain_id IS 'Blockchain network ID where transaction occurred';
COMMENT ON COLUMN public.trades.currency IS 'Currency used for the transaction (ETH, VNST, DPSV, etc.)';

-- Create function to get user by wallet address
CREATE OR REPLACE FUNCTION public.get_user_by_wallet(wallet_addr TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  wallet_address TEXT,
  reputation_score INTEGER,
  total_transactions INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.display_name,
    p.avatar_url,
    p.wallet_address,
    p.reputation_score,
    p.total_transactions
  FROM public.profiles p
  WHERE LOWER(p.wallet_address) = LOWER(wallet_addr);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
