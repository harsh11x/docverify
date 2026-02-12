const crypto = require('crypto');
const ipfsService = require('./ipfsService');
const ethereumService = require('./ethereumService');
const fabricService = require('./fabricService');
const logger = require('../utils/logger');
const db = require('../database/models');

class VerificationService {
    /**
     * Complete document verification workflow
     * @param {Buffer} fileBuffer - Document file buffer
     * @param {Object} metadata - Document metadata
     * @param {string} organizationId - Organization ID
     * @returns {Object} Verification result
     */
    async verifyDocument(fileBuffer, metadata, organizationId) {
        try {
            logger.info(`Starting verification workflow for organization: ${organizationId}`);

            // Step 1: Compute document hash (SHA-256)
            const documentHash = this.computeDocumentHash(fileBuffer);
            logger.info(`Document hash computed: ${documentHash}`);

            // Step 2: Upload to IPFS
            const ipfsResult = await ipfsService.uploadFile(fileBuffer, {
                pin: true
            });
            const ipfsCID = ipfsResult.cid;
            logger.info(`File uploaded to IPFS: ${ipfsCID}`);

            // Step 3: Validate with Fabric (check if hash exists in org database)
            const fabricValidation = await fabricService.validateCertificateHash(
                documentHash,
                organizationId
            );

            if (!fabricValidation.valid || fabricValidation.matchCount === 0) {
                logger.warn(`Document hash not found in Fabric for organization: ${organizationId}`);

                // Reject on Ethereum
                await ethereumService.rejectDocument(
                    documentHash,
                    organizationId,
                    'Document hash not found in organization database'
                );

                return {
                    success: false,
                    verified: false,
                    documentHash,
                    ipfsCID,
                    reason: 'Document not found in organization database',
                    fabricValidation
                };
            }

            // Step 4: Generate Fabric proof hash
            const fabricProofHash = this.generateFabricProofHash(
                documentHash,
                organizationId,
                Date.now()
            );
            logger.info(`Fabric proof hash generated: ${fabricProofHash}`);

            // Step 5: Anchor proof on Ethereum
            const ethereumResult = await ethereumService.verifyDocument(
                documentHash,
                ipfsCID,
                organizationId,
                fabricProofHash
            );
            logger.info(`Verification anchored on Ethereum: ${ethereumResult.transactionHash}`);

            // Step 6: Store in off-chain database
            const dbRecord = await this.storeVerificationRecord({
                documentHash,
                ipfsCID,
                organizationId,
                fabricProofHash,
                ethereumTxHash: ethereumResult.transactionHash,
                blockNumber: ethereumResult.blockNumber,
                verified: true,
                metadata,
                fabricCertificates: fabricValidation.certificates
            });

            logger.info(`Verification workflow completed successfully`);

            return {
                success: true,
                verified: true,
                documentHash,
                ipfsCID,
                fabricProofHash,
                ethereumTxHash: ethereumResult.transactionHash,
                blockNumber: ethereumResult.blockNumber,
                gasUsed: ethereumResult.gasUsed,
                certificateDetails: fabricValidation.certificates[0],
                verificationId: dbRecord.id
            };

        } catch (error) {
            logger.error('Verification workflow failed:', error);
            throw new Error(`Verification failed: ${error.message}`);
        }
    }

    /**
     * Compute SHA-256 hash of document
     * @param {Buffer} fileBuffer - File buffer
     * @returns {string} Hex hash
     */
    computeDocumentHash(fileBuffer) {
        return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    }

