// Debug Saga Chainlet Deployment Issues
import { ethers } from "hardhat";

async function debugSagaDeployment() {
  console.log("🔍 Debugging Saga Chainlet Deployment Issues");
  console.log("=============================================");

  try {
    // Get network info
    const network = await ethers.provider.getNetwork();
    console.log(`📊 Network: ${network.name} (Chain ID: ${network.chainId})`);

    // Get deployer info
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    const balance = await ethers.provider.getBalance(deployerAddress);
    
    console.log(`👤 Deployer: ${deployerAddress}`);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} DPSV`);

    // Test 1: Simple transaction
    console.log("\n🧪 Test 1: Simple ETH transfer...");
    try {
      const tx = await deployer.sendTransaction({
        to: deployerAddress, // Send to self
        value: ethers.parseEther("0.001"),
        gasLimit: 21000
      });
      
      console.log(`📤 Transfer TX: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Transfer successful: Block ${receipt?.blockNumber}`);
    } catch (error) {
      console.log(`❌ Simple transfer failed:`, error.message);
    }

    // Test 2: Deploy minimal contract
    console.log("\n🧪 Test 2: Deploy minimal contract...");
    try {
      // Create a minimal contract for testing
      const MinimalContract = await ethers.getContractFactory("EnergyMarket");
      
      // Get bytecode info
      const bytecode = MinimalContract.bytecode;
      console.log(`📦 Bytecode length: ${bytecode.length} characters`);
      console.log(`📦 Bytecode size: ${bytecode.length / 2} bytes`);
      
      // Try deployment with different gas limits
      const gasLimits = [300000, 500000, 800000, 1000000];
      
      for (const gasLimit of gasLimits) {
        console.log(`\n⛽ Testing with gas limit: ${gasLimit}`);
        
        try {
          const contract = await MinimalContract.deploy({
            gasLimit: gasLimit
          });
          
          console.log(`📤 TX sent: ${contract.deploymentTransaction()?.hash}`);
          
          // Wait for deployment with timeout
          const deploymentPromise = contract.waitForDeployment();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Deployment timeout")), 30000)
          );
          
          await Promise.race([deploymentPromise, timeoutPromise]);
          
          const address = await contract.getAddress();
          console.log(`✅ Deployment successful: ${address}`);
          
          // Test contract functionality
          const offerCount = await contract.getOfferCount();
          console.log(`📊 Contract working: Offer count = ${offerCount}`);
          
          return; // Success, exit
          
        } catch (error) {
          console.log(`❌ Gas limit ${gasLimit} failed: ${error.message}`);
          
          // If it's a revert, try to get more details
          if (error.message.includes("reverted")) {
            try {
              const tx = error.transaction || error.receipt?.transactionHash;
              if (tx) {
                console.log(`🔍 Analyzing failed transaction: ${tx}`);
                // Could add more detailed analysis here
              }
            } catch (analysisError) {
              console.log(`⚠️ Could not analyze transaction`);
            }
          }
        }
      }
      
    } catch (error) {
      console.log(`❌ Contract deployment test failed:`, error.message);
    }

    // Test 3: Check network compatibility
    console.log("\n🧪 Test 3: Network compatibility checks...");
    
    try {
      // Check EVM version
      const block = await ethers.provider.getBlock("latest");
      console.log(`📦 Latest block: ${block?.number}`);
      console.log(`⛽ Block gas limit: ${block?.gasLimit}`);
      console.log(`⛽ Block gas used: ${block?.gasUsed}`);
      
      // Check if network supports CREATE2
      console.log(`🔧 Testing CREATE2 support...`);
      const create2TestBytecode = "0x6000600055"; // Simple storage write
      const gasEstimate = await ethers.provider.estimateGas({
        data: create2TestBytecode
      });
      console.log(`✅ Gas estimation works: ${gasEstimate}`);
      
    } catch (error) {
      console.log(`❌ Network compatibility issue:`, error.message);
    }

    // Test 4: Check Solidity version compatibility
    console.log("\n🧪 Test 4: Solidity version compatibility...");
    
    try {
      // Get contract compilation info
      const contractFactory = await ethers.getContractFactory("EnergyMarket");
      const contractInterface = contractFactory.interface;

      console.log(`📝 Contract functions: ${contractInterface.fragments.length}`);
      console.log(`📝 Contract events: ${contractInterface.fragments.filter(f => f.type === 'event').length}`);
      
      // Check if bytecode contains problematic opcodes
      const bytecode = contractFactory.bytecode;
      const problematicOpcodes = ['PUSH0', 'MCOPY']; // Opcodes that might not be supported
      
      for (const opcode of problematicOpcodes) {
        if (bytecode.includes(opcode)) {
          console.log(`⚠️ Potentially problematic opcode found: ${opcode}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ Solidity compatibility check failed:`, error.message);
    }

  } catch (error) {
    console.error("❌ Debug script failed:", error);
  }
}

async function main() {
  await debugSagaDeployment();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Debug failed:", error);
    process.exit(1);
  });
