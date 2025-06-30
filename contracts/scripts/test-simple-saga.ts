// Test Simple Contract Deployment on Saga
import { ethers } from "hardhat";

async function deploySimpleTest() {
  console.log("🧪 Testing Simple Contract Deployment on Saga");
  console.log("==============================================");

  try {
    // Get network info
    const network = await ethers.provider.getNetwork();
    console.log(`📊 Network: Chain ID ${network.chainId}`);

    // Get deployer
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    const balance = await ethers.provider.getBalance(deployerAddress);
    
    console.log(`👤 Deployer: ${deployerAddress}`);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} DPSV`);

    if (balance === 0n) {
      throw new Error("Insufficient balance");
    }

    // Deploy simple test contract
    console.log("\n📝 Deploying SimpleTest contract...");
    const SimpleTest = await ethers.getContractFactory("SimpleTest");
    
    console.log("⛽ Using gas limit: 200000");
    
    const contract = await SimpleTest.deploy({
      gasLimit: 200000
    });
    
    console.log(`📤 Transaction sent: ${contract.deploymentTransaction()?.hash}`);
    console.log("⏳ Waiting for deployment...");
    
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    
    console.log(`✅ SimpleTest deployed: ${contractAddress}`);
    
    // Test contract functionality
    console.log("\n🧪 Testing contract functions...");
    
    const initialValue = await contract.getValue();
    console.log(`📊 Initial value: ${initialValue}`);
    
    const owner = await contract.getOwner();
    console.log(`👤 Owner: ${owner}`);
    
    // Test setting value
    console.log("\n📝 Setting new value...");
    const tx = await contract.setValue(123, { gasLimit: 50000 });
    await tx.wait();
    
    const newValue = await contract.getValue();
    console.log(`✅ New value: ${newValue}`);
    
    console.log("\n🎉 Simple contract deployment and testing successful!");
    console.log(`🔗 Contract address: ${contractAddress}`);
    
    return contractAddress;
    
  } catch (error) {
    console.error("❌ Simple test deployment failed:", error.message);
    throw error;
  }
}

async function main() {
  await deploySimpleTest();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
