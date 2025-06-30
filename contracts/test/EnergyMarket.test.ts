import { expect } from "chai";
import { ethers } from "hardhat";

describe("EnergyMarket", function () {
  let energyMarket: any;
  let owner: any;
  let seller: any;
  let buyer: any;
  let otherAccount: any;

  beforeEach(async function () {
    [owner, seller, buyer, otherAccount] = await ethers.getSigners();

    const EnergyMarketFactory = await ethers.getContractFactory("EnergyMarket");
    energyMarket = await EnergyMarketFactory.deploy();
  });

  describe("Energy Generation", function () {
    it("Should allow users to generate energy", async function () {
      const quantity = 100; // 100 kWh

      await expect(energyMarket.connect(seller).generateEnergyReading(quantity))
        .to.emit(energyMarket, "EnergyGenerated");

      expect(await energyMarket.getEnergyBalance(seller.address)).to.equal(quantity);
    });

    it("Should reject zero quantity energy generation", async function () {
      await expect(energyMarket.connect(seller).generateEnergyReading(0))
        .to.be.revertedWith("Quantity must be greater than 0");
    });

    it("Should accumulate energy balance", async function () {
      await energyMarket.connect(seller).generateEnergyReading(50);
      await energyMarket.connect(seller).generateEnergyReading(30);

      expect(await energyMarket.getEnergyBalance(seller.address)).to.equal(80);
    });
  });

  describe("Offer Creation", function () {
    beforeEach(async function () {
      // Generate some energy for the seller
      await energyMarket.connect(seller).generateEnergyReading(200);
    });

    it("Should allow users to create energy offers", async function () {
      const quantity = 50;
      const price = ethers.parseEther("0.1"); // 0.1 ETH per kWh

      await expect(energyMarket.connect(seller).createOffer(quantity, price))
        .to.emit(energyMarket, "OfferCreated");

      const offer = await energyMarket.getOffer(1);
      expect(offer.seller).to.equal(seller.address);
      expect(offer.quantity).to.equal(quantity);
      expect(offer.price).to.equal(price);
      expect(offer.isActive).to.be.true;

      // Energy should be deducted from seller's balance
      expect(await energyMarket.getEnergyBalance(seller.address)).to.equal(150);
    });

    it("Should reject offers with insufficient energy balance", async function () {
      const quantity = 300; // More than available
      const price = ethers.parseEther("0.1");

      await expect(energyMarket.connect(seller).createOffer(quantity, price))
        .to.be.revertedWith("Insufficient energy balance");
    });

    it("Should reject offers with zero quantity or price", async function () {
      const price = ethers.parseEther("0.1");

      await expect(energyMarket.connect(seller).createOffer(0, price))
        .to.be.revertedWith("Quantity must be greater than 0");

      await expect(energyMarket.connect(seller).createOffer(50, 0))
        .to.be.revertedWith("Price must be greater than 0");
    });
  });

  describe("Offer Purchase", function () {
    let offerId: number;
    const quantity = 50;
    const price = ethers.parseEther("0.1");

    beforeEach(async function () {
      // Setup: Generate energy and create offer
      await energyMarket.connect(seller).generateEnergyReading(200);
      await energyMarket.connect(seller).createOffer(quantity, price);
      offerId = 1;
    });

    it("Should allow users to purchase energy offers", async function () {
      const totalPrice = quantity * Number(price);
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);

      await expect(
        energyMarket.connect(buyer).purchaseOffer(offerId, { value: totalPrice })
      )
        .to.emit(energyMarket, "OfferPurchased")
        .withArgs(offerId, buyer.address, seller.address, quantity, totalPrice);

      // Check offer is no longer active
      const offer = await energyMarket.getOffer(offerId);
      expect(offer.isActive).to.be.false;

      // Check seller received payment
      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(totalPrice);
    });

    it("Should reject purchase with insufficient payment", async function () {
      const insufficientPayment = ethers.parseEther("1"); // Less than required

      await expect(
        energyMarket.connect(buyer).purchaseOffer(offerId, { value: insufficientPayment })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should reject seller buying their own offer", async function () {
      const totalPrice = quantity * Number(price);

      await expect(
        energyMarket.connect(seller).purchaseOffer(offerId, { value: totalPrice })
      ).to.be.revertedWith("Seller cannot buy their own offer");
    });

    it("Should return excess payment", async function () {
      const totalPrice = BigInt(quantity) * price;
      const excessPayment = totalPrice + ethers.parseEther("1");
      
      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);
      
      const tx = await energyMarket.connect(buyer).purchaseOffer(offerId, { value: excessPayment });
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      
      const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
      
      // Buyer should only pay the total price + gas
      expect(buyerBalanceBefore - buyerBalanceAfter).to.equal(totalPrice + gasUsed);
    });
  });

  describe("Offer Cancellation", function () {
    let offerId: number;
    const quantity = 50;
    const price = ethers.parseEther("0.1");

    beforeEach(async function () {
      await energyMarket.connect(seller).generateEnergyReading(200);
      await energyMarket.connect(seller).createOffer(quantity, price);
      offerId = 1;
    });

    it("Should allow seller to cancel their offer", async function () {
      await expect(energyMarket.connect(seller).cancelOffer(offerId))
        .to.emit(energyMarket, "OfferCancelled")
        .withArgs(offerId, seller.address);

      // Check offer is no longer active
      const offer = await energyMarket.getOffer(offerId);
      expect(offer.isActive).to.be.false;

      // Check energy is returned to seller
      expect(await energyMarket.getEnergyBalance(seller.address)).to.equal(200);
    });

    it("Should reject cancellation by non-seller", async function () {
      await expect(energyMarket.connect(buyer).cancelOffer(offerId))
        .to.be.revertedWith("Only seller can perform this action");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      // Setup multiple offers
      await energyMarket.connect(seller).generateEnergyReading(300);
      await energyMarket.connect(seller).createOffer(50, ethers.parseEther("0.1"));
      await energyMarket.connect(seller).createOffer(75, ethers.parseEther("0.15"));
      
      await energyMarket.connect(otherAccount).generateEnergyReading(100);
      await energyMarket.connect(otherAccount).createOffer(25, ethers.parseEther("0.2"));
    });

    it("Should return active offers", async function () {
      const activeOffers = await energyMarket.getActiveOffers();
      expect(activeOffers.length).to.equal(3);
      expect(activeOffers).to.deep.equal([1n, 2n, 3n]);
    });

    it("Should return user offers", async function () {
      const sellerOffers = await energyMarket.getUserOffers(seller.address);
      expect(sellerOffers.length).to.equal(2);
      expect(sellerOffers).to.deep.equal([1n, 2n]);

      const otherOffers = await energyMarket.getUserOffers(otherAccount.address);
      expect(otherOffers.length).to.equal(1);
      expect(otherOffers).to.deep.equal([3n]);
    });

    it("Should return correct counts", async function () {
      expect(await energyMarket.getTotalOffers()).to.equal(3);
      expect(await energyMarket.getActiveOffersCount()).to.equal(3);

      // Purchase one offer
      await energyMarket.connect(buyer).purchaseOffer(1, { 
        value: 50n * ethers.parseEther("0.1") 
      });

      expect(await energyMarket.getTotalOffers()).to.equal(3);
      expect(await energyMarket.getActiveOffersCount()).to.equal(2);
    });
  });
});

// Helper function for time
const time = {
  latest: async () => {
    const block = await ethers.provider.getBlock("latest");
    return block!.timestamp;
  }
};
