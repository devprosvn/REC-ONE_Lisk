# 🔋 REC-ONE P2P Energy Trading Platform

A decentralized peer-to-peer energy trading platform built on **Lisk Sepolia testnet**, enabling users to trade renewable energy directly without intermediaries. This is a **Mini POC** demonstrating the core concepts of blockchain-based energy trading.

## 🌟 Key Features

### 🔌 Core Functionality
- **Energy Generation Simulation**: Simulate solar panel energy production with smart meter readings
- **P2P Energy Trading**: Create and purchase energy offers directly between users
- **Real-time Marketplace**: Browse all available energy offers with live updates
- **Secure Transactions**: All trades are recorded immutably on the blockchain

### 💻 Technical Features
- **MetaMask Integration**: Seamless wallet connection and transaction signing
- **Lisk Sepolia Support**: Built specifically for Lisk blockchain ecosystem
- **Gas Optimized**: Efficient smart contract design to minimize transaction costs
- **Event Logging**: Complete transaction history with blockchain events

### 🎨 User Experience
- **Beautiful UI**: Sky-blue gradient design inspired by clean energy
- **1-Click Interactions**: Simplified UX with minimal steps for all actions
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Real-time Updates**: Automatic balance and marketplace updates

## 🏗️ Project Architecture

```
REC-ONE_Lisk/
├── contracts/          # Smart Contract Backend
│   ├── contracts/      # Solidity contracts
│   ├── scripts/        # Deployment scripts
│   ├── test/          # Contract tests
│   └── ignition/      # Hardhat Ignition modules
├── frontend/          # Web3 Frontend DApp
│   ├── src/           # TypeScript source code
│   ├── public/        # Static assets
│   └── dist/          # Built application
└── docs/              # Documentation
```

### 🔗 Smart Contract Layer (Backend)
- **EnergyMarket.sol**: Core contract handling all energy trading logic
- **Deployment**: Deployed on Lisk Sepolia testnet
- **Verification**: Source code verified on block explorer
- **Key Functions**:
  - `generateEnergyReading(uint256 _quantity)`: Simulate energy production
  - `createOffer(uint256 _quantity, uint256 _price)`: List energy for sale
  - `purchaseOffer(uint256 _offerId)`: Buy energy from marketplace
  - `cancelOffer(uint256 _offerId)`: Cancel your own offer
  - View functions for balances, offers, and marketplace data

### 🌐 Frontend Layer (Web3 DApp)
- **Technology Stack**: Vanilla TypeScript + Vite
- **Web3 Integration**: Ethers.js v6 for blockchain interaction
- **Styling**: Custom CSS with sky-blue gradient theme
- **Features**:
  - Wallet connection and network switching
  - Real-time balance updates
  - Interactive marketplace
  - Transaction status tracking
  - Responsive mobile-first design

## 🚀 Quick Start Guide

