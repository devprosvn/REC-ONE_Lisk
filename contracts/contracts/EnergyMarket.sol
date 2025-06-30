// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title EnergyMarket
 * @dev P2P Energy Trading Smart Contract for Lisk Sepolia
 * @author REC-ONE Team
 */
contract EnergyMarket {
    // Struct to represent an energy offer
    struct Offer {
        uint256 id;
        address seller;
        uint256 quantity; // in kWh
        uint256 price; // price per kWh in wei (LSK)
        bool isActive;
        uint256 timestamp;
    }

    // State variables
    mapping(address => uint256) public energyBalance; // Energy balance in kWh for each user
    mapping(uint256 => Offer) public offers; // All energy offers
    mapping(address => uint256[]) public userOffers; // Offers created by each user
    
    uint256 public nextOfferId = 1;
    uint256[] public activeOfferIds;

    // Events
    event EnergyGenerated(address indexed user, uint256 quantity, uint256 timestamp);
    event OfferCreated(uint256 indexed offerId, address indexed seller, uint256 quantity, uint256 price);
    event OfferPurchased(uint256 indexed offerId, address indexed buyer, address indexed seller, uint256 quantity, uint256 totalPrice);
    event OfferCancelled(uint256 indexed offerId, address indexed seller);

    // Modifiers
    modifier validQuantity(uint256 _quantity) {
        require(_quantity > 0, "Quantity must be greater than 0");
        _;
    }

    modifier validPrice(uint256 _price) {
        require(_price > 0, "Price must be greater than 0");
        _;
    }

    modifier offerExists(uint256 _offerId) {
        require(_offerId > 0 && _offerId < nextOfferId, "Offer does not exist");
        _;
    }

    modifier offerActive(uint256 _offerId) {
        require(offers[_offerId].isActive, "Offer is not active");
        _;
    }

    modifier onlySeller(uint256 _offerId) {
        require(offers[_offerId].seller == msg.sender, "Only seller can perform this action");
        _;
    }

    modifier notSeller(uint256 _offerId) {
        require(offers[_offerId].seller != msg.sender, "Seller cannot buy their own offer");
        _;
    }

    /**
     * @dev Simulate energy generation (like smart meter reading)
     * @param _quantity Amount of energy generated in kWh
     */
    function generateEnergyReading(uint256 _quantity) 
        external 
        validQuantity(_quantity) 
    {
        energyBalance[msg.sender] += _quantity;
        emit EnergyGenerated(msg.sender, _quantity, block.timestamp);
    }

    /**
     * @dev Create an energy offer for sale
     * @param _quantity Amount of energy to sell in kWh
     * @param _price Price per kWh in wei
     */
    function createOffer(uint256 _quantity, uint256 _price) 
        external 
        validQuantity(_quantity) 
        validPrice(_price) 
    {
        require(energyBalance[msg.sender] >= _quantity, "Insufficient energy balance");
        
        // Deduct energy from seller's balance
        energyBalance[msg.sender] -= _quantity;
        
        // Create new offer
        uint256 offerId = nextOfferId++;
        offers[offerId] = Offer({
            id: offerId,
            seller: msg.sender,
            quantity: _quantity,
            price: _price,
            isActive: true,
            timestamp: block.timestamp
        });
        
        // Add to user's offers and active offers
        userOffers[msg.sender].push(offerId);
        activeOfferIds.push(offerId);
        
        emit OfferCreated(offerId, msg.sender, _quantity, _price);
    }

    /**
     * @dev Purchase an energy offer
     * @param _offerId ID of the offer to purchase
     */
    function purchaseOffer(uint256 _offerId) 
        external 
        payable 
        offerExists(_offerId) 
        offerActive(_offerId) 
        notSeller(_offerId) 
    {
        Offer storage offer = offers[_offerId];
        uint256 totalPrice = offer.quantity * offer.price;
        
        require(msg.value >= totalPrice, "Insufficient payment");
        
        // Transfer payment to seller
        payable(offer.seller).transfer(totalPrice);
        
        // Return excess payment if any
        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }
        
        // Mark offer as inactive
        offer.isActive = false;
        
        // Remove from active offers
        _removeFromActiveOffers(_offerId);
        
        emit OfferPurchased(_offerId, msg.sender, offer.seller, offer.quantity, totalPrice);
    }

    /**
     * @dev Cancel an active offer (only by seller)
     * @param _offerId ID of the offer to cancel
     */
    function cancelOffer(uint256 _offerId) 
        external 
        offerExists(_offerId) 
        offerActive(_offerId) 
        onlySeller(_offerId) 
    {
        Offer storage offer = offers[_offerId];
        
        // Return energy to seller's balance
        energyBalance[offer.seller] += offer.quantity;
        
        // Mark offer as inactive
        offer.isActive = false;
        
        // Remove from active offers
        _removeFromActiveOffers(_offerId);
        
        emit OfferCancelled(_offerId, msg.sender);
    }

    /**
     * @dev Get all active offers
     * @return Array of active offer IDs
     */
    function getActiveOffers() external view returns (uint256[] memory) {
        return activeOfferIds;
    }

    /**
     * @dev Get offers created by a specific user
     * @param _user Address of the user
     * @return Array of offer IDs created by the user
     */
    function getUserOffers(address _user) external view returns (uint256[] memory) {
        return userOffers[_user];
    }

    /**
     * @dev Get detailed information about an offer
     * @param _offerId ID of the offer
     * @return Offer details
     */
    function getOffer(uint256 _offerId) 
        external 
        view 
        offerExists(_offerId) 
        returns (Offer memory) 
    {
        return offers[_offerId];
    }

    /**
     * @dev Get energy balance of a user
     * @param _user Address of the user
     * @return Energy balance in kWh
     */
    function getEnergyBalance(address _user) external view returns (uint256) {
        return energyBalance[_user];
    }

    /**
     * @dev Internal function to remove offer from active offers array
     * @param _offerId ID of the offer to remove
     */
    function _removeFromActiveOffers(uint256 _offerId) internal {
        for (uint256 i = 0; i < activeOfferIds.length; i++) {
            if (activeOfferIds[i] == _offerId) {
                activeOfferIds[i] = activeOfferIds[activeOfferIds.length - 1];
                activeOfferIds.pop();
                break;
            }
        }
    }

    /**
     * @dev Get total number of offers created
     * @return Total number of offers
     */
    function getTotalOffers() external view returns (uint256) {
        return nextOfferId - 1;
    }

    /**
     * @dev Get number of active offers
     * @return Number of active offers
     */
    function getActiveOffersCount() external view returns (uint256) {
        return activeOfferIds.length;
    }
}
