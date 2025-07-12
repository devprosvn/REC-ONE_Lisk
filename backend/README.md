# 🔗 REC-ONE Backend API

Backend server for REC-ONE P2P Energy Trading Platform with **Supabase** integration for data storage and management.

## 🏗️ Architecture

### Technology Stack
- **Node.js** + **Express.js** - REST API server
- **Supabase** - PostgreSQL database with real-time features
- **Winston** - Logging system
- **Joi** - Request validation
- **Rate Limiting** - API protection
- **CORS** - Cross-origin resource sharing

### Database Schema
- **users** - User profiles and wallet information
- **energy_generation** - Energy production records
- **energy_offers** - Marketplace offers
- **transactions** - Blockchain transaction logs
- **price_history** - VND/ETH exchange rates
- **user_stats** - Aggregated user statistics
- **system_logs** - Application logs

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- Supabase account
- Access to deployed smart contract

### Installation
```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your Supabase credentials
# (Already configured for rec-one project)

# Setup database schema
npm run setup

# Start development server
npm run dev
```

### Environment Configuration
```env
# Supabase (already configured)
SUPABASE_URL=https://jzzljxhqrbxeiqozptek.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server settings
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Blockchain
CONTRACT_ADDRESS=0x66C06efE9B8B44940379F5c53328a35a3Abc3Fe7
LISK_SEPOLIA_RPC=https://rpc.sepolia-api.lisk.com
```

## 📡 API Endpoints

### Base URL: `http://localhost:3001/api/v1`

### 🏥 Health Check
```
GET /health
```
Returns server status and database connection.

### 👤 Users
```
GET    /users/:walletAddress          # Get user profile
POST   /users                         # Create/update user
GET    /users/:walletAddress/stats    # Get user statistics
GET    /users/leaderboard             # Get leaderboard
GET    /users/search?q=query          # Search users
```

### ⚡ Energy
```
POST   /energy/generation             # Record energy generation
POST   /energy/offers                 # Record offer creation
POST   /energy/purchase               # Record energy purchase
POST   /energy/cancel                 # Cancel offer
GET    /energy/offers                 # Get active offers
GET    /energy/offers/search          # Search offers with filters
GET    /energy/history/:walletAddress # Get user energy history
GET    /energy/marketplace/stats      # Get marketplace statistics
```

### 💰 Transactions
```
POST   /transactions                  # Record blockchain transaction
GET    /transactions/:txHash          # Get transaction details
GET    /transactions/user/:wallet     # Get user transactions
GET    /transactions/recent           # Get recent transactions
```

### 📊 Statistics
```
GET    /stats/overview                # Platform overview
GET    /stats/daily                   # Daily statistics
GET    /stats/prices                  # Price history
GET    /stats/users                   # User statistics
```

## 🔧 API Usage Examples

### Record Energy Generation
```javascript
POST /api/v1/energy/generation
{
  "walletAddress": "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
  "quantity": 100,
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 12345,
  "gasUsed": 46000,
  "gasPrice": 20000000000
}
```

### Create Energy Offer
```javascript
POST /api/v1/energy/offers
{
  "offerId": 1,
  "sellerWallet": "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
  "quantity": 50,
  "pricePerKWhETH": 0.001,
  "pricePerKWhVND": 2400,
  "txHash": "0xabcdef1234567890..."
}
```

### Search Offers
```javascript
GET /api/v1/energy/offers/search?minQuantity=10&maxPrice=3000&sortBy=price_per_kwh_vnd&sortOrder=asc
```

### Get User Statistics
```javascript
GET /api/v1/users/0x742d35Cc6634C0532925a3b8D4C9db96590c6C87/stats

Response:
{
  "success": true,
  "data": {
    "wallet_address": "0x742d35cc6634c0532925a3b8d4c9db96590c6c87",
    "total_energy_generated": 500,
    "total_energy_sold": 200,
    "total_earnings_vnd": 480000,
    "reputation_score": 105,
    "stats": {
      "totalGenerated": 500,
      "activeOffers": 2,
      "soldOffers": 8,
      "totalOffers": 10
    }
  }
}
```

## 🛡️ Security Features

### Rate Limiting
- **General API**: 100 requests per 15 minutes
- **Write Operations**: 20 requests per minute
- **Automatic blocking**: 1-5 minutes based on violation

### Input Validation
- **Wallet addresses**: Ethereum format validation
- **Transaction hashes**: 64-character hex validation
- **Numeric values**: Positive number validation
- **Request sanitization**: Strip unknown fields

### Error Handling
- **Structured responses**: Consistent error format
- **Security**: No sensitive data leakage
- **Logging**: Comprehensive error tracking

## 📊 Database Operations

### Setup Database
```bash
npm run setup
```
Creates all tables, indexes, and RPC functions.

### Manual SQL Operations
Access Supabase SQL Editor:
https://supabase.com/dashboard/project/jzzljxhqrbxeiqozptek

### Backup & Restore
```bash
# Backup (via Supabase Dashboard)
# Restore (via Supabase Dashboard)
```

## 🔄 Integration with Frontend

### Frontend API Client
```javascript
// In frontend/src/api/client.js
const API_BASE = 'http://localhost:3001/api/v1'

export const recordEnergyGeneration = async (data) => {
  const response = await fetch(`${API_BASE}/energy/generation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return response.json()
}
```

### Blockchain Event Listeners
```javascript
// Listen for smart contract events and sync to database
contract.on('EnergyGenerated', async (user, quantity, timestamp, event) => {
  await recordEnergyGeneration({
    walletAddress: user,
    quantity: quantity.toString(),
    txHash: event.transactionHash,
    blockNumber: event.blockNumber
  })
})
```

## 🧪 Testing

### Run Tests
```bash
npm test
```

### API Testing with curl
```bash
# Health check
curl http://localhost:3001/health

# Get active offers
curl http://localhost:3001/api/v1/energy/offers

# Get user stats
curl http://localhost:3001/api/v1/users/0x742d35Cc6634C0532925a3b8D4C9db96590c6C87/stats
```

## 📈 Monitoring & Logging

### Log Files
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

### Log Levels
- **error** - Critical errors
- **warn** - Warnings
- **info** - General information
- **debug** - Detailed debugging

### Monitoring Endpoints
```bash
# Server health
GET /health

# Database status
GET /api/v1/stats/overview
```

## 🚀 Deployment

### Production Setup
```bash
# Set environment
NODE_ENV=production

# Install production dependencies
npm ci --only=production

# Start server
npm start
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3001
LOG_LEVEL=warn
CORS_ORIGIN=https://your-frontend-domain.com
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**🔗 Backend API for REC-ONE P2P Energy Trading Platform**