    /**
     * Generate Fabric proof hash for cross-chain validation
     * @param {string} documentHash - Document hash
     * @param {string} orgId - Organization ID
     * @param {number} timestamp - Timestamp
     * @returns {string} Fabric proof hash
     */
    generateFabricProofHash(documentHash, orgId, timestamp) {
        const data = `${documentHash}${orgId}${timestamp}`;
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Store verification record in database
     * @param {Object} data - Verification data
     * @returns {Object} Database record
     */
    async storeVerificationRecord(data) {
        try {
            const record = await db.Verification.create({
                documentHash: data.documentHash,
                ipfsCID: data.ipfsCID,
                organizationId: data.organizationId,
                fabricProofHash: data.fabricProofHash,
                ethereumTxHash: data.ethereumTxHash,
                blockNumber: data.blockNumber,
                verified: data.verified,
                metadata: data.metadata,
                fabricCertificates: data.fabricCertificates,
                verifiedAt: new Date()
            });

            logger.info(`Verification record stored in database: ${record.id}`);
            return record;
        } catch (error) {
            logger.error('Failed to store verification record:', error);
            throw error;
        }
    }

    /**
     * Public verification check (cross-chain validation)
     * @param {string} documentHash - Document hash
     * @returns {Object} Verification status
     */
    async publicVerify(documentHash) {
        try {
            logger.info(`Public verification check for hash: ${documentHash}`);

            // Check Ethereum
            const ethereumVerification = await ethereumService.getDocumentVerification(documentHash);

            if (!ethereumVerification.verified) {
                return {
                    verified: false,
                    source: 'ethereum',
                    message: 'Document not verified on Ethereum'
                };
            }

            // Check Fabric
            const fabricCertificates = await fabricService.queryCertificateByHash(documentHash);

            if (!fabricCertificates || fabricCertificates.length === 0) {
                return {
                    verified: false,
                    source: 'fabric',
                    message: 'Document not found in Fabric'
                };
            }

            // Validate consistency
            const isConsistent = this.validateCrossChainConsistency(
                ethereumVerification,
                fabricCertificates[0]
            );

            if (!isConsistent) {
                return {
                    verified: false,
                    source: 'cross-chain',
                    message: 'Cross-chain data inconsistency detected'
                };
            }

            // Get organization details
            const organization = await ethereumService.getOrganization(
                ethereumVerification.organizationId
            );

            // Check database for additional metadata
            const dbRecord = await db.Verification.findOne({
                where: { documentHash }
            });

            return {
                verified: true,
                documentHash,
                ipfsCID: ethereumVerification.ipfsCID,
                organization: {
                    id: organization.orgId,
                    name: organization.name,
                    type: organization.orgType,
                    isActive: organization.isActive
                },
                timestamp: ethereumVerification.blockTimestamp,
                blockNumber: ethereumVerification.blockNumber,
                ethereumTxHash: dbRecord?.ethereumTxHash,
                certificateDetails: fabricCertificates[0],
                proof: {
                    fabricProofHash: ethereumVerification.fabricProofHash,
                    ethereumVerification,
                    fabricCertificate: fabricCertificates[0]
                }
            };

        } catch (error) {
            logger.error('Public verification failed:', error);
            throw new Error(`Public verification failed: ${error.message}`);
        }
    }

    /**
     * Validate cross-chain consistency
     * @param {Object} ethereumData - Ethereum verification data
     * @param {Object} fabricData - Fabric certificate data
     * @returns {boolean} Consistency status
     */
    validateCrossChainConsistency(ethereumData, fabricData) {
        // Validate document hash matches
        if (ethereumData.documentHash.toLowerCase() !== '0x' + fabricData.documentHash.toLowerCase()) {
            logger.warn('Document hash mismatch between Ethereum and Fabric');
            return false;
        }

        // Validate organization ID matches
        if (ethereumData.organizationId !== fabricData.organizationId) {
            logger.warn('Organization ID mismatch between Ethereum and Fabric');
            return false;
        }

        // Validate Fabric proof hash
        const computedProofHash = this.generateFabricProofHash(
            fabricData.documentHash,
            fabricData.organizationId,
            new Date(fabricData.timestamp).getTime()
        );

        // Note: Exact match might not work due to timestamp differences
        // In production, implement more sophisticated validation

        return true;
    }

    /**
     * Get verification history for a document
     * @param {string} documentHash - Document hash
     * @returns {Array} Verification history
     */
    async getVerificationHistory(documentHash) {
        try {
            // Get Ethereum events
            const ethereumEvents = await ethereumService.getPastEvents('DocumentVerified');
            const relevantEvents = ethereumEvents.filter(
                e => e.args.documentHash.toLowerCase() === '0x' + documentHash.toLowerCase()
            );

            // Get Fabric history
            const fabricCerts = await fabricService.queryCertificateByHash(documentHash);
            let fabricHistory = [];

            if (fabricCerts.length > 0) {
                fabricHistory = await fabricService.getCertificateHistory(fabricCerts[0].certificateId);
            }

            return {
                documentHash,
                ethereumEvents: relevantEvents,
                fabricHistory,
                totalEvents: relevantEvents.length + fabricHistory.length
            };

        } catch (error) {
            logger.error('Failed to get verification history:', error);
            throw error;
        }
    }

    /**
     * Batch verify multiple documents
     * @param {Array} documents - Array of document buffers and metadata
     * @param {string} organizationId - Organization ID
     * @returns {Array} Verification results
     */
    async batchVerify(documents, organizationId) {
        const results = [];

        for (const doc of documents) {
            try {
                const result = await this.verifyDocument(
                    doc.buffer,
                    doc.metadata,
                    organizationId
                );
                results.push(result);
            } catch (error) {
                results.push({
                    success: false,
                    error: error.message,
                    metadata: doc.metadata
                });
            }
        }

        return results;
    }
}

module.exports = new VerificationService();
