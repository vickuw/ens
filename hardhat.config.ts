import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import '@openzeppelin/hardhat-upgrades';
require("dotenv").config();

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  networks: {
    hardhat: { allowUnlimitedContractSize: false },
    goerli: {
      chainId: 5,
      url: process.env.ALCHEMY_API,
      accounts: [
        process.env.DEPLOYER as string,
        process.env.MULTISIGWALLETOWNER1 as string,
        process.env.MULTISIGWALLETOWNER2 as string,
        process.env.MULTISIGWALLETOWNER3 as string,
        process.env.ACCEPTER as string,
      ],
      gas: 10000000,
      //   allowUnlimitedContractSize: true,
    },
    mumbai: {
      chainId: 80001,
      url: process.env.MUMBAI_API,
      accounts: [
        process.env.DEPLOYER as string,
        process.env.MULTISIGWALLETOWNER1 as string,
        process.env.MULTISIGWALLETOWNER2 as string,
        process.env.MULTISIGWALLETOWNER3 as string,
        process.env.ACCEPTER as string,
      ],
      gas: 1000000,
      //   allowUnlimitedContractSize: true,
    },
    polygon: {
      chainId: 137,
      url: process.env.ALCHEMY_API,
      accounts: [
        process.env.DEPLOYER as string,
        process.env.MULTISIGWALLETOWNER1 as string,
        process.env.MULTISIGWALLETOWNER2 as string,
        process.env.MULTISIGWALLETOWNER3 as string,
        process.env.ACCEPTER as string,
      ],
      gas: 10000000,
    },
  },
  etherscan: {
    apiKey: {
      polygonMumbai: process.env.ETHERSCAN_API_KEY as string,
      polygon: process.env.ETHERSCAN_API_KEY as string
    }
  }
};

export default config;
