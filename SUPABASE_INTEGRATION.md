# 🗄️ Supabase Integration for REC-ONE

## 📋 Overview

REC-ONE now integrates with **Supabase** for comprehensive data storage, user management, and analytics. This provides a robust backend infrastructure to complement the blockchain smart contracts.

## 🏗️ Database Architecture

### 📊 Database Schema

```sql
-- Users table - User profiles and wallet information
users (
  id UUID PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
  email TEXT,
  total_energy_generated DECIMAL DEFAULT 0,
  total_energy_sold DECIMAL DEFAULT 0,
  total_energy_bought DECIMAL DEFAULT 0,
  total_earnings_vnd DECIMAL DEFAULT 0,
  reputation_score INTEGER DEFAULT 100,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Energy Generation - Track energy production
energy_generation (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  wallet_address TEXT NOT NULL,
  quantity DECIMAL NOT NULL,
  tx_hash TEXT UNIQUE NOT NULL,
  block_number BIGINT,
  gas_used BIGINT,
  timestamp TIMESTAMP
)

-- Energy Offers - Marketplace offers
energy_offers (
  id UUID PRIMARY KEY,
  offer_id BIGINT UNIQUE NOT NULL,
  seller_id UUID REFERENCES users(id),
  seller_wallet TEXT NOT NULL,
  quantity DECIMAL NOT NULL,
  price_per_kwh_eth DECIMAL NOT NULL,
  price_per_kwh_vnd DECIMAL NOT NULL,
  total_price_eth DECIMAL NOT NULL,
  total_price_vnd DECIMAL NOT NULL,
  status TEXT DEFAULT 'active',
  tx_hash_created TEXT NOT NULL,
  tx_hash_completed TEXT,
  buyer_id UUID REFERENCES users(id),
  created_at TIMESTAMP,
  completed_at TIMESTAMP
)

-- Transactions - All blockchain transactions
transactions (
  id UUID PRIMARY KEY,
  tx_hash TEXT UNIQUE NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  offer_id BIGINT,
  quantity DECIMAL,
  price_eth DECIMAL,
  price_vnd DECIMAL,
  gas_used BIGINT,
  block_number BIGINT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP
)

-- Price History - VND/ETH exchange rates
price_history (
  id UUID PRIMARY KEY,
  eth_to_usd DECIMAL NOT NULL,
  vnd_to_usd DECIMAL NOT NULL,
  eth_to_vnd DECIMAL NOT NULL,
  timestamp TIMESTAMP
)

-- User Stats - Daily aggregated statistics
user_stats (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  energy_generated DECIMAL DEFAULT 0,
  energy_sold DECIMAL DEFAULT 0,
  earnings_vnd DECIMAL DEFAULT 0,
  offers_created INTEGER DEFAULT 0
)
```

## 🔧 Configuration

### Supabase Project Details
- **Project Name**: rec-one
- **URL**: https://jzzljxhqrbxeiqozptek.supabase.co
- **Database**: PostgreSQL with real-time features
- **Region**: Auto-selected optimal region

### Environment Variables
```env
SUPABASE_URL=https://jzzljxhqrbxeiqozptek.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=mc+QQjwdCqor4k4CMauvwv86lyTz9FdRh70DYJpkXJUEXvqfeXk6qg9tw8iiZwpy9fX0sluu0c5h8TU0yxCtOA==
```

## 🚀 Setup Instructions

### 1. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Setup database schema
npm run setup

# Start development server
npm run dev
```

### 2. Database Schema Creation
```bash
# Run the setup script
node setup.js

# Or manually run
npm run setup
```

### 3. Verify Setup
```bash
# Test API health
curl http://localhost:3001/health

# Test database connection
curl http://localhost:3001/api/v1/stats/overview
```

## 📡 API Integration

### Backend Services

#### UserService
```javascript
import { UserService } from './services/userService.js'

// Create or get user
const { user, isNew } = await UserService.createOrGetUser(walletAddress)

// Update user stats
await UserService.updateUserEnergyStats(walletAddress, 'generated', quantity)

// Get user statistics
const stats = await UserService.getUserStats(walletAddress)
```

#### EnergyService
```javascript
import { EnergyService } from './services/energyService.js'

// Record energy generation
await EnergyService.recordEnergyGeneration({
  walletAddress,
  quantity,
  txHash,
  blockNumber
})

// Record energy offer
await EnergyService.recordEnergyOffer({
  offerId,
  sellerWallet,
  quantity,
  pricePerKWhETH,
  pricePerKWhVND,
  txHash
})

// Get active offers with enhanced data
const offers = await EnergyService.getActiveOffers(50, 0)
```

### Frontend Integration

#### API Client
```javascript
import { apiClient } from './api/client.js'

// Record energy generation
await apiClient.recordEnergyGeneration({
  walletAddress: userAddress,
  quantity: 100,
  txHash: receipt.hash,
  blockNumber: receipt.blockNumber
})

// Get user statistics
const userStats = await apiClient.getUserStats(walletAddress)

// Get marketplace data
const offers = await apiClient.getActiveOffers()
const stats = await apiClient.getMarketplaceStats()
```

## 🔄 Data Flow

### 1. Energy Generation Flow
```
User generates energy → Smart Contract → Frontend detects event
                                    ↓
