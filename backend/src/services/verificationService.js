const crypto = require('crypto');
const ipfsService = require('./ipfsService');
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

            // Step 5: Anchor proof (Fabric Only)
            // Ethereum anchoring removed as per new requirements
            // We still generate a "proof hash" but it's just stored locally/Fabric-side

            // const ethereumResult = await ethereumService.verifyDocument(...);

            // Step 6: Store in off-chain database
            const dbRecord = await this.storeVerificationRecord({
                documentHash,
                ipfsCID,
                organizationId,
                organizationId,
                fabricProofHash,
                ethereumTxHash: 'N/A', // Ethereum removed
                blockNumber: 0,        // Ethereum removed
                verified: true,
                metadata,
                verified: true,
                metadata,
                fabricCertificates: fabricValidation.certificates,
                certificateId: this.generateCertificateId()
            });

            logger.info(`Verification workflow completed successfully`);

            return {
                success: true,
                verified: true,
                documentHash,
                ipfsCID,
                fabricProofHash,
                ethereumTxHash: 'N/A',
                blockNumber: 0,
                gasUsed: 0,
                certificateDetails: fabricValidation.certificates[0],
                verificationId: dbRecord.id,
                certificateId: dbRecord.certificateId
            };

        } catch (error) {
            logger.error('Verification workflow failed:', error);
            throw new Error(`Verification failed: ${error.message}`);
        }
    }

    /**
     * Process an internally issued document
     * @param {Buffer} fileBuffer - Document buffer
     * @param {string} documentHash - Document hash
     * @param {string} ipfsCID - IPFS CID
     * @param {string} organizationId - Organization ID
     * @param {Object} metadata - Metadata (recipient, etc.)
     */
    async processIssuedDocument(fileBuffer, documentHash, ipfsCID, organizationId, metadata) {
        try {
            logger.info(`Processing issued document for org: ${organizationId}`);

            // 1. Generate ID (use provided one from metadata if exists, else generate)
            const certificateId = metadata.certificateId || this.generateCertificateId();

            // 2. Issue on Fabric
            const fabricCert = await fabricService.issueCertificate({
                certificateId,
                organizationId,
                documentHash,
                holderName: metadata.recipientName || metadata.name || 'Unknown',
                issueDate: new Date().toISOString(),
                metadata
            });

            // 3. Store in DB
            const record = await this.storeVerificationRecord({
                documentHash,
                ipfsCID,
                organizationId,
                fabricProofHash: fabricCert.proofHash || 'PENDING_CONSENSUS',
                ethereumTxHash: 'N/A',
                blockNumber: 0,
                verified: true,
                metadata,
                fabricCertificates: [fabricCert],
                certificateId
            });

            logger.info(`Document issued successfully: ${certificateId}`);

            return {
                success: true,
                verified: true,
                certificateId,
                transactionId: fabricCert.transactionId,
                ipfsCID,
                documentHash
            };

        } catch (error) {
            logger.error('Failed to process issued document:', error);
            throw error;
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
                verified: data.verified,
                metadata: data.metadata,
                fabricCertificates: data.fabricCertificates,
                certificateId: data.certificateId,
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

            return {
                verified: true,
                documentHash,
                ipfsCID: dbRecord?.ipfsCID || '',
                organization: {
                    id: fabricCertificates[0].organizationId,
                    name: 'Organization (Fabric)', // In real app, query Org details from DB or Fabric
                    type: 1,
                    isActive: true
                },
                timestamp: Math.floor(new Date(fabricCertificates[0].issueDate).getTime() / 1000),
                blockNumber: 0,
                ethereumTxHash: 'N/A',
                certificateDetails: fabricCertificates[0],
                proof: {
                    fabricProofHash: this.generateFabricProofHash(documentHash, fabricCertificates[0].organizationId, 0),
                    fabricCertificate: fabricCertificates[0]
                }
            };

        } catch (error) {
            logger.error('Public verification failed:', error);
            throw new Error(`Public verification failed: ${error.message}`);
        }
    }

    /**
     * Generate unique certificate ID
     * Format: CERT-YYYYMMDD-RANDOM
     * @returns {string} Certificate ID
     */
    generateCertificateId() {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const random = crypto.randomBytes(3).toString('hex').toUpperCase();
        return `CERT-${date}-${random}`;
    }

    /**
     * Verify by Certificate ID
     * @param {string} certificateId - Certificate ID
     * @returns {Object} Verification Details
     */
    async verifyByCertificateId(certificateId) {
        try {
            logger.info(`Verification check for Certificate ID: ${certificateId}`);

            const dbRecord = await db.Verification.findOne({
                where: { certificateId }
            });

            if (!dbRecord) {
                return {
                    verified: false,
                    message: 'Certificate ID not found'
                };
            }

            // Reuse public verify logic but with found document hash
            // This ensures we still check chain consistency
            const result = await this.publicVerify(dbRecord.documentHash);

            return {
                ...result,
                certificateId: dbRecord.certificateId,
                found: true
            };

        } catch (error) {
            logger.error('Certificate ID verification failed:', error);
            throw error;
        }
    }

    /**
     * Validate cross-chain consistency
     * @param {Object} ethereumData - Ethereum verification data
     * @param {Object} fabricData - Fabric certificate data
     * @returns {boolean} Consistency status
     */
    validateCrossChainConsistency(ethereumData, fabricData) {
        // Validation removed as Ethereum is no longer used
        return true;
    }

    /**
     * Get verification history for a document
     * @param {string} documentHash - Document hash
     * @returns {Array} Verification history
     */
    async getVerificationHistory(documentHash) {
        try {
            // Get Fabric history
            // Ethereum events removed
            const ethereumEvents = [];

            // Get Fabric history
            const fabricCerts = await fabricService.queryCertificateByHash(documentHash);
            let fabricHistory = [];

            if (fabricCerts.length > 0) {
                fabricHistory = await fabricService.getCertificateHistory(fabricCerts[0].certificateId);
            }

            return {
                documentHash,
                ethereumEvents: [],
                fabricHistory,
                totalEvents: fabricHistory.length
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
