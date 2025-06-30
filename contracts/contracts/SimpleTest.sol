// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SimpleTest
 * @dev Minimal contract for testing deployment on different networks
 */
contract SimpleTest {
    uint256 public value;
    address public owner;
    
    event ValueSet(uint256 newValue);
    
    constructor() {
        owner = msg.sender;
        value = 42;
    }
    
    function setValue(uint256 _value) external {
        value = _value;
        emit ValueSet(_value);
    }
    
    function getValue() external view returns (uint256) {
        return value;
    }
    
    function getOwner() external view returns (address) {
        return owner;
    }
}
