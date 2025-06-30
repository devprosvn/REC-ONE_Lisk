// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EnergyMarketCompat
 * @dev P2P Energy Trading Smart Contract - Compatible Version
 * @author REC-ONE Team
 */
contract EnergyMarketCompat {
    // Struct to represent an energy offer
    struct EnergyOffer {
        uint256 id;
        address seller;
        uint256 quantity; // in kWh
        uint256 price; // in wei per kWh
        bool isActive;
        uint256 timestamp;
    }

    // State variables
    mapping(uint256 => EnergyOffer) public offers;
    mapping(address => uint256[]) public userOffers;
    uint256 public offerCount;
    uint256 public totalEnergyTraded;
    uint256 public totalValueTraded;

    // Events
    event OfferCreated(
        uint256 indexed offerId,
        address indexed seller,
        uint256 quantity,
        uint256 price
    );

    event OfferPurchased(
        uint256 indexed offerId,
        address indexed buyer,
        address indexed seller,
        uint256 quantity,
        uint256 price
    );

    event OfferCancelled(
        uint256 indexed offerId,
        address indexed seller
    );

    // Modifiers
    modifier validOffer(uint256 _offerId) {
        require(_offerId > 0 && _offerId <= offerCount, "Invalid offer ID");
        require(offers[_offerId].isActive, "Offer is not active");
        _;
    }

    modifier onlySeller(uint256 _offerId) {
        require(offers[_offerId].seller == msg.sender, "Only seller can perform this action");
        _;
    }

    // Constructor
    constructor() {
        offerCount = 0;
        totalEnergyTraded = 0;
        totalValueTraded = 0;
    }

    /**
     * @dev Create a new energy offer
     * @param _quantity Energy quantity in kWh
     * @param _price Price per kWh in wei
     * @return offerId The ID of the created offer
     */
    function createOffer(uint256 _quantity, uint256 _price) 
        external 
        returns (uint256 offerId) 
    {
        require(_quantity > 0, "Quantity must be greater than 0");
        require(_price > 0, "Price must be greater than 0");

        offerCount++;
        offerId = offerCount;

        offers[offerId] = EnergyOffer({
            id: offerId,
            seller: msg.sender,
            quantity: _quantity,
            price: _price,
            isActive: true,
            timestamp: block.timestamp
        });

        userOffers[msg.sender].push(offerId);

        emit OfferCreated(offerId, msg.sender, _quantity, _price);
        return offerId;
    }

    /**
     * @dev Purchase an energy offer
     * @param _offerId The ID of the offer to purchase
     */
    function purchaseOffer(uint256 _offerId) 
        external 
        payable 
        validOffer(_offerId) 
    {
        EnergyOffer storage offer = offers[_offerId];
        
        require(offer.seller != msg.sender, "Cannot purchase your own offer");
        
        uint256 totalCost = offer.quantity * offer.price;
        require(msg.value >= totalCost, "Insufficient payment");

        // Mark offer as inactive
        offer.isActive = false;

        // Update statistics
        totalEnergyTraded += offer.quantity;
        totalValueTraded += totalCost;

        // Transfer payment to seller
        payable(offer.seller).transfer(totalCost);

        // Refund excess payment
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }

        emit OfferPurchased(_offerId, msg.sender, offer.seller, offer.quantity, offer.price);
    }

    /**
     * @dev Cancel an energy offer
     * @param _offerId The ID of the offer to cancel
     */
    function cancelOffer(uint256 _offerId) 
        external 
        validOffer(_offerId) 
        onlySeller(_offerId) 
    {
        offers[_offerId].isActive = false;
        emit OfferCancelled(_offerId, msg.sender);
    }

    /**
     * @dev Get offer details
     * @param _offerId The ID of the offer
     * @return offer The offer details
     */
    function getOffer(uint256 _offerId) 
        external 
        view 
        returns (EnergyOffer memory offer) 
    {
        require(_offerId > 0 && _offerId <= offerCount, "Invalid offer ID");
        return offers[_offerId];
    }

    /**
     * @dev Get all active offer IDs
     * @return activeOffers Array of active offer IDs
     */
    function getActiveOffers() 
        external 
        view 
        returns (uint256[] memory activeOffers) 
    {
        uint256 activeCount = 0;
        
        // Count active offers
        for (uint256 i = 1; i <= offerCount; i++) {
            if (offers[i].isActive) {
                activeCount++;
            }
        }
        
        // Create array of active offer IDs
        activeOffers = new uint256[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= offerCount; i++) {
            if (offers[i].isActive) {
                activeOffers[index] = i;
                index++;
            }
        }
        
        return activeOffers;
    }

    /**
     * @dev Get offers created by a specific user
     * @param _user The address of the user
     * @return userOfferIds Array of offer IDs created by the user
     */
    function getUserOffers(address _user) 
        external 
        view 
        returns (uint256[] memory userOfferIds) 
    {
        return userOffers[_user];
    }

    /**
     * @dev Get the total number of offers created
     * @return count The total offer count
     */
    function getOfferCount() 
        external 
        view 
        returns (uint256 count) 
    {
        return offerCount;
    }

    /**
     * @dev Get trading statistics
     * @return energyTraded Total energy traded in kWh
     * @return valueTraded Total value traded in wei
     * @return totalOffers Total number of offers created
     */
    function getTradingStats() 
        external 
        view 
        returns (uint256 energyTraded, uint256 valueTraded, uint256 totalOffers) 
    {
        return (totalEnergyTraded, totalValueTraded, offerCount);
    }

    /**
     * @dev Emergency function to withdraw contract balance (if any)
     * Only for emergency situations
     */
    function emergencyWithdraw() external {
        require(msg.sender == address(this), "Emergency only");
        payable(msg.sender).transfer(address(this).balance);
    }

    /**
     * @dev Get contract balance
     * @return balance The contract balance in wei
     */
    function getContractBalance() 
        external 
        view 
        returns (uint256 balance) 
    {
        return address(this).balance;
    }

    // Fallback function to receive Ether
    receive() external payable {
        // Contract can receive Ether
    }
}