Frontend calls API → Backend records in Supabase → User stats updated
```

### 2. Energy Trading Flow
```
User creates offer → Smart Contract → Frontend detects event
                                 ↓
Frontend calls API → Backend records offer → Marketplace updated
                                 ↓
Buyer purchases → Smart Contract → Frontend detects purchase
                                 ↓
Frontend calls API → Backend updates offer status → User stats updated
```

### 3. Data Synchronization
```
Blockchain Events → Frontend Event Listeners → Backend API Calls → Supabase Database
                                                                ↓
Real-time Updates ← Frontend Queries ← Backend API ← Database Queries
```

## 📊 Analytics & Reporting

### User Analytics
```javascript
// Get user comprehensive stats
const userStats = await apiClient.getUserStats(walletAddress)
/*
{
  total_energy_generated: 500,
  total_energy_sold: 200,
  total_earnings_vnd: 480000,
  reputation_score: 105,
  stats: {
    totalGenerated: 500,
    activeOffers: 2,
    soldOffers: 8
  }
}
*/
```

### Marketplace Analytics
```javascript
// Get marketplace overview
const marketStats = await apiClient.getMarketplaceStats()
/*
{
  activeOffers: {
    count: 25,
    totalVolume: 1250,
    totalValue: 3000000,
    averagePrice: 2400
  },
  recentTrades: {
    count: 8,
    volume: 400,
    value: 960000
  }
}
*/
```

### Platform Analytics
```javascript
// Get platform overview
const overview = await apiClient.getPlatformOverview()
/*
{
  totalUsers: 150,
  totalEnergyGenerated: 50000,
  totalEnergyTraded: 25000,
  totalValueTraded: 60000000,
  averagePrice: 2400
}
*/
```

## 🔒 Security Features

### Row Level Security (RLS)
```sql
-- Users can only update their own profiles
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can view all offers but only modify their own
CREATE POLICY "Users can view all offers" ON energy_offers
  FOR SELECT USING (true);

CREATE POLICY "Users can create offers" ON energy_offers
  FOR INSERT WITH CHECK (auth.uid() = seller_id);
```

### API Security
- **Rate Limiting**: 100 requests per 15 minutes
- **Input Validation**: Joi schema validation
- **Error Handling**: No sensitive data leakage
- **CORS**: Configured for frontend domain only

## 🔄 Real-time Features

### Supabase Realtime
```javascript
// Listen for new offers
supabase
  .channel('energy_offers')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'energy_offers' },
    (payload) => {
      console.log('New offer created:', payload.new)
      updateMarketplace()
    }
  )
  .subscribe()

// Listen for offer purchases
supabase
  .channel('energy_offers')
  .on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'energy_offers' },
    (payload) => {
      if (payload.new.status === 'sold') {
        console.log('Offer sold:', payload.new)
        updateMarketplace()
      }
    }
  )
  .subscribe()
```

## 📈 Performance Optimization

### Database Indexes
```sql
-- Optimized queries with proper indexing
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_offers_status ON energy_offers(status);
CREATE INDEX idx_offers_created ON energy_offers(created_at);
CREATE INDEX idx_generation_user ON energy_generation(user_id);
CREATE INDEX idx_transactions_hash ON transactions(tx_hash);
```

### Query Optimization
```javascript
// Efficient queries with proper joins
const offers = await supabase
  .from('energy_offers')
  .select(`
    *,
    seller:users!seller_id(wallet_address, username, reputation_score)
  `)
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(50)
```

## 🛠️ Development Tools

### Supabase Dashboard
- **URL**: https://supabase.com/dashboard/project/jzzljxhqrbxeiqozptek
- **Features**: 
  - Table editor
  - SQL editor
  - Real-time logs
  - API documentation
  - Authentication management

### Local Development
```bash
# Start both backend and frontend
node start-dev.js

# Or separately
cd backend && npm run dev
cd frontend && npm run dev
```

### Database Management
```bash
# Backup database
# (Use Supabase Dashboard → Settings → Database → Backup)

# Reset database
npm run setup

# View logs
tail -f backend/logs/combined.log
```

## 🚀 Production Deployment

### Environment Setup
```env
NODE_ENV=production
SUPABASE_URL=https://jzzljxhqrbxeiqozptek.supabase.co
SUPABASE_ANON_KEY=production_key_here
CORS_ORIGIN=https://your-production-domain.com
```

### Deployment Checklist
- [ ] Update environment variables
- [ ] Configure production CORS
- [ ] Set up SSL certificates
- [ ] Configure rate limiting
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Test all API endpoints

## 🤝 Benefits of Supabase Integration

### For Users
- **Fast Queries**: Optimized database queries
- **Real-time Updates**: Live marketplace updates
- **Rich Analytics**: Comprehensive statistics
- **Search & Filter**: Advanced offer filtering

### For Developers
- **Easy Setup**: One-command database setup
- **Type Safety**: Generated TypeScript types
- **Real-time**: Built-in real-time subscriptions
- **Scalability**: Auto-scaling PostgreSQL
- **Security**: Built-in RLS and authentication

### For Platform
- **Analytics**: Comprehensive platform insights
- **User Management**: Complete user profiles
- **Transaction History**: Full audit trail
- **Performance**: Optimized queries and caching

---

**🗄️ Supabase provides the robust data layer for REC-ONE's P2P energy trading platform!**
