// Deploy Compatible EnergyMarket to BNB Smart Chain Testnet
import { ethers } from "hardhat";

async function deployBscCompat() {
  console.log("💰 Deploying Compatible EnergyMarket to BNB Smart Chain Testnet");
  console.log("===============================================================");

  try {
    // Get network info
    const network = await ethers.provider.getNetwork();
    console.log(`📊 Network: Chain ID ${network.chainId}`);

    // Get deployer
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    const balance = await ethers.provider.getBalance(deployerAddress);
    
    console.log(`👤 Deployer: ${deployerAddress}`);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} tBNB`);

    if (balance === 0n) {
      throw new Error("Insufficient balance - get tBNB from https://testnet.bnbchain.org/faucet-smart");
    }

    // Deploy compatible EnergyMarket contract
    console.log("\n📝 Deploying EnergyMarketCompat contract...");
    const EnergyMarketCompat = await ethers.getContractFactory("EnergyMarketCompat");
    
    console.log("⛽ Using gas limit: 1200000");
    
    const contract = await EnergyMarketCompat.deploy({
      gasLimit: 1200000,
      gasPrice: ethers.parseUnits("10", "gwei") // 10 gwei
    });
    
    const deploymentTx = contract.deploymentTransaction();
    console.log(`📤 Transaction sent: ${deploymentTx?.hash}`);
    console.log("⏳ Waiting for deployment...");
    
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    
    const receipt = await deploymentTx?.wait();
    
    console.log(`✅ EnergyMarketCompat deployed: ${contractAddress}`);
    console.log(`🧾 Transaction: ${deploymentTx?.hash}`);
    console.log(`📦 Block: ${receipt?.blockNumber}`);
    console.log(`⛽ Gas used: ${receipt?.gasUsed.toString()}`);
    
    // Test contract functionality
    console.log("\n🧪 Testing contract functions...");
    
    const offerCount = await contract.getOfferCount();
    console.log(`📊 Initial offer count: ${offerCount}`);
    
    const stats = await contract.getTradingStats();
    console.log(`📊 Trading stats: Energy=${stats[0]}, Value=${stats[1]}, Offers=${stats[2]}`);
    
    // Test creating an offer
    console.log("\n📝 Testing offer creation...");
    const createTx = await contract.createOffer(
      ethers.parseUnits("10", 0), // 10 kWh
      ethers.parseUnits("0.001", 18), // 0.001 tBNB per kWh
      { 
        gasLimit: 150000,
        gasPrice: ethers.parseUnits("10", "gwei")
      }
    );
    
    await createTx.wait();
    console.log(`✅ Test offer created: ${createTx.hash}`);
    
    const newOfferCount = await contract.getOfferCount();
    console.log(`📊 New offer count: ${newOfferCount}`);
    
    // Get the created offer
    const offer = await contract.getOffer(1);
    console.log(`📋 Offer details: Seller=${offer.seller}, Quantity=${offer.quantity}, Price=${offer.price}`);
    
    console.log("\n🎉 Compatible EnergyMarket deployment and testing successful!");
    console.log(`🔗 Contract address: ${contractAddress}`);
    console.log(`🔗 Explorer: https://testnet.bscscan.com/address/${contractAddress}`);
    
    // Save deployment info
    const deploymentInfo = {
      network: "bscTestnet",
      chainId: Number(network.chainId),
      contractAddress,
      transactionHash: deploymentTx?.hash,
      blockNumber: receipt?.blockNumber,
      gasUsed: receipt?.gasUsed.toString(),
      deployedAt: new Date().toISOString(),
      contractName: "EnergyMarketCompat"
    };
    
    console.log("\n📄 Deployment Info:");
    console.log(JSON.stringify(deploymentInfo, null, 2));
    
    return contractAddress;
    
  } catch (error) {
    console.error("❌ BSC compatible deployment failed:", error.message);
    throw error;
  }
}

async function main() {
  await deployBscCompat();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
