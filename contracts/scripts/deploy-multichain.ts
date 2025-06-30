// Multi-Chain Deployment Script for REC-ONE Energy Trading
import { ethers } from "hardhat";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

interface DeploymentInfo {
  network: string;
  chainId: number;
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  deployedAt: string;
  verified: boolean;
}

interface DeploymentConfig {
  [networkName: string]: DeploymentInfo;
}

const DEPLOYMENT_FILE = join(__dirname, "../deployments.json");

// Network configurations
const NETWORKS = {
  liskSepolia: {
    name: "Lisk Sepolia",
    chainId: 4202,
    currency: "ETH",
    explorer: "https://sepolia-blockscout.lisk.com",
  },
  sagaChainlet: {
    name: "Saga DevPros Chainlet",
    chainId: 2749656616387000,
    currency: "DPSV",
    explorer: "https://devpros-2749656616387000-1.sagaexplorer.io",
  },
  bscTestnet: {
    name: "BNB Smart Chain Testnet",
    chainId: 97,
    currency: "tBNB",
    explorer: "https://testnet.bscscan.com",
  },
};

async function loadExistingDeployments(): Promise<DeploymentConfig> {
  if (existsSync(DEPLOYMENT_FILE)) {
    try {
      const data = readFileSync(DEPLOYMENT_FILE, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.log("⚠️ Could not load existing deployments, starting fresh");
      return {};
    }
  }
  return {};
}

async function saveDeployments(deployments: DeploymentConfig): Promise<void> {
  try {
    writeFileSync(DEPLOYMENT_FILE, JSON.stringify(deployments, null, 2));
    console.log(`✅ Deployments saved to ${DEPLOYMENT_FILE}`);
  } catch (error) {
    console.error("❌ Failed to save deployments:", error);
  }
}

async function deployContract(networkName: string): Promise<DeploymentInfo | null> {
  try {
    const network = await ethers.provider.getNetwork();
    const networkConfig = NETWORKS[networkName as keyof typeof NETWORKS];
    
    if (!networkConfig) {
      throw new Error(`Unknown network: ${networkName}`);
    }

    console.log(`\n🚀 Deploying to ${networkConfig.name}...`);
    console.log(`📊 Network: ${networkConfig.name} (Chain ID: ${network.chainId})`);
    
    // Verify we're on the correct network
    if (Number(network.chainId) !== networkConfig.chainId) {
      throw new Error(
        `Network mismatch! Expected ${networkConfig.chainId}, got ${network.chainId}`
      );
    }

    // Get deployer account
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    const balance = await ethers.provider.getBalance(deployerAddress);
    
    console.log(`👤 Deployer: ${deployerAddress}`);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ${networkConfig.currency}`);

    if (balance === 0n) {
      throw new Error(`Insufficient balance! Please fund the deployer account with ${networkConfig.currency}`);
    }

    // Deploy the contract
    console.log("📝 Deploying EnergyMarket contract...");
    const EnergyMarket = await ethers.getContractFactory("EnergyMarket");
    
    // Use safe gas limits for each network
    let gasLimit: bigint;

    // Set appropriate gas limits based on network
    switch (networkConfig.chainId) {
      case 97: // BSC Testnet
        gasLimit = 1000000n;
        console.log(`⛽ Using BSC gas limit: ${gasLimit.toString()}`);
        break;
      case 2749656616387000: // Saga Chainlet
        gasLimit = 500000n;
        console.log(`⛽ Using Saga gas limit: ${gasLimit.toString()}`);
        break;
      case 4202: // Lisk Sepolia
        gasLimit = 300000n;
        console.log(`⛽ Using Lisk gas limit: ${gasLimit.toString()}`);
        break;
      default:
        // Try to estimate gas for unknown networks
        try {
          const deploymentData = EnergyMarket.interface.encodeDeploy([]);
          const gasEstimate = await ethers.provider.estimateGas({
            data: deploymentData,
          });

          console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
          gasLimit = gasEstimate * 200n / 100n; // 100% buffer for unknown networks
          console.log(`⛽ Using estimated gas limit: ${gasLimit.toString()}`);
        } catch (error) {
          console.log(`⚠️ Gas estimation failed, using default gas limit`);
          gasLimit = 500000n;
        }
        break;
    }

    const contract = await EnergyMarket.deploy({
      gasLimit: gasLimit,
    });
    
    console.log(`📤 Transaction sent: ${contract.deploymentTransaction()?.hash}`);
    console.log("⏳ Waiting for deployment confirmation...");
    
    // Wait for deployment
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    const deploymentTx = contract.deploymentTransaction();
    
    if (!deploymentTx) {
      throw new Error("Deployment transaction not found");
    }
    
    const receipt = await deploymentTx.wait();
    if (!receipt) {
      throw new Error("Deployment receipt not found");
    }

    console.log(`✅ Contract deployed successfully!`);
    console.log(`📍 Address: ${contractAddress}`);
    console.log(`🧾 Transaction: ${deploymentTx.hash}`);
    console.log(`📦 Block: ${receipt.blockNumber}`);
    console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`🔗 Explorer: ${networkConfig.explorer}/address/${contractAddress}`);

    // Test the contract
    console.log("🧪 Testing contract functionality...");
    const offerCount = await contract.getOfferCount();
    console.log(`📊 Initial offer count: ${offerCount}`);

    return {
      network: networkName,
      chainId: networkConfig.chainId,
      contractAddress,
      transactionHash: deploymentTx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      deployedAt: new Date().toISOString(),
      verified: false,
    };

  } catch (error) {
    console.error(`❌ Deployment failed on ${networkName}:`, error);
    return null;
  }
}

async function verifyContract(
  networkName: string,
  contractAddress: string
): Promise<boolean> {
  try {
    const networkConfig = NETWORKS[networkName as keyof typeof NETWORKS];
    console.log(`\n🔍 Verifying contract on ${networkConfig.name}...`);

    // Import hardhat-verify dynamically
    const hre = require("hardhat");
    
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
    });

    console.log(`✅ Contract verified on ${networkConfig.name}`);
    console.log(`🔗 View on explorer: ${networkConfig.explorer}/address/${contractAddress}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Verification failed on ${networkName}:`, error);
    return false;
  }
}

async function deployToNetwork(networkName: string): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🌐 DEPLOYING TO ${networkName.toUpperCase()}`);
  console.log(`${"=".repeat(60)}`);

  // Load existing deployments
  const deployments = await loadExistingDeployments();

  // Check if already deployed
  if (deployments[networkName]) {
    console.log(`⚠️ Contract already deployed on ${networkName}`);
    console.log(`📍 Address: ${deployments[networkName].contractAddress}`);
    console.log(`🔗 Explorer: ${NETWORKS[networkName as keyof typeof NETWORKS].explorer}/address/${deployments[networkName].contractAddress}`);
    
    const shouldRedeploy = process.argv.includes("--force");
    if (!shouldRedeploy) {
      console.log("💡 Use --force flag to redeploy");
      return;
    }
  }

  // Deploy contract
  const deploymentInfo = await deployContract(networkName);
  if (!deploymentInfo) {
    console.log(`❌ Deployment failed on ${networkName}`);
    return;
  }

  // Save deployment info
  deployments[networkName] = deploymentInfo;
  await saveDeployments(deployments);

  // Verify contract (with delay for block confirmations)
  console.log("\n⏳ Waiting 30 seconds before verification...");
  await new Promise(resolve => setTimeout(resolve, 30000));

  const verified = await verifyContract(networkName, deploymentInfo.contractAddress);
  if (verified) {
    deployments[networkName].verified = true;
    await saveDeployments(deployments);
  }

  console.log(`\n🎉 ${networkName} deployment complete!`);
}

async function deployToAllNetworks(): Promise<void> {
  console.log("🚀 Starting multi-chain deployment...");
  console.log(`📅 ${new Date().toISOString()}`);

  const networks = Object.keys(NETWORKS);
  const targetNetworks = process.argv.slice(2).filter(arg => !arg.startsWith("--"));
  
  const networksToDeploy = targetNetworks.length > 0 ? targetNetworks : networks;

  console.log(`🎯 Target networks: ${networksTodeploy.join(", ")}`);

  for (const networkName of networksTodeploy) {
    if (!NETWORKS[networkName as keyof typeof NETWORKS]) {
      console.log(`⚠️ Unknown network: ${networkName}`);
      continue;
    }

    try {
      await deployToNetwork(networkName);
    } catch (error) {
      console.error(`❌ Failed to deploy to ${networkName}:`, error);
    }

    // Wait between deployments
    if (networksTodeploy.indexOf(networkName) < networksTodeploy.length - 1) {
      console.log("\n⏳ Waiting 10 seconds before next deployment...");
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  // Final summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("🎉 MULTI-CHAIN DEPLOYMENT SUMMARY");
  console.log(`${"=".repeat(60)}`);

  const deployments = await loadExistingDeployments();
  for (const [networkName, info] of Object.entries(deployments)) {
    const networkConfig = NETWORKS[networkName as keyof typeof NETWORKS];
    if (networkConfig) {
      console.log(`\n🌐 ${networkConfig.name}:`);
      console.log(`   📍 Address: ${info.contractAddress}`);
      console.log(`   🧾 Transaction: ${info.transactionHash}`);
      console.log(`   ✅ Verified: ${info.verified ? "Yes" : "No"}`);
      console.log(`   🔗 Explorer: ${networkConfig.explorer}/address/${info.contractAddress}`);
    }
  }

  console.log(`\n📄 Deployment details saved to: ${DEPLOYMENT_FILE}`);
  console.log("🎉 Multi-chain deployment complete!");
}

// Main execution
if (require.main === module) {
  deployToAllNetworks()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Deployment script failed:", error);
      process.exit(1);
    });
}

export { deployToAllNetworks, deployToNetwork, NETWORKS };
