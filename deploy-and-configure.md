# REC-ONE Deployment Guide

## Step-by-Step Deployment Instructions

### 1. Prepare Environment

1. **Get Test ETH**:
   - Visit https://sepolia-faucet.lisk.com/
   - Connect your MetaMask wallet
   - Request test ETH for Lisk Sepolia

2. **Setup Private Key**:
   ```bash
   cd contracts
   cp .env.example .env
   # Edit .env and add your private key (without 0x prefix)
   ```

### 2. Deploy Smart Contract

```bash
cd contracts
npm install
npx hardhat test  # Verify everything works

# Deploy using the custom script
npx hardhat run scripts/deploy.ts --network liskSepolia

# Alternative: Deploy using Hardhat Ignition
# npx hardhat ignition deploy ignition/modules/EnergyMarket.ts --network liskSepolia
```

**Expected Output:**
```
Deploying EnergyMarket contract to Lisk Sepolia...
Deploying with account: 0x...
Account balance: 0.1000 ETH
EnergyMarket deployed to: 0x1234567890123456789012345678901234567890
Verifying deployment...
Total offers: 0
Active offers count: 0

=== Deployment Summary ===
Contract Address: 0x1234567890123456789012345678901234567890
Network: Lisk Sepolia Testnet
Block Explorer: https://sepolia-blockscout.lisk.com/address/0x1234567890123456789012345678901234567890
Deployer: 0x...
```

### 3. Configure Frontend

1. **Update Contract Address**:
   - Open `frontend/src/energy-app.ts`
   - Find line: `const CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000'`
   - Replace with your deployed contract address

2. **Install and Start Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### 4. Test the Application

1. **Open Browser**: Go to http://localhost:5173
2. **Connect Wallet**: Click "Connect MetaMask"
3. **Test Energy Generation**:
   - Enter "100" in energy amount
   - Click "Generate Energy"
   - Confirm transaction in MetaMask
   - Check that energy balance updates to "100 kWh"

4. **Test Creating Offer**:
   - Enter "50" for quantity
   - Enter "0.001" for price per kWh
   - Click "Create Offer"
   - Confirm transaction
   - Check that offer appears in marketplace

5. **Test Purchasing** (use different account):
   - Switch to different MetaMask account
   - Connect wallet
   - Click "Buy Now" on the offer
   - Confirm transaction

### 5. Production Deployment

#### Deploy Frontend to Vercel/Netlify:
```bash
cd frontend
npm run build
# Upload dist/ folder to your hosting service
```

#### Update Production Config:
- Ensure CONTRACT_ADDRESS is set correctly
- Test all functionality on production URL

## Troubleshooting

### Common Issues:

1. **"Insufficient funds" error**:
   - Get more test ETH from faucet
   - Check you're on Lisk Sepolia network

2. **"Contract not found" error**:
   - Verify contract address is correct
   - Check contract was deployed successfully

3. **MetaMask connection issues**:
   - Refresh page
   - Reset MetaMask connection
   - Clear browser cache

4. **Transaction fails**:
   - Check gas fees
   - Ensure sufficient balance
   - Try increasing gas limit

### Network Issues:
If you can't connect to Lisk Sepolia, manually add network to MetaMask:
- Network Name: Lisk Sepolia Testnet
- RPC URL: https://rpc.sepolia-api.lisk.com
- Chain ID: 4202
- Currency Symbol: ETH
- Block Explorer: https://sepolia-blockscout.lisk.com

## Verification Checklist

- [ ] Smart contract deployed successfully
- [ ] Contract address updated in frontend
- [ ] Frontend connects to MetaMask
- [ ] Can generate energy
- [ ] Can create offers
- [ ] Can purchase offers
- [ ] Balances update correctly
- [ ] UI looks good (sky blue gradient)
- [ ] Responsive on mobile

## Next Steps

1. **Share with Users**:
   - Provide the frontend URL
   - Share instructions for getting test ETH
   - Guide users through first transaction

2. **Monitor Usage**:
   - Check transactions on block explorer
   - Monitor for any errors
   - Gather user feedback

3. **Iterate**:
   - Add requested features
   - Improve UI/UX based on feedback
   - Optimize gas usage

## Production Considerations

1. **Security**:
   - Audit smart contract code
   - Test thoroughly on testnet
   - Consider bug bounty program

2. **Scalability**:
   - Monitor gas costs
   - Consider Layer 2 solutions
   - Optimize contract functions

3. **User Experience**:
   - Add transaction history
   - Improve error messages
   - Add help documentation

## Support Resources

- **Lisk Documentation**: https://lisk-bootcamp-2025.vercel.app/
- **Block Explorer**: https://sepolia-blockscout.lisk.com
- **Faucet**: https://sepolia-faucet.lisk.com/
- **MetaMask Help**: https://metamask.io/support/

---

🎉 **Congratulations!** You've successfully deployed a P2P Energy Trading platform on Lisk!
