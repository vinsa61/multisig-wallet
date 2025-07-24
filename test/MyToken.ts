import { ethers } from "hardhat";
import { assert, expect } from "chai";
import { MyToken__factory } from "../typechain-types";
import "@nomicfoundation/hardhat-chai-matchers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("MyToken Test", function(){
    async function deployMyToken() {
        const [account0, account1] = await ethers.getSigners();
    
        const name = "Serene";
        const symbol = "SER";
        const initialSupply = 1000;
        const MyToken = (await ethers.getContractFactory(
          "MyToken"
        )) as MyToken__factory;
        const myToken = await MyToken.deploy(name, symbol, initialSupply);
    
        return {myToken, account0, account1};
    }

    it("Token name, symbol, total supply, minted to deployer's address, and transfer between accounts.", async function(){
        const {myToken, account0, account1} = await loadFixture(deployMyToken);
        const deployedTokens = ethers.parseUnits("1000", 18);
        const amount = ethers.parseUnits("100", 18);

        assert.equal(await myToken.name(), "Serene");
        assert.equal(await myToken.symbol(), "SER");
        assert.equal(await myToken.totalSupply(), deployedTokens);
        assert.equal(await myToken.balanceOf(account0.address), deployedTokens);
        await myToken.connect(account0).transfer(account1.address, amount);
        assert.equal(await myToken.balanceOf(account1.address), amount);
    })
    
})