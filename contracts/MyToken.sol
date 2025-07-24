// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        // Mint the initial supply to the contract deployer (msg.sender)
        // Note: The amount must be multiplied by 10**decimals(). ERC20 uses 18 decimals by default.
        _mint(msg.sender, initialSupply * (10**decimals()));
    }
}