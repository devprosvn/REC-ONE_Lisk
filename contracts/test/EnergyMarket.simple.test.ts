import { expect } from "chai";
import { ethers } from "hardhat";

describe("EnergyMarket - Simple Tests", function () {
  let energyMarket: any;
  let owner: any;
  let seller: any;
  let buyer: any;

  beforeEach(async function () {
    [owner, seller, buyer] = await ethers.getSigners();

    const EnergyMarketFactory = await ethers.getContractFactory("EnergyMarket");
    energyMarket = await EnergyMarketFactory.deploy();
  });

  it("Should deploy successfully", async function () {
    expect(await energyMarket.getAddress()).to.be.a('string');
  });

  it("Should allow energy generation", async function () {
    const quantity = 100;

    await energyMarket.connect(seller).generateEnergyReading(quantity);

    expect(await energyMarket.getEnergyBalance(seller.address)).to.equal(BigInt(quantity));
  });

  it("Should allow creating offers", async function () {
    // First generate energy
    await energyMarket.connect(seller).generateEnergyReading(200);
    
    // Create offer
    const quantity = 50;
    const price = ethers.parseEther("0.1");
    
    await energyMarket.connect(seller).createOffer(quantity, price);
    
    const offer = await energyMarket.getOffer(1);
    expect(offer.seller).to.equal(seller.address);
    expect(offer.quantity).to.equal(BigInt(quantity));
    expect(offer.isActive).to.be.true;
  });

  it("Should allow purchasing offers", async function () {
    // Setup: Generate energy and create offer
    await energyMarket.connect(seller).generateEnergyReading(200);
    
    const quantity = 50;
    const price = ethers.parseEther("0.1");
    await energyMarket.connect(seller).createOffer(quantity, price);
    
    // Purchase the offer
    const totalPrice = BigInt(quantity) * price;
    await energyMarket.connect(buyer).purchaseOffer(1, { value: totalPrice });
    
    // Check offer is no longer active
    const offer = await energyMarket.getOffer(1);
    expect(offer.isActive).to.be.false;
  });

  it("Should track active offers correctly", async function () {
    // Generate energy for multiple users
    await energyMarket.connect(seller).generateEnergyReading(200);
    await energyMarket.connect(buyer).generateEnergyReading(100);
    
    // Create multiple offers
    await energyMarket.connect(seller).createOffer(50, ethers.parseEther("0.1"));
    await energyMarket.connect(buyer).createOffer(30, ethers.parseEther("0.15"));
    
    const activeOffers = await energyMarket.getActiveOffers();
    expect(activeOffers.length).to.equal(2);
    
    expect(await energyMarket.getActiveOffersCount()).to.equal(BigInt(2));
    expect(await energyMarket.getTotalOffers()).to.equal(BigInt(2));
  });
});