### 📋 Prerequisites
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **MetaMask** browser extension - [Install here](https://metamask.io/)
- **Test ETH** on Lisk Sepolia - [Get from faucet](https://sepolia-faucet.lisk.com/)
- **Git** for cloning the repository

### 1️⃣ Clone and Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-username/REC-ONE_Lisk.git
cd REC-ONE_Lisk

# Install contract dependencies
cd contracts
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2️⃣ Deploy Smart Contract

1. **Setup Environment**:
```bash
cd contracts
cp .env.example .env
```

2. **Add your private key** to `.env` (without 0x prefix):
```env
PRIVATE_KEY=your_private_key_here_without_0x_prefix
```

3. **Get Test ETH**:
   - Visit [Lisk Sepolia Faucet](https://sepolia-faucet.lisk.com/)
   - Connect your MetaMask wallet
   - Request test ETH

4. **Deploy Contract**:
```bash
# Run tests first
npx hardhat test

# Deploy to Lisk Sepolia
npx hardhat run scripts/deploy.ts --network liskSepolia
```

5. **Verify Contract** (optional but recommended):
```bash
npx hardhat verify --network lisk-sepolia <CONTRACT_ADDRESS>
```

### 3️⃣ Configure Frontend

1. **Update Contract Address**:
   - Open `frontend/src/energy-app.ts`
   - Replace `CONTRACT_ADDRESS` with your deployed address:
   ```typescript
   const CONTRACT_ADDRESS = '0x66C06efE9B8B44940379F5c53328a35a3Abc3Fe7' // Your address here
   ```

### 4️⃣ Launch Application

```bash
cd frontend
npm run dev
```

🎉 **Open http://localhost:5173 in your browser and start trading energy!**

## 📱 How to Use

### 1. Connect Wallet
- Click "Connect MetaMask" button
- Approve the connection in MetaMask
- The app will automatically switch to Lisk Sepolia network

### 2. Generate Energy
- Enter the amount of kWh you want to simulate
- Click "Generate Energy" button
- Confirm the transaction in MetaMask
- Your energy balance will update

### 3. Create Energy Offer
- Enter quantity (kWh) and price per kWh (in ETH)
- Click "Create Offer" button
- Confirm the transaction in MetaMask
- Your offer will appear in the marketplace

### 4. Buy Energy
- Browse available offers in the marketplace
- Click "Buy Now" on any offer (except your own)
- Confirm the transaction in MetaMask
- Energy will be transferred to you

## 🔧 Development

### Run Tests
```bash
cd contracts
npx hardhat test
```

### Local Development
```bash
# Terminal 1: Start local blockchain
cd contracts
npx hardhat node

# Terminal 2: Deploy to local network
npx hardhat run scripts/deploy.ts --network localhost

# Terminal 3: Start frontend
cd frontend
npm run dev
```

## 🌐 Network Configuration

### Lisk Sepolia Testnet
- **RPC URL**: https://rpc.sepolia-api.lisk.com
- **Chain ID**: 4202
- **Currency**: ETH
- **Block Explorer**: https://sepolia-blockscout.lisk.com
- **Faucet**: https://sepolia-faucet.lisk.com/

### Add to MetaMask
The app will automatically prompt you to add Lisk Sepolia network when you connect your wallet.

## 📊 Smart Contract Details

### Main Functions
- `generateEnergyReading(uint256 _quantity)`: Add energy to your balance
- `createOffer(uint256 _quantity, uint256 _price)`: Create a sell offer
- `purchaseOffer(uint256 _offerId)`: Buy an energy offer
- `getEnergyBalance(address _user)`: Check energy balance
- `getActiveOffers()`: Get all active offers

### Events
- `EnergyGenerated`: When energy is generated
- `OfferCreated`: When a new offer is created
- `OfferPurchased`: When an offer is purchased

## 🎨 UI/UX Features

- **1-Click Operations**: All actions require just one click
- **Sky Blue Gradient**: Beautiful white-to-blue gradient design
- **Real-time Updates**: Balances and offers update automatically
- **Responsive Design**: Works on all screen sizes
- **Loading States**: Clear feedback during transactions
- **Error Handling**: User-friendly error messages

## 🔒 Security Features

- **Input Validation**: All inputs are validated on both frontend and contract
- **Reentrancy Protection**: Contract uses proper state management
- **Access Control**: Users can only manage their own offers
- **Safe Math**: All calculations use safe arithmetic

## 🚀 Deployment to Production

### Frontend Deployment
```bash
cd frontend
npm run build
# Deploy the dist/ folder to your hosting service
```

### Contract Verification
After deployment, verify your contract on the block explorer:
```bash
npx hardhat verify --network liskSepolia DEPLOYED_CONTRACT_ADDRESS
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the smart contract code

## 📁 Project Structure

```
REC-ONE_Lisk/
├── 📄 README.md                    # Main project documentation
├── 📄 deploy-and-configure.md      # Deployment guide
├── 📁 contracts/                   # Smart Contract Backend
│   ├── 📄 README.md               # Contract documentation
│   ├── 📁 contracts/              # Solidity source files
│   │   └── EnergyMarket.sol       # Main trading contract
│   ├── 📁 scripts/                # Deployment scripts
│   ├── 📁 test/                   # Contract tests
│   ├── 📁 ignition/               # Hardhat Ignition modules
│   ├── 📄 hardhat.config.ts       # Hardhat configuration
│   └── 📄 .env.example            # Environment template
└── 📁 frontend/                    # Web3 Frontend DApp
    ├── 📄 README.md               # Frontend documentation
    ├── 📁 src/                    # TypeScript source code
    │   ├── energy-app.ts          # Main application logic
    │   └── energy-style.css       # Custom styling
    ├── 📄 index.html              # Main HTML template
    ├── 📄 package.json            # Dependencies and scripts
    └── 📁 dist/                   # Built application (after build)
```

## 🎯 Future Roadmap

### Phase 1: Core Enhancement ✅
- [x] Basic P2P energy trading
- [x] Smart contract deployment
- [x] Web3 frontend interface
- [x] MetaMask integration

### Phase 2: Advanced Features 🚧
- [ ] Energy consumption tracking
- [ ] Transaction history dashboard
- [ ] Price analytics and charts
- [ ] Offer expiration system
- [ ] Bulk energy operations

### Phase 3: Ecosystem Expansion 📋
- [ ] Energy certificates (NFTs)
- [ ] Multi-token support (stablecoins)
- [ ] Cross-chain compatibility
- [ ] Mobile app development
- [ ] API for third-party integrations

### Phase 4: Real-World Integration 🌟
- [ ] IoT device integration
- [ ] Real smart meter connectivity
- [ ] Regulatory compliance features
- [ ] Enterprise dashboard
- [ ] Carbon credit tracking

## 🏆 Achievements

- ✅ **Smart Contract**: Deployed and verified on Lisk Sepolia
- ✅ **Frontend**: Beautiful, responsive Web3 interface
- ✅ **Testing**: Comprehensive test suite with 100% core function coverage
- ✅ **Documentation**: Complete setup and usage guides
- ✅ **Security**: Input validation and safe transaction handling

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### For Developers
1. **Smart Contract**: Improve gas efficiency, add new features
2. **Frontend**: Enhance UI/UX, add new components
3. **Testing**: Add more test cases, improve coverage
4. **Documentation**: Improve guides, add tutorials

### For Users
1. **Testing**: Try the application and report bugs
2. **Feedback**: Suggest new features and improvements
3. **Community**: Share the project with others
4. **Documentation**: Help improve user guides

### Getting Started
```bash
# Fork the repository
git clone https://github.com/your-username/REC-ONE_Lisk.git

# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes and test thoroughly
# Submit a pull request with detailed description
```

## 📞 Support & Community

### Get Help
- 📖 **Documentation**: Check README files in each directory
- 🐛 **Issues**: Create GitHub issues for bugs
- 💡 **Discussions**: Use GitHub Discussions for questions
- 📧 **Contact**: Reach out to the development team

### Resources
- **Lisk Documentation**: https://lisk-bootcamp-2025.vercel.app/
- **Block Explorer**: https://sepolia-blockscout.lisk.com
- **Test Faucet**: https://sepolia-faucet.lisk.com/
- **MetaMask Guide**: https://metamask.io/support/

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### What this means:
- ✅ Commercial use allowed
- ✅ Modification allowed
- ✅ Distribution allowed
- ✅ Private use allowed
- ❗ License and copyright notice required

---

## 🌟 Acknowledgments

- **Lisk Foundation** for the blockchain infrastructure
- **Hardhat Team** for the development framework
- **Ethers.js** for the Web3 library
- **Vite Team** for the build tool
- **Open Source Community** for inspiration and support

---

<div align="center">

**🔋 Built with ❤️ for the future of decentralized energy trading**

*Empowering individuals to trade renewable energy directly on the blockchain*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Lisk Sepolia](https://img.shields.io/badge/Network-Lisk%20Sepolia-blue)](https://sepolia-blockscout.lisk.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Solidity](https://img.shields.io/badge/Solidity-363636?logo=solidity&logoColor=white)](https://soliditylang.org/)

</div>
