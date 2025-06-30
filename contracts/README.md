# 🔗 REC-ONE Smart Contracts

Smart contract backend for the REC-ONE P2P Energy Trading Platform, built on **Lisk Sepolia testnet**.

## 📋 Overview

The EnergyMarket smart contract enables peer-to-peer energy trading by providing:
- Energy balance tracking for users
- Marketplace for creating and managing energy offers
- Secure transaction processing for energy purchases
- Event logging for complete transaction history

## 🏗️ Contract Architecture

### EnergyMarket.sol
Main contract handling all energy trading functionality.

#### Key Data Structures
```solidity
struct Offer {
    uint256 id;           // Unique offer identifier
    address seller;       // Address of energy seller
    uint256 quantity;     // Energy amount in kWh
    uint256 price;        // Price per kWh in wei
    bool isActive;        // Offer status
    uint256 timestamp;    // Creation time
}
```

#### State Variables
- `mapping(address => uint256) energyBalance` - User energy balances
- `mapping(uint256 => Offer) offers` - All energy offers
- `mapping(address => uint256[]) userOffers` - User's created offers
- `uint256 nextOfferId` - Auto-incrementing offer ID
- `uint256[] activeOfferIds` - List of active offers

## 🔧 Core Functions

### Energy Management
```solidity
function generateEnergyReading(uint256 _quantity) external
```
- Simulates smart meter energy generation
- Adds energy to user's balance
- Emits `EnergyGenerated` event

### Marketplace Functions
```solidity
function createOffer(uint256 _quantity, uint256 _price) external
```
- Creates new energy sell offer
- Deducts energy from seller's balance
- Adds offer to marketplace
- Emits `OfferCreated` event

```solidity
function purchaseOffer(uint256 _offerId) external payable
```
- Purchases energy from marketplace
- Transfers payment to seller
- Marks offer as inactive
- Emits `OfferPurchased` event

```solidity
function cancelOffer(uint256 _offerId) external
```
- Cancels user's own offer
- Returns energy to seller's balance
- Emits `OfferCancelled` event

### View Functions
```solidity
function getEnergyBalance(address _user) external view returns (uint256)
function getActiveOffers() external view returns (uint256[])
function getOffer(uint256 _offerId) external view returns (Offer memory)
function getUserOffers(address _user) external view returns (uint256[])
function getTotalOffers() external view returns (uint256)
function getActiveOffersCount() external view returns (uint256)
```

## 🚀 Deployment

### Prerequisites
- Node.js v18+
- Hardhat development environment
- MetaMask wallet with test ETH
- Private key for deployment

### Setup
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Add your private key to .env (without 0x prefix)
PRIVATE_KEY=your_private_key_here
```

### Deploy to Lisk Sepolia
```bash
# Run tests
npx hardhat test

# Deploy contract
npx hardhat run scripts/deploy.ts --network liskSepolia

# Verify contract (optional)
npx hardhat verify --network lisk-sepolia <CONTRACT_ADDRESS>
```

### Alternative Deployment (Hardhat Ignition)
```bash
npx hardhat ignition deploy ignition/modules/EnergyMarket.ts --network liskSepolia
```

## 🧪 Testing

### Run All Tests
```bash
npx hardhat test
```

### Run Specific Test File
```bash
npx hardhat test test/EnergyMarket.simple.test.ts
```

### Test Coverage
The test suite covers:
- ✅ Energy generation functionality
- ✅ Offer creation and validation
- ✅ Energy purchasing mechanics
- ✅ Offer cancellation
- ✅ View functions and data retrieval
- ✅ Error handling and edge cases

## 📊 Contract Details

### Deployed Contract
- **Network**: Lisk Sepolia Testnet
- **Contract Address**: `0x66C06efE9B8B44940379F5c53328a35a3Abc3Fe7`
- **Block Explorer**: [View on Blockscout](https://sepolia-blockscout.lisk.com/address/0x66C06efE9B8B44940379F5c53328a35a3Abc3Fe7)
- **Verification Status**: ✅ Verified

### Network Configuration
- **RPC URL**: https://rpc.sepolia-api.lisk.com
- **Chain ID**: 4202
- **Currency**: ETH
- **Faucet**: https://sepolia-faucet.lisk.com/

## 🔒 Security Features

### Input Validation
- All quantity inputs must be > 0
- All price inputs must be > 0
- Offer existence checks before operations

### Access Control
- Users can only cancel their own offers
- Sellers cannot purchase their own offers
- Balance checks before offer creation

### Safe Operations
- Automatic excess payment refunds
- State updates before external calls
- Proper event emission for all operations

## 📈 Gas Optimization

### Efficient Design
- Minimal storage operations
- Batch operations where possible
- Optimized data structures

### Estimated Gas Costs
- `generateEnergyReading`: ~46,000 gas
- `createOffer`: ~250,000 gas
- `purchaseOffer`: ~48,000 gas
- `cancelOffer`: ~35,000 gas

## 🔄 Events

```solidity
event EnergyGenerated(address indexed user, uint256 quantity, uint256 timestamp);
event OfferCreated(uint256 indexed offerId, address indexed seller, uint256 quantity, uint256 price);
event OfferPurchased(uint256 indexed offerId, address indexed buyer, address indexed seller, uint256 quantity, uint256 totalPrice);
event OfferCancelled(uint256 indexed offerId, address indexed seller);
```

## 🛠️ Development

### Local Development
```bash
# Start local blockchain
npx hardhat node

# Deploy to local network
npx hardhat run scripts/deploy.ts --network localhost
```

### Debugging
```bash
# Run with stack traces
npx hardhat test --show-stack-traces

# Verbose logging
npx hardhat run scripts/deploy.ts --network liskSepolia --verbose
```

## 📚 Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [Lisk Developer Resources](https://lisk-bootcamp-2025.vercel.app/)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.
