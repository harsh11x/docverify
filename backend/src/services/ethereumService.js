const { ethers } = require('ethers');
const logger = require('../utils/logger');
const DocumentVerificationABI = require('../../contracts/ethereum/artifacts/contracts/ethereum/DocumentVerification.sol/DocumentVerification.json');

class EthereumService {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.contract = null;
        this.isInitialized = false;
    }

    /**
     * Initialize Ethereum service
     */
    async initialize() {
        try {
            // Initialize provider
            const rpcUrl = process.env.ETHEREUM_RPC_URL;
            if (!rpcUrl) {
                throw new Error('ETHEREUM_RPC_URL not configured');
            }

            this.provider = new ethers.JsonRpcProvider(rpcUrl);

            // Initialize wallet
            const privateKey = process.env.ETHEREUM_PRIVATE_KEY;
            if (!privateKey) {
                throw new Error('ETHEREUM_PRIVATE_KEY not configured');
            }

            this.wallet = new ethers.Wallet(privateKey, this.provider);

            // Initialize contract
            const contractAddress = process.env.ETHEREUM_CONTRACT_ADDRESS;
            if (!contractAddress) {
                throw new Error('ETHEREUM_CONTRACT_ADDRESS not configured');
            }

            this.contract = new ethers.Contract(
                contractAddress,
                DocumentVerificationABI.abi,
                this.wallet
            );

            // Test connection
            const network = await this.provider.getNetwork();
            const balance = await this.provider.getBalance(this.wallet.address);

            this.isInitialized = true;

            logger.info(`Ethereum service initialized`);
            logger.info(`Network: ${network.name} (Chain ID: ${network.chainId})`);
            logger.info(`Wallet: ${this.wallet.address}`);
            logger.info(`Balance: ${ethers.formatEther(balance)} ETH`);

            return true;
        } catch (error) {
            logger.error('Failed to initialize Ethereum service:', error);
            this.isInitialized = false;
            throw error;
        }
    }

    /**
     * Register organization on blockchain
     * @param {string} orgId - Organization ID
     * @param {number} orgType - Organization type enum
     * @param {string} walletAddress - Organization wallet address
     * @param {string} name - Organization name
     * @param {string} metadata - IPFS CID for metadata
     * @returns {Object} Transaction receipt
     */
    async registerOrganization(orgId, orgType, walletAddress, name, metadata) {
        try {
            if (!this.isInitialized) await this.initialize();

            logger.info(`Registering organization: ${orgId}`);

            const tx = await this.contract.registerOrganization(
                orgId,
                orgType,
                walletAddress,
                name,
                metadata,
                {
                    gasLimit: process.env.GAS_LIMIT || 3000000
                }
            );

            const receipt = await tx.wait();

            logger.info(`Organization registered. TX: ${receipt.hash}`);

            return {
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                status: receipt.status
            };
        } catch (error) {
            logger.error('Failed to register organization:', error);
            throw new Error(`Organization registration failed: ${error.message}`);
        }
    }

    /**
     * Verify document on blockchain
     * @param {string} documentHash - Document hash (bytes32)
     * @param {string} ipfsCID - IPFS content identifier
     * @param {string} organizationId - Organization ID
     * @param {string} fabricProofHash - Fabric proof hash (bytes32)
     * @returns {Object} Transaction receipt with event data
     */
    async verifyDocument(documentHash, ipfsCID, organizationId, fabricProofHash) {
        try {
            if (!this.isInitialized) await this.initialize();

            logger.info(`Verifying document: ${documentHash}`);

            // Convert hash to bytes32 if needed
            const hashBytes32 = documentHash.startsWith('0x')
                ? documentHash
                : '0x' + documentHash;

            const fabricProofBytes32 = fabricProofHash.startsWith('0x')
                ? fabricProofHash
                : '0x' + fabricProofHash;

            const tx = await this.contract.verifyDocument(
                hashBytes32,
                ipfsCID,
                organizationId,
                fabricProofBytes32,
                {
                    gasLimit: process.env.GAS_LIMIT || 3000000
                }
            );

            const receipt = await tx.wait();

            // Parse events
            const events = receipt.logs
                .map(log => {
                    try {
                        return this.contract.interface.parseLog(log);
                    } catch {
                        return null;
                    }
                })
                .filter(event => event !== null);

            logger.info(`Document verified. TX: ${receipt.hash}`);

            return {
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                status: receipt.status,
                events: events.map(e => ({
                    name: e.name,
                    args: Object.fromEntries(
                        Object.entries(e.args).filter(([key]) => isNaN(key))
                    )
                }))
            };
        } catch (error) {
            logger.error('Failed to verify document:', error);
            throw new Error(`Document verification failed: ${error.message}`);
        }
    }

    /**
     * Reject document verification
     * @param {string} documentHash - Document hash
     * @param {string} organizationId - Organization ID
     * @param {string} reason - Rejection reason
     * @returns {Object} Transaction receipt
     */
    async rejectDocument(documentHash, organizationId, reason) {
        try {
            if (!this.isInitialized) await this.initialize();

            const hashBytes32 = documentHash.startsWith('0x')
                ? documentHash
                : '0x' + documentHash;

            const tx = await this.contract.rejectDocument(
                hashBytes32,
                organizationId,
                reason,
                {
                    gasLimit: process.env.GAS_LIMIT || 3000000
                }
            );

            const receipt = await tx.wait();

            logger.info(`Document rejected. TX: ${receipt.hash}`);

            return {
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                status: receipt.status
            };
        } catch (error) {
            logger.error('Failed to reject document:', error);
            throw error;
        }
    }

    /**
     * Get document verification details
     * @param {string} documentHash - Document hash
     * @returns {Object} Verification details
     */
    async getDocumentVerification(documentHash) {
        try {
            if (!this.isInitialized) await this.initialize();

            const hashBytes32 = documentHash.startsWith('0x')
                ? documentHash
                : '0x' + documentHash;

            const verification = await this.contract.getDocumentVerification(hashBytes32);

            return {
                documentHash: verification.documentHash,
                ipfsCID: verification.ipfsCID,
                organizationId: verification.organizationId,
                verified: verification.verified,
                blockTimestamp: Number(verification.blockTimestamp),
                fabricProofHash: verification.fabricProofHash,
                blockNumber: Number(verification.blockNumber)
            };
        } catch (error) {
            logger.error('Failed to get document verification:', error);
            throw error;
        }
    }

    /**
     * Check if document is verified
     * @param {string} documentHash - Document hash
     * @returns {boolean} Verification status
     */
    async isDocumentVerified(documentHash) {
        try {
            if (!this.isInitialized) await this.initialize();

            const hashBytes32 = documentHash.startsWith('0x')
                ? documentHash
                : '0x' + documentHash;

            return await this.contract.isDocumentVerified(hashBytes32);
        } catch (error) {
            logger.error('Failed to check document verification:', error);
            return false;
        }
    }

    /**
     * Get organization details
     * @param {string} orgId - Organization ID
     * @returns {Object} Organization details
     */
    async getOrganization(orgId) {
        try {
            if (!this.isInitialized) await this.initialize();

            const org = await this.contract.getOrganization(orgId);

            return {
                orgId: org.orgId,
                orgType: Number(org.orgType),
                walletAddress: org.walletAddress,
                registrationTimestamp: Number(org.registrationTimestamp),
                isActive: org.isActive,
                name: org.name,
                metadata: org.metadata
            };
        } catch (error) {
            logger.error('Failed to get organization:', error);
            throw error;
        }
    }

    /**
     * Deactivate organization
     * @param {string} orgId - Organization ID
     * @returns {Object} Transaction receipt
     */
    async deactivateOrganization(orgId) {
        try {
            if (!this.isInitialized) await this.initialize();

            const tx = await this.contract.deactivateOrganization(orgId, {
                gasLimit: process.env.GAS_LIMIT || 3000000
            });

            const receipt = await tx.wait();

            logger.info(`Organization deactivated. TX: ${receipt.hash}`);

            return {
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                status: receipt.status
            };
        } catch (error) {
            logger.error('Failed to deactivate organization:', error);
            throw error;
        }
    }

    /**
     * Listen to contract events
     * @param {string} eventName - Event name to listen for
     * @param {Function} callback - Callback function
     */
    listenToEvent(eventName, callback) {
        if (!this.isInitialized) {
            throw new Error('Ethereum service not initialized');
        }

        this.contract.on(eventName, (...args) => {
            const event = args[args.length - 1];
            callback({
                eventName,
                args: args.slice(0, -1),
                transactionHash: event.log.transactionHash,
                blockNumber: event.log.blockNumber
            });
        });

        logger.info(`Listening to event: ${eventName}`);
    }

    /**
     * Get past events
     * @param {string} eventName - Event name
     * @param {number} fromBlock - Starting block
     * @param {number} toBlock - Ending block
     * @returns {Array} Array of events
     */
    async getPastEvents(eventName, fromBlock = 0, toBlock = 'latest') {
        try {
            if (!this.isInitialized) await this.initialize();

            const filter = this.contract.filters[eventName]();
            const events = await this.contract.queryFilter(filter, fromBlock, toBlock);

            return events.map(event => ({
                eventName: event.eventName,
                args: Object.fromEntries(
                    Object.entries(event.args).filter(([key]) => isNaN(key))
                ),
                transactionHash: event.transactionHash,
                blockNumber: event.blockNumber
            }));
        } catch (error) {
            logger.error('Failed to get past events:', error);
            throw error;
        }
    }

    /**
     * Estimate gas for transaction
     * @param {string} method - Contract method name
     * @param {Array} params - Method parameters
     * @returns {string} Estimated gas
     */
    async estimateGas(method, params) {
        try {
            if (!this.isInitialized) await this.initialize();

            const gasEstimate = await this.contract[method].estimateGas(...params);
            return gasEstimate.toString();
        } catch (error) {
            logger.error('Failed to estimate gas:', error);
            throw error;
        }
    }

    /**
     * Get current gas price
     * @returns {string} Gas price in wei
     */
    async getGasPrice() {
        try {
            if (!this.isInitialized) await this.initialize();

            const feeData = await this.provider.getFeeData();
            return feeData.gasPrice.toString();
        } catch (error) {
            logger.error('Failed to get gas price:', error);
            throw error;
        }
    }

    /**
     * Get wallet balance
     * @returns {string} Balance in ETH
     */
    async getBalance() {
        try {
            if (!this.isInitialized) await this.initialize();

            const balance = await this.provider.getBalance(this.wallet.address);
            return ethers.formatEther(balance);
        } catch (error) {
            logger.error('Failed to get balance:', error);
            throw error;
        }
    }
}

module.exports = new EthereumService();
