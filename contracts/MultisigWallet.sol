// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import "./interfaces/IERC20.sol";

contract MultisigWallet {
    struct Transaction {
        address to;
        uint value;
        bytes data;
        bool executed;
        uint confirmationCount;
    }

    event Deposit(address indexed sender, uint amount);
    event TransactionSubmitted(
        address indexed owner,
        uint indexed txIndex,
        address to,
        uint value,
        bytes data
    );
    event TransactionConfirmed(address indexed owner, uint indexed txIndex);
    event TransactionExecuted(address indexed owner, uint indexed txIndex);

    address[] public owners;
    mapping(address => bool) public isOwner;
    uint public requiredConfirmations;
    Transaction[] public transactions;
    mapping(uint => mapping(address => bool)) public confirmations;

    constructor(address[] memory _owners, uint _requiredConfirmations) {
        require(_owners.length > 0, "Owners must not be empty");
        require(
            _requiredConfirmations > 0 &&
                _requiredConfirmations <= _owners.length,
            "Total confirmations exceed owners or zero"
        );

        bool flag = false;

        for (uint i = 0; i < _owners.length; i++) {
            flag = false;
            for (uint j = 0; j < i; j++) {
                if (owners[j] == _owners[i] || _owners[i] == address(0)) {
                    flag = true;
                }
            }
            if (!flag) {
                owners.push(_owners[i]);
                isOwner[owners[i]] = true;
            }
        }

        requiredConfirmations = _requiredConfirmations;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    function submitTransaction(
        address _to,
        uint _value,
        bytes calldata _data
    ) external returns (uint txIndex) {
        require(isOwner[msg.sender], "Only owner can call this function");
        txIndex = transactions.length;
        transactions.push(
            Transaction({
                to: _to,
                value: _value,
                data: _data,
                executed: false,
                confirmationCount: 0
            })
        );
        emit TransactionSubmitted(msg.sender, txIndex, _to, _value, _data);
        return txIndex;
    }

    function confirmTransaction(uint _txIndex) external {
        require(isOwner[msg.sender], "Only owner can call this function");
        require(_txIndex < transactions.length, "The transaction is not exist");
        
        Transaction storage transaction = transactions[_txIndex];

        require(!transaction.executed, "The transaction is already executed");
        require(
            !confirmations[_txIndex][msg.sender],
            "The transaction is already confirmed"
        );
        confirmations[_txIndex][msg.sender] = true;
        transaction.confirmationCount++;
        emit TransactionConfirmed(msg.sender, _txIndex);
    }

    function executeTransaction(uint _txIndex) external {
        require(_txIndex < transactions.length, "The transaction is not exist");
        
        Transaction storage transaction = transactions[_txIndex];

        require(isOwner[msg.sender], "Only owner can call this function");
        require(
            transaction.confirmationCount >= requiredConfirmations,
            "The transaction doesn't have enough confirmation"
        );
        require(!transaction.executed, "The transaction is already executed");
        transactions[_txIndex].executed = true;
        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );
        require(success, "Transaction failed");

        emit TransactionExecuted(msg.sender, _txIndex);
    }
}
