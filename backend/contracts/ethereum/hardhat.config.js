require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        hardhat: {
            chainId: 1337,
        },
        localhost: {
            url: "http://127.0.0.1:8545",
        },
        sepolia: {
            url: process.env.ETHEREUM_RPC_URL || "",
            accounts: process.env.ETHEREUM_PRIVATE_KEY ? [process.env.ETHEREUM_PRIVATE_KEY] : [],
            chainId: 11155111,
        },
        goerli: {
            url: process.env.ETHEREUM_RPC_URL || "",
            accounts: process.env.ETHEREUM_PRIVATE_KEY ? [process.env.ETHEREUM_PRIVATE_KEY] : [],
            chainId: 5,
        },
        mainnet: {
            url: process.env.ETHEREUM_RPC_URL || "",
            accounts: process.env.ETHEREUM_PRIVATE_KEY ? [process.env.ETHEREUM_PRIVATE_KEY] : [],
            chainId: 1,
        },
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY,
    },
    gasReporter: {
        enabled: process.env.REPORT_GAS === "true",
        currency: "USD",
        coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    },
    paths: {
        sources: "./contracts/ethereum",
        tests: "./tests/unit/contracts",
        cache: "./cache",
        artifacts: "./artifacts",
    },
};
