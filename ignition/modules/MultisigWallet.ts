// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MultisigWalletModule", (m) => {
  const multisigWallet = m.contract("MultisigWallet", [[111, 112, 113], 2]);

  return { multisigWallet };
});
