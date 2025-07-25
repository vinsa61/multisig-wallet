import { ethers } from "hardhat";
import { assert, expect } from "chai";
import { MultisigWallet__factory, MyToken__factory } from "../typechain-types";
import "@nomicfoundation/hardhat-chai-matchers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("MultisigWallet Test", function () {
  async function deployMultisigFixture() {
    const [account0, account1, account2, account3, account4, nonOwner] =
      await ethers.getSigners();

    const owners = [
      await account0.getAddress(),
      await account1.getAddress(),
      await account2.getAddress(),
      await account3.getAddress(),
      await account4.getAddress(),
    ];
    const requiredConfirmations = 3;
    const name = "Serene";
    const symbol = "SER";
    const initialSupply = 1000;

    const MultisigFactory = (await ethers.getContractFactory(
      "MultisigWallet"
    )) as MultisigWallet__factory;
    const multisigWallet = await MultisigFactory.deploy(
      owners,
      requiredConfirmations
    );

    const MyTokenFactory = (await ethers.getContractFactory(
      "MyToken"
    )) as MyToken__factory;
    const myToken = await MyTokenFactory.deploy(name, symbol, initialSupply);

    return {
      multisigWallet,
      MultisigFactory,
      owners,
      requiredConfirmations,
      account0,
      account1,
      account2,
      nonOwner,
      myToken,
    };
  }

  it("Deployment and owner initialization", async function () {
    const { multisigWallet, owners } = await loadFixture(deployMultisigFixture);
    assert.isOk(await multisigWallet.getAddress());

    for (let i = 0; i < owners.length; i++) {
      assert.deepEqual(owners[i], await multisigWallet.owners(i));
    }
  });

  it("Invalid constructor arguments", async function () {
    const { MultisigFactory, owners } = await loadFixture(
      deployMultisigFixture
    );
    await expect(MultisigFactory.deploy([], 1)).to.be.revertedWith(
      "Owners must not be empty"
    );
    await expect(MultisigFactory.deploy(owners, 0)).to.be.revertedWith(
      "Total confirmations exceed owners or zero"
    );
    await expect(MultisigFactory.deploy(owners, 7)).to.be.revertedWith(
      "Total confirmations exceed owners or zero"
    );
  });

  it("Successful deposit", async function () {
    const { account0, multisigWallet } = await loadFixture(
      deployMultisigFixture
    );
    const depositAmount = ethers.parseEther("1.0");

    await expect(
      account0.sendTransaction({
        to: await multisigWallet.getAddress(),
        value: depositAmount,
      })
    )
      .to.emit(multisigWallet, "Deposit")
      .withArgs(account0.getAddress(), depositAmount);

    const finalBalance = await ethers.provider.getBalance(
      await multisigWallet.getAddress()
    );
    assert.equal(finalBalance, depositAmount);
  });

  it("Transaction submissions by owner", async function () {
    const { multisigWallet, account0, account1 } = await loadFixture(
      deployMultisigFixture
    );
    const to = account1.address;
    const value = ethers.parseEther("0.5");
    const data = "0x";

    await expect(
      multisigWallet.connect(account0).submitTransaction(to, value, data)
    )
      .to.emit(multisigWallet, "TransactionSubmitted")
      .withArgs(account0.address, 0, to, value, data);
  });

  it("Transaction submissions by non-owner", async function () {
    const { multisigWallet, account0, nonOwner } = await loadFixture(
      deployMultisigFixture
    );
    const to = account0.address;
    const value = ethers.parseEther("0.5");
    const data = "0x";

    await expect(
      multisigWallet.connect(nonOwner).submitTransaction(to, value, data)
    ).to.be.revertedWith("Only owner can call this function");
  });

  it("Transaction confirmations by multiple owners", async function () {
    const { multisigWallet, account0, account1, account2 } = await loadFixture(
      deployMultisigFixture
    );
    const to = account1.address;
    const value = ethers.parseEther("0.5");
    const data = "0x";
    const txIndex = 0;

    await multisigWallet.connect(account0).submitTransaction(to, value, data);

    await expect(multisigWallet.connect(account0).confirmTransaction(txIndex))
      .to.emit(multisigWallet, "TransactionConfirmed")
      .withArgs(account0.address, txIndex);

    await expect(multisigWallet.connect(account1).confirmTransaction(txIndex))
      .to.emit(multisigWallet, "TransactionConfirmed")
      .withArgs(account1.address, txIndex);

    await expect(multisigWallet.connect(account2).confirmTransaction(txIndex))
      .to.emit(multisigWallet, "TransactionConfirmed")
      .withArgs(account2.address, txIndex);
  });

  it("Rejection of invalid confirmations", async function () {
    const { multisigWallet, account0, account1, nonOwner } = await loadFixture(
      deployMultisigFixture
    );
    const to = account1.address;
    const value = ethers.parseEther("0.5");
    const data = "0x";
    const txIndex = 0;

    await multisigWallet.connect(account0).submitTransaction(to, value, data);

    await expect(
      multisigWallet.connect(nonOwner).confirmTransaction(txIndex)
    ).to.be.revertedWith("Only owner can call this function");

    await expect(
      multisigWallet.connect(account0).confirmTransaction(1)
    ).to.be.revertedWith("The transaction is not exist");
  });

  it("Rejection of execution before the threshold", async function () {
    const { multisigWallet, account0, account1 } = await loadFixture(
      deployMultisigFixture
    );
    const to = account1.address;
    const value = ethers.parseEther("0.5");
    const data = "0x";
    const txIndex = 0;

    await multisigWallet.connect(account0).submitTransaction(to, value, data);

    await expect(
      multisigWallet.connect(account0).executeTransaction(txIndex)
    ).to.be.revertedWith("The transaction doesn't have enough confirmation");
  });

  it("Successful of execution after the threshold", async function () {
    const { multisigWallet, account0, account1, account2 } = await loadFixture(
      deployMultisigFixture
    );
    const to = account1.address;
    const value = ethers.parseEther("0.5");
    const data = "0x";
    const txIndex = 0;

    await account0.sendTransaction({
      to: await multisigWallet.getAddress(),
      value: ethers.parseEther("1.0"),
    });
    await multisigWallet.connect(account0).submitTransaction(to, value, data);

    await multisigWallet.connect(account0).confirmTransaction(txIndex);
    await multisigWallet.connect(account1).confirmTransaction(txIndex);
    await multisigWallet.connect(account2).confirmTransaction(txIndex);

    await expect(multisigWallet.connect(account0).executeTransaction(txIndex))
      .to.emit(multisigWallet, "TransactionExecuted")
      .withArgs(account0.address, txIndex);
  });

  it("Rejection of attempts to execute a transaction more than once.", async function () {
    const { multisigWallet, account0, account1, account2 } = await loadFixture(
      deployMultisigFixture
    );
    const to = account1.address;
    const value = ethers.parseEther("0.5");
    const data = "0x";
    const txIndex = 0;

    await account0.sendTransaction({
      to: await multisigWallet.getAddress(),
      value: ethers.parseEther("1.0"),
    });
    await multisigWallet.connect(account0).submitTransaction(to, value, data);

    await multisigWallet.connect(account0).confirmTransaction(txIndex);
    await multisigWallet.connect(account1).confirmTransaction(txIndex);
    await multisigWallet.connect(account2).confirmTransaction(txIndex);

    await multisigWallet.connect(account0).executeTransaction(txIndex);
    await expect(
      multisigWallet.connect(account0).executeTransaction(txIndex)
    ).to.be.revertedWith("The transaction is already executed");
  });

  it("Mock token deployed", async function(){
    const {myToken} = await loadFixture(deployMultisigFixture);
    const deployedAmount = ethers.parseUnits("1000", 18);
    assert.isOk(await myToken.getAddress());
    assert.equal(await myToken.name(), "Serene");
    assert.equal(await myToken.symbol(), "SER");
    assert.equal(await myToken.totalSupply(), deployedAmount);
  });

  it("Fund the multisig wallet", async function(){
    const {myToken, multisigWallet, account0} = await loadFixture(deployMultisigFixture);
    const amount = ethers.parseUnits("50", 18);
    await myToken.connect(account0).transfer(multisigWallet.getAddress(), amount);
    assert.equal(await myToken.balanceOf(multisigWallet.getAddress()), amount);
  });

  it("End-to-end test", async function(){
    const {myToken, multisigWallet, account0, account1, account2, nonOwner} = await loadFixture(deployMultisigFixture);
    const amount = ethers.parseUnits("100", 18);
    await myToken.connect(account0).transfer(multisigWallet.getAddress(), amount);
    const to = myToken.getAddress();
    const value = 0;
    const iERC20 = new ethers.Interface(["function transfer(address to, uint256 amount)"]);
    const data = iERC20.encodeFunctionData("transfer", [account2.address, amount]);
    const txIndex = 0;
    await multisigWallet.connect(account0).submitTransaction(to, value, data);

    await multisigWallet.connect(account0).confirmTransaction(txIndex);
    await multisigWallet.connect(account1).confirmTransaction(txIndex);
    await multisigWallet.connect(account2).confirmTransaction(txIndex);

    await expect(multisigWallet.connect(nonOwner).executeTransaction(txIndex))
    .to.be.revertedWith("Only owner can call this function");
    await multisigWallet.connect(account0).executeTransaction(txIndex);
    assert.equal(await myToken.balanceOf(account2.address), amount);
    assert.equal(await myToken.balanceOf(multisigWallet.getAddress()), 0n);
  });
});
