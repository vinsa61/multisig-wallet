import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ignition-ethers";
import "@typechain/hardhat";
import "hardhat-gas-reporter"

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28"
  },
  gasReporter: {
    enabled: true,
  },
  networks: {
    localnet: {
      url: "http://127.0.0.1:8545/",
    },
  },
  defaultNetwork: "localnet",
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
