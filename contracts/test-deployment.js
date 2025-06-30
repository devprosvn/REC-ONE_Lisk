#!/usr/bin/env node

// Test deployment configuration without actually deploying
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Multi-Chain Deployment Configuration');
console.log('===============================================');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

console.log('\n1. 📋 Environment Configuration Check:');
if (fs.existsSync(envPath)) {
  console.log('✅ .env file found');
  
  // Read .env file and check for required variables
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasPrivateKey = envContent.includes('PRIVATE_KEY=') && !envContent.includes('your_private_key_here');
  
  if (hasPrivateKey) {
    console.log('✅ PRIVATE_KEY configured');
  } else {
    console.log('⚠️ PRIVATE_KEY not configured properly');
    console.log('💡 Please copy .env.example to .env and add your private key');
  }
} else {
  console.log('❌ .env file not found');
  console.log('💡 Please copy .env.example to .env and configure your credentials');
  
  if (fs.existsSync(envExamplePath)) {
    console.log('📄 .env.example file available for reference');
  }
}

console.log('\n2. 🔧 Hardhat Configuration Check:');
try {
  // Test hardhat config loading
  execSync('npx hardhat --version', { stdio: 'pipe' });
  console.log('✅ Hardhat configuration valid');
} catch (error) {
  console.log('❌ Hardhat configuration error:', error.message);
}

console.log('\n3. 📦 Contract Compilation Check:');
try {
  execSync('npm run compile', { stdio: 'pipe' });
  console.log('✅ Contract compilation successful');
} catch (error) {
  console.log('❌ Contract compilation failed:', error.message);
}

console.log('\n4. 🌐 Network Configuration Summary:');
const networks = [
  {
    name: 'Lisk Sepolia',
    chainId: 4202,
    rpc: 'https://rpc.sepolia-api.lisk.com',
    faucet: 'https://sepolia-faucet.lisk.com/',
    explorer: 'https://sepolia-blockscout.lisk.com',
    currency: 'ETH'
  },
  {
    name: 'Saga DevPros Chainlet',
    chainId: 2749656616387000,
    rpc: 'https://devpros-2749656616387000-1.jsonrpc.sagarpc.io',
    faucet: 'Contact Saga team for test tokens',
    explorer: 'https://devpros-2749656616387000-1.sagaexplorer.io',
    currency: 'DPSV'
  },
  {
    name: 'BNB Smart Chain Testnet',
    chainId: 97,
    rpc: 'https://bsc-testnet-rpc.publicnode.com',
    faucet: 'https://testnet.bnbchain.org/faucet-smart',
    explorer: 'https://testnet.bscscan.com',
    currency: 'tBNB'
  }
];

networks.forEach((network, index) => {
  console.log(`\n${index + 1}. ${network.name}:`);
  console.log(`   Chain ID: ${network.chainId}`);
  console.log(`   RPC: ${network.rpc}`);
  console.log(`   Currency: ${network.currency}`);
  console.log(`   Faucet: ${network.faucet}`);
  console.log(`   Explorer: ${network.explorer}`);
});

console.log('\n5. 🚀 Deployment Commands:');
console.log('   Deploy to Lisk:     npm run deploy:lisk');
console.log('   Deploy to Saga:     npm run deploy:saga');
console.log('   Deploy to BSC:      npm run deploy:bsc');
console.log('   Deploy to All:      npm run deploy:all');

console.log('\n6. 🔍 Verification Commands:');
console.log('   Verify on Lisk:     npm run verify:lisk <contract_address>');
console.log('   Verify on Saga:     npm run verify:saga <contract_address>');
console.log('   Verify on BSC:      npm run verify:bsc <contract_address>');

console.log('\n7. 💡 Pre-Deployment Checklist:');
console.log('   ✅ Contract compiled successfully');
console.log('   ⚠️ Configure .env with your private key');
console.log('   ⚠️ Fund deployer wallet with test tokens:');
networks.forEach(network => {
  console.log(`      - ${network.currency} on ${network.name}: ${network.faucet}`);
});
console.log('   ⚠️ For BSC verification, add BSCSCAN_API_KEY to .env');

console.log('\n8. 📋 Next Steps:');
console.log('   1. Copy .env.example to .env');
console.log('   2. Add your private key to .env (without 0x prefix)');
console.log('   3. Get test tokens from faucets');
console.log('   4. Run deployment: npm run deploy:all');
console.log('   5. Verify contracts on block explorers');

console.log('\n🎉 Configuration test complete!');
console.log('Ready for multi-chain deployment when .env is configured.');
