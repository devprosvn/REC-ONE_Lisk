import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const EnergyMarketModule = buildModule("EnergyMarketModule", (m) => {
  const energyMarket = m.contract("EnergyMarket");

  return { energyMarket };
});

export default EnergyMarketModule;
