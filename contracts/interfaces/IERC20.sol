// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20 {
    function transfer(address to , uint256 amount) external returns (bool);
    function balanceOf(address account) external returns (uint);
}