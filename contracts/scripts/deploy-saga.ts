// Deploy to Saga DevPros Chainlet
import { deployToNetwork } from "./deploy-multichain";

async function main() {
  console.log("🌟 Deploying to Saga DevPros Chainlet...");
  await deployToNetwork("sagaChainlet");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Saga deployment failed:", error);
    process.exit(1);
  });
