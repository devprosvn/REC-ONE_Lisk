// Deploy to BNB Smart Chain Testnet
import { deployToNetwork } from "./deploy-multichain";

async function main() {
  console.log("💰 Deploying to BNB Smart Chain Testnet...");
  await deployToNetwork("bscTestnet");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ BSC deployment failed:", error);
    process.exit(1);
  });
