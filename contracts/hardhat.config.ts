import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "london", // Use older EVM version for compatibility
        },
      },
      {
        version: "0.8.20", // Fallback version for compatibility
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "london",
        },
      },
    ],
  },
  networks: {
    // Lisk Sepolia Testnet
    liskSepolia: {
      url: "https://rpc.sepolia-api.lisk.com",
      chainId: 4202,
      accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : [],
      gasPrice: "auto",
      gas: "auto",
    },
    "lisk-sepolia": {
      url: "https://rpc.sepolia-api.lisk.com",
      chainId: 4202,
      accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : [],
      gasPrice: "auto",
      gas: "auto",
    },

    // Saga DevPros Chainlet
    sagaChainlet: {
      url: "https://devpros-2749656616387000-1.jsonrpc.sagarpc.io",
      chainId: 2749656616387000,
      accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : [],
      gasPrice: "auto",
      gas: "auto",
      timeout: 60000,
    },
    "saga-devpros": {
      url: "https://devpros-2749656616387000-1.jsonrpc.sagarpc.io",
      chainId: 2749656616387000,
      accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : [],
      gasPrice: "auto",
      gas: "auto",
      timeout: 60000,
    },

    // BNB Smart Chain Testnet
    bscTestnet: {
      url: "https://bsc-testnet-rpc.publicnode.com",
      chainId: 97,
      accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : [],
      gasPrice: 10000000000, // 10 gwei
      gas: "auto",
    },
    "bsc-testnet": {
      url: "https://bsc-testnet-rpc.publicnode.com",
      chainId: 97,
      accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : [],
      gasPrice: 10000000000, // 10 gwei
      gas: "auto",
    },
  },
  etherscan: {
    apiKey: {
      liskSepolia: "abc", // Lisk Sepolia doesn't require API key
      sagaChainlet: "abc", // Saga Chainlet doesn't require API key
      bscTestnet: process.env.BSCSCAN_API_KEY || "abc", // BNB Smart Chain API key
    },
    customChains: [
      {
        network: "liskSepolia",
        chainId: 4202,
        urls: {
          apiURL: "https://sepolia-blockscout.lisk.com/api",
          browserURL: "https://sepolia-blockscout.lisk.com",
        },
      },
      {
        network: "sagaChainlet",
        chainId: 2749656616387000,
        urls: {
          apiURL: "https://devpros-2749656616387000-1.sagaexplorer.io/api",
          browserURL: "https://devpros-2749656616387000-1.sagaexplorer.io",
        },
      },
      {
        network: "bscTestnet",
        chainId: 97,
        urls: {
          apiURL: "https://api-testnet.bscscan.com/api",
          browserURL: "https://testnet.bscscan.com",
        },
      },
    ],
  },
};

export default config;
