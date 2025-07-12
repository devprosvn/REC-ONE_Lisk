import { ethers } from "hardhat";

async function main() {
  console.log("Deploying EnergyMarket contract to Lisk Sepolia...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  try {
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");

    if (balance === 0n) {
      console.error("❌ Account has no balance! Please get test ETH from https://sepolia-faucet.lisk.com/");
      process.exit(1);
    }
  } catch (error) {
    console.error("Error checking balance:", error);
  }

  // Deploy the contract
  console.log("📦 Deploying EnergyMarket contract...");
  const EnergyMarket = await ethers.getContractFactory("EnergyMarket");

  try {
    const energyMarket = await EnergyMarket.deploy();
    console.log("⏳ Waiting for deployment...");

    await energyMarket.waitForDeployment();
    const contractAddress = await energyMarket.getAddress();

    console.log("✅ EnergyMarket deployed to:", contractAddress);

    // Verify deployment
    console.log("🔍 Verifying deployment...");
    const totalOffers = await energyMarket.getTotalOffers();
    const activeOffersCount = await energyMarket.getActiveOffersCount();

    console.log("Total offers:", totalOffers.toString());
    console.log("Active offers count:", activeOffersCount.toString());

    console.log("\n🎉 === Deployment Summary ===");
    console.log("Contract Address:", contractAddress);
    console.log("Network: Lisk Sepolia Testnet");
    console.log("Block Explorer: https://sepolia-blockscout.lisk.com/address/" + contractAddress);
    console.log("Deployer:", deployer.address);

    // Save deployment info
    const deploymentInfo = {
      contractAddress: contractAddress,
      network: "liskSepolia",
      chainId: 4202,
      deployer: deployer.address,
      blockExplorer: `https://sepolia-blockscout.lisk.com/address/${contractAddress}`,
      deployedAt: new Date().toISOString()
    };

    console.log("\n📋 === Copy this for frontend integration ===");
    console.log("CONTRACT_ADDRESS =", `'${contractAddress}'`);
    console.log("\n📄 Full deployment info:");
    console.log(JSON.stringify(deploymentInfo, null, 2));

    console.log("\n🔧 Next steps:");
    console.log("1. Copy the CONTRACT_ADDRESS above");
    console.log("2. Update frontend/src/energy-app.ts with the new address");
    console.log("3. Start the frontend: cd ../frontend && npm run dev");

  } catch (error: any) {
    console.error("❌ Deployment failed:", error.message);

    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Solution: Get test ETH from https://sepolia-faucet.lisk.com/");
    }

    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
