const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class FabricService {
    constructor() {
        this.gateway = null;
        this.wallet = null;
        this.isInitialized = false;
        this.connectionProfile = null;
    }

    /**
     * Initialize Fabric service
     */
    async initialize() {
        try {
            // Load connection profile
            const ccpPath = process.env.FABRIC_CONNECTION_PROFILE ||
                path.resolve(__dirname, '../../contracts/fabric/config/connection-profile.json');

            const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
            this.connectionProfile = JSON.parse(ccpJSON);

            // Create wallet
            const walletPath = process.env.FABRIC_WALLET_PATH ||
                path.join(__dirname, '../../contracts/fabric/wallet');

            this.wallet = await Wallets.newFileSystemWallet(walletPath);

            // Check if user identity exists
            const userName = process.env.FABRIC_USER_NAME || 'admin';
            const identity = await this.wallet.get(userName);

            if (!identity) {
                logger.warn(`Identity ${userName} not found in wallet. Enrolling...`);
                await this.enrollUser(userName);
            }

            // Create gateway
            this.gateway = new Gateway();

            await this.gateway.connect(this.connectionProfile, {
                wallet: this.wallet,
                identity: userName,
                discovery: { enabled: true, asLocalhost: true }
            });

            this.isInitialized = true;
            logger.info('Fabric service initialized successfully');

            return true;
        } catch (error) {
            logger.error('Failed to initialize Fabric service:', error);
            this.isInitialized = false;
            throw error;
        }
    }

    /**
     * Enroll user with Fabric CA
     * @param {string} userName - User name
     */
    async enrollUser(userName) {
        try {
            const caInfo = this.connectionProfile.certificateAuthorities['ca.org1.example.com'];
            const caTLSCACerts = fs.readFileSync(caInfo.tlsCACerts.path, 'utf8');
            const ca = new FabricCAServices(
                caInfo.url,
                { trustedRoots: caTLSCACerts, verify: false },
                caInfo.caName
            );

            const enrollment = await ca.enroll({
                enrollmentID: 'admin',
                enrollmentSecret: 'adminpw'
            });

            const x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: process.env.FABRIC_MSP_ID || 'Org1MSP',
                type: 'X.509',
            };

            await this.wallet.put(userName, x509Identity);
            logger.info(`User ${userName} enrolled successfully`);
        } catch (error) {
            logger.error('Failed to enroll user:', error);
            throw error;
        }
    }

    /**
     * Get network and contract
     * @returns {Object} Network and contract instances
     */
    async getContract() {
        try {
            if (!this.isInitialized) await this.initialize();

            const channelName = process.env.FABRIC_CHANNEL_NAME || 'verification-channel';
            const chaincodeName = process.env.FABRIC_CHAINCODE_NAME || 'certificate-chaincode';

            const network = await this.gateway.getNetwork(channelName);
            const contract = network.getContract(chaincodeName);

            return { network, contract };
        } catch (error) {
            logger.error('Failed to get contract:', error);
            throw error;
        }
    }

    /**
     * Issue certificate on Fabric
     * @param {Object} certificateData - Certificate data
     * @returns {Object} Transaction result
     */
    async issueCertificate(certificateData) {
        try {
            const { contract } = await this.getContract();

            logger.info(`Issuing certificate: ${certificateData.certificateId}`);

            const result = await contract.submitTransaction(
                'issueCertificate',
                certificateData.certificateId,
                certificateData.organizationId,
                certificateData.documentHash,
                certificateData.holderName,
                certificateData.issueDate,
                JSON.stringify(certificateData.metadata || {})
            );

            const certificate = JSON.parse(result.toString());
            logger.info(`Certificate issued successfully: ${certificateData.certificateId}`);

            return certificate;
        } catch (error) {
            logger.error('Failed to issue certificate:', error);
            throw new Error(`Certificate issuance failed: ${error.message}`);
        }
    }

    /**
     * Validate certificate hash
     * @param {string} documentHash - Document hash
     * @param {string} organizationId - Organization ID (optional)
     * @returns {Object} Validation result
     */
    async validateCertificateHash(documentHash, organizationId = '') {
        try {
            const { contract } = await this.getContract();

            logger.info(`Validating certificate hash: ${documentHash}`);

            const result = await contract.evaluateTransaction(
                'validateCertificateHash',
                documentHash,
                organizationId
            );

            const validation = JSON.parse(result.toString());
            logger.info(`Hash validation result: ${validation.valid ? 'VALID' : 'INVALID'}`);

            return validation;
        } catch (error) {
            logger.error('Failed to validate certificate hash:', error);
            throw new Error(`Hash validation failed: ${error.message}`);
        }
    }

    /**
     * Query certificate by hash
     * @param {string} documentHash - Document hash
     * @returns {Array} Matching certificates
     */
    async queryCertificateByHash(documentHash) {
        try {
            const { contract } = await this.getContract();

            const result = await contract.evaluateTransaction(
                'queryCertificateByHash',
                documentHash
            );

            return JSON.parse(result.toString());
        } catch (error) {
            logger.error('Failed to query certificate by hash:', error);
            throw error;
        }
    }

    /**
     * Get certificate by ID
     * @param {string} certificateId - Certificate ID
     * @returns {Object} Certificate details
     */
    async getCertificate(certificateId) {
        try {
            const { contract } = await this.getContract();

            const result = await contract.evaluateTransaction(
                'getCertificate',
                certificateId
            );

            return JSON.parse(result.toString());
        } catch (error) {
            logger.error('Failed to get certificate:', error);
            throw error;
        }
    }

    /**
     * Get certificate history
     * @param {string} certificateId - Certificate ID
     * @returns {Array} Certificate history
     */
    async getCertificateHistory(certificateId) {
        try {
            const { contract } = await this.getContract();

            const result = await contract.evaluateTransaction(
                'getCertificateHistory',
                certificateId
            );

            return JSON.parse(result.toString());
        } catch (error) {
            logger.error('Failed to get certificate history:', error);
            throw error;
        }
    }

    /**
     * Update certificate status
     * @param {string} certificateId - Certificate ID
     * @param {string} status - New status
     * @param {string} reason - Reason for update
     * @returns {Object} Updated certificate
     */
    async updateCertificateStatus(certificateId, status, reason) {
        try {
            const { contract } = await this.getContract();

            logger.info(`Updating certificate status: ${certificateId} -> ${status}`);

            const result = await contract.submitTransaction(
                'updateCertificateStatus',
                certificateId,
                status,
                reason
            );

            return JSON.parse(result.toString());
        } catch (error) {
            logger.error('Failed to update certificate status:', error);
            throw error;
        }
    }

    /**
     * Query certificates by organization
     * @param {string} organizationId - Organization ID
     * @returns {Array} Organization certificates
     */
    async queryCertificatesByOrganization(organizationId) {
        try {
            const { contract } = await this.getContract();

            const result = await contract.evaluateTransaction(
                'queryCertificatesByOrganization',
                organizationId
            );

            return JSON.parse(result.toString());
        } catch (error) {
            logger.error('Failed to query certificates by organization:', error);
            throw error;
        }
    }

    /**
     * Listen to chaincode events
     * @param {Function} callback - Event callback
     */
    async listenToEvents(callback) {
        try {
            const { network } = await this.getContract();

            const listener = async (event) => {
                if (event.eventName) {
                    logger.info(`Received chaincode event: ${event.eventName}`);

                    const payload = event.payload ? JSON.parse(event.payload.toString()) : {};

                    callback({
                        eventName: event.eventName,
                        payload,
                        transactionId: event.transactionId,
                        blockNumber: event.blockNumber
                    });
                }
            };

            await network.addBlockListener(listener);
            logger.info('Fabric event listener started');

            return listener;
        } catch (error) {
            logger.error('Failed to start event listener:', error);
            throw error;
        }
    }

    /**
     * Disconnect from gateway
     */
    async disconnect() {
        try {
            if (this.gateway) {
                await this.gateway.disconnect();
                this.isInitialized = false;
                logger.info('Fabric gateway disconnected');
            }
        } catch (error) {
            logger.error('Failed to disconnect gateway:', error);
            throw error;
        }
    }

    /**
     * Check connection status
     * @returns {boolean} Connection status
     */
    isConnected() {
        return this.isInitialized && this.gateway !== null;
    }
}

module.exports = new FabricService();
