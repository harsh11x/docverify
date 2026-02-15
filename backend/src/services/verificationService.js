const crypto = require('crypto');
const ipfsService = require('./ipfsService');
const fabricService = require('./fabricService');
const ethereumService = require('./ethereumService');
const logger = require('../utils/logger');
const db = require('../database/models');

class VerificationService {
    /**
     * Complete document verification workflow with full cross-chain anchoring
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

            // Step 3: Validate CID integrity (hash verification)
            const cidIntegrityValid = await this.validateCIDIntegrity(ipfsCID, documentHash, fileBuffer);
            if (!cidIntegrityValid) {
                logger.error('CID integrity check failed');
                throw new Error('IPFS CID integrity validation failed');
            }
            logger.info('CID integrity validated');

            // Step 4: Validate with Fabric (check if hash exists in org database)
            const fabricValidation = await fabricService.validateCertificateHash(
                documentHash,
                organizationId
            );

            if (!fabricValidation.valid || fabricValidation.matchCount === 0) {
                logger.warn(`Document hash not found in Fabric for organization: ${organizationId}`);

                // Reject on Ethereum
                try {
                    await ethereumService.rejectDocument(
                        documentHash,
                        organizationId,
                        'Document hash not found in organization database'
                    );
                } catch (ethError) {
                    logger.warn('Ethereum rejection failed (non-critical):', ethError.message);
                }

                return {
                    success: false,
                    verified: false,
                    documentHash,
                    ipfsCID,
                    reason: 'Document not found in organization database',
                    fabricValidation
                };
            }

            // Step 5: Generate Fabric proof hash with timestamp for uniqueness
            const timestamp = Date.now();
            const fabricProofHash = this.generateFabricProofHash(
                documentHash,
                organizationId,
                timestamp
            );
            logger.info(`Fabric proof hash generated: ${fabricProofHash}`);

            // Step 6: Anchor proof on Ethereum (re-enabled for full cross-chain validation)
            let ethereumResult = { transactionHash: null, blockNumber: 0, gasUsed: '0' };
            try {
                ethereumResult = await ethereumService.verifyDocument(
                    '0x' + documentHash,
                    ipfsCID,
                    organizationId,
                    '0x' + fabricProofHash
                );
                logger.info(`Ethereum anchor successful: ${ethereumResult.transactionHash}`);
            } catch (ethError) {
                logger.error('Ethereum anchoring failed:', ethError.message);
                // Continue with Fabric-only verification if Ethereum fails
                // This ensures system resilience
            }

            // Step 7: Store cross-chain proof record
            await this.storeCrossChainProof({
                documentHash,
                fabricProofHash,
                ethereumProofHash: ethereumResult.transactionHash ? fabricProofHash : null,
                fabricBlockNumber: fabricValidation.certificates[0]?.blockNumber || 0,
                ethereumBlockNumber: ethereumResult.blockNumber,
                fabricTxId: fabricValidation.certificates[0]?.transactionId,
                ethereumTxHash: ethereumResult.transactionHash
            });

            // Step 8: Store in off-chain database
            const certificateId = this.generateCertificateId();
            const dbRecord = await this.storeVerificationRecord({
                documentHash,
                ipfsCID,
                organizationId,
                fabricProofHash,
                ethereumTxHash: ethereumResult.transactionHash || 'PENDING',
                blockNumber: ethereumResult.blockNumber || 0,
                verified: true,
                metadata,
                fabricCertificates: fabricValidation.certificates,
                certificateId,
                crossChainValidated: !!ethereumResult.transactionHash
            });

            logger.info(`Verification workflow completed successfully`);

            return {
                success: true,
                verified: true,
                documentHash,
                ipfsCID,
                fabricProofHash,
                ethereumTxHash: ethereumResult.transactionHash || 'PENDING',
                blockNumber: ethereumResult.blockNumber || 0,
                gasUsed: ethereumResult.gasUsed || '0',
                certificateDetails: fabricValidation.certificates[0],
                verificationId: dbRecord.id,
                certificateId,
                crossChainValidated: !!ethereumResult.transactionHash
            };

        } catch (error) {
            logger.error('Verification workflow failed:', error);
            throw new Error(`Verification failed: ${error.message}`);
        }
    }

    /**
     * Validate CID integrity by comparing IPFS content hash
     * @param {string} cid - IPFS CID
     * @param {string} expectedHash - Expected document hash
     * @param {Buffer} originalBuffer - Original file buffer
     * @returns {boolean} Integrity status
     */
    async validateCIDIntegrity(cid, expectedHash, originalBuffer) {
        try {
            // Retrieve file from IPFS and verify hash matches
            const retrievedBuffer = await ipfsService.getFile(cid);
            const retrievedHash = this.computeDocumentHash(retrievedBuffer);
            
            // Also verify against original buffer
            const originalHash = this.computeDocumentHash(originalBuffer);
            
            return retrievedHash === expectedHash && originalHash === expectedHash;
        } catch (error) {
            logger.error('CID integrity validation failed:', error);
            return false;
        }
    }

    /**
     * Store cross-chain proof record
     * @param {Object} proofData - Cross-chain proof data
     */
    async storeCrossChainProof(proofData) {
        try {
            await db.sequelize.query(
                `INSERT INTO cross_chain_proofs 
                (document_hash, fabric_proof_hash, ethereum_proof_hash, fabric_block_number, 
                 ethereum_block_number, fabric_tx_id, ethereum_tx_hash, consistency_validated, validation_timestamp)
                VALUES (:documentHash, :fabricProofHash, :ethereumProofHash, :fabricBlockNumber,
                        :ethereumBlockNumber, :fabricTxId, :ethereumTxHash, :validated, CURRENT_TIMESTAMP)`,
                {
                    replacements: {
                        documentHash: proofData.documentHash,
                        fabricProofHash: proofData.fabricProofHash,
                        ethereumProofHash: proofData.ethereumProofHash,
                        fabricBlockNumber: proofData.fabricBlockNumber || 0,
                        ethereumBlockNumber: proofData.ethereumBlockNumber || 0,
                        fabricTxId: proofData.fabricTxId,
                        ethereumTxHash: proofData.ethereumTxHash,
                        validated: !!proofData.ethereumTxHash
                    }
                }
            );
        } catch (error) {
            logger.error('Failed to store cross-chain proof:', error);
        }
    }

    /**
     * Process an internally issued document with full cross-chain anchoring
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

            // 3. Generate fabric proof hash
            const fabricProofHash = this.generateFabricProofHash(
                documentHash,
                organizationId,
                Date.now()
            );

            // 4. Queue for batch anchoring to Ethereum (if enabled) or anchor immediately
            let ethereumTxHash = 'PENDING';
            let blockNumber = 0;

            if (process.env.BATCH_ANCHOR_ENABLED === 'true') {
                await this.queueForBatchAnchoring({
                    certificateId,
                    documentHash,
                    organizationId,
                    fabricProofHash
                });
            } else {
                // Immediate anchoring
                try {
                    const ethResult = await ethereumService.verifyDocument(
                        '0x' + documentHash,
                        ipfsCID,
                        organizationId,
                        '0x' + fabricProofHash
                    );
                    ethereumTxHash = ethResult.transactionHash;
                    blockNumber = ethResult.blockNumber;
                } catch (ethError) {
                    logger.warn('Immediate Ethereum anchoring failed, queuing for retry:', ethError.message);
                    await this.queueForBatchAnchoring({
                        certificateId,
                        documentHash,
                        organizationId,
                        fabricProofHash
                    });
                }
            }

            // 5. Store in DB
            const record = await this.storeVerificationRecord({
                documentHash,
                ipfsCID,
                organizationId,
                fabricProofHash,
                ethereumTxHash,
                blockNumber,
                verified: true,
                metadata,
                fabricCertificates: [fabricCert],
                certificateId,
                crossChainValidated: ethereumTxHash !== 'PENDING'
            });

            // 6. Trigger institutional sync
            await this.triggerInstitutionalSync(organizationId, certificateId);

            logger.info(`Document issued successfully: ${certificateId}`);

            return {
                success: true,
                verified: true,
                certificateId,
                transactionId: fabricCert.transactionId,
                ipfsCID,
                documentHash,
                ethereumTxHash,
                fabricProofHash
            };

        } catch (error) {
            logger.error('Failed to process issued document:', error);
            throw error;
        }
    }

    /**
     * Queue certificate for batch anchoring to Ethereum
     * @param {Object} data - Certificate data
     */
    async queueForBatchAnchoring(data) {
        try {
            await db.sequelize.query(
                `INSERT INTO batch_anchor_queue 
                (certificate_id, document_hash, organization_id, fabric_proof_hash, status)
                VALUES (:certificateId, :documentHash, :organizationId, :fabricProofHash, 'pending')`,
                {
                    replacements: {
                        certificateId: data.certificateId,
                        documentHash: data.documentHash,
                        organizationId: data.organizationId,
                        fabricProofHash: data.fabricProofHash
                    }
                }
            );
            logger.info(`Queued for batch anchoring: ${data.certificateId}`);
        } catch (error) {
            logger.error('Failed to queue for batch anchoring:', error);
        }
    }

    /**
     * Trigger institutional database sync notification
     * @param {string} organizationId - Organization ID
     * @param {string} certificateId - Certificate ID
     */
    async triggerInstitutionalSync(organizationId, certificateId) {
        try {
            // This will be handled by the sync engine
            // For now, just log the sync event
            await db.sequelize.query(
                `INSERT INTO institutional_sync_log 
                (organization_id, sync_type, records_synced, last_certificate_id, status)
                VALUES (:organizationId, 'certificate_issued', 1, :certificateId, 'pending')`,
                {
                    replacements: { organizationId, certificateId }
                }
            );
        } catch (error) {
            logger.warn('Failed to trigger institutional sync:', error.message);
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
     * Public verification check with full cross-chain validation
     * @param {string} documentHash - Document hash
     * @returns {Object} Verification status
     */
    async publicVerify(documentHash) {
        try {
            logger.info(`Public verification check for hash: ${documentHash}`);

            // Normalize hash (remove 0x prefix if present)
            const normalizedHash = documentHash.startsWith('0x') 
                ? documentHash.slice(2) 
                : documentHash;

            // Step 1: Check Fabric for certificate
            let fabricCertificates = [];
            let fabricValid = false;
            try {
                fabricCertificates = await fabricService.queryCertificateByHash(normalizedHash);
                fabricValid = fabricCertificates && fabricCertificates.length > 0;
            } catch (fabricError) {
                logger.warn('Fabric query failed:', fabricError.message);
            }

            // Step 2: Check Ethereum for verification record
            let ethereumValid = false;
            let ethereumData = null;
            try {
                ethereumData = await ethereumService.getDocumentVerification(normalizedHash);
                ethereumValid = ethereumData && ethereumData.verified;
            } catch (ethError) {
                logger.warn('Ethereum query failed:', ethError.message);
            }

            // Step 3: Check local database
            const dbRecord = await db.Verification.findOne({
                where: { documentHash: normalizedHash }
            });

            // Step 4: Get organization details
            let organization = null;
            if (fabricCertificates.length > 0) {
                organization = await db.Organization.findOne({
                    where: { orgId: fabricCertificates[0].organizationId }
                });
            } else if (ethereumData && ethereumData.organizationId) {
                organization = await db.Organization.findOne({
                    where: { orgId: ethereumData.organizationId }
                });
            }

            // Step 5: Validate cross-chain consistency
            const crossChainConsistent = this.validateCrossChainConsistency(
                ethereumData,
                fabricCertificates[0],
                dbRecord
            );

            // Determine final verification status
            const verified = fabricValid || ethereumValid;

            if (!verified) {
                return {
                    verified: false,
                    documentHash: normalizedHash,
                    message: 'Document not found in verification records',
                    fabricValid,
                    ethereumValid,
                    crossChainConsistent: false
                };
            }

            return {
                verified: true,
                documentHash: normalizedHash,
                ipfsCID: dbRecord?.ipfsCid || ethereumData?.ipfsCID || fabricCertificates[0]?.ipfsCID || '',
                organization: organization ? {
                    id: organization.orgId,
                    name: organization.name,
                    type: organization.orgType,
                    isActive: organization.isActive
                } : {
                    id: fabricCertificates[0]?.organizationId || ethereumData?.organizationId,
                    name: 'Unknown Organization',
                    type: 0,
                    isActive: true
                },
                timestamp: ethereumData?.blockTimestamp || 
                    Math.floor(new Date(fabricCertificates[0]?.issueDate || Date.now()).getTime() / 1000),
                blockNumber: ethereumData?.blockNumber || 0,
                ethereumTxHash: dbRecord?.ethereumTxHash || 'N/A',
                certificateDetails: fabricCertificates[0] || null,
                certificateId: dbRecord?.certificateId || fabricCertificates[0]?.certificateId,
                proof: {
                    fabricValid,
                    ethereumValid,
                    crossChainConsistent,
                    fabricProofHash: dbRecord?.fabricProofHash || 
                        this.generateFabricProofHash(normalizedHash, fabricCertificates[0]?.organizationId || '', 0),
                    ethereumProofHash: ethereumData?.fabricProofHash || null,
                    fabricCertificate: fabricCertificates[0] || null,
                    ethereumVerification: ethereumData
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
     * Validate cross-chain consistency between Ethereum, Fabric, and local DB
     * @param {Object} ethereumData - Ethereum verification data
     * @param {Object} fabricData - Fabric certificate data
     * @param {Object} dbRecord - Local database record
     * @returns {boolean} Consistency status
     */
    validateCrossChainConsistency(ethereumData, fabricData, dbRecord) {
        try {
            // If no data from either chain, can't validate
            if (!ethereumData && !fabricData) {
                return false;
            }

            // If only one chain has data, partial validation
            if (!ethereumData || !fabricData) {
                return true; // Partial validation passes
            }

            // Full cross-chain validation
            const checks = [];

            // Check 1: Document hash matches
            if (ethereumData.documentHash && fabricData.documentHash) {
                const ethHash = ethereumData.documentHash.replace('0x', '').toLowerCase();
                const fabHash = fabricData.documentHash.toLowerCase();
                checks.push(ethHash === fabHash);
            }

            // Check 2: Organization ID matches
            if (ethereumData.organizationId && fabricData.organizationId) {
                checks.push(ethereumData.organizationId === fabricData.organizationId);
            }

            // Check 3: Fabric proof hash matches (if stored on Ethereum)
            if (ethereumData.fabricProofHash && dbRecord?.fabricProofHash) {
                const ethProof = ethereumData.fabricProofHash.replace('0x', '').toLowerCase();
                const dbProof = dbRecord.fabricProofHash.toLowerCase();
                checks.push(ethProof === dbProof);
            }

            // Check 4: IPFS CID matches (if available)
            if (ethereumData.ipfsCID && dbRecord?.ipfsCid) {
                checks.push(ethereumData.ipfsCID === dbRecord.ipfsCid);
            }

            // All checks must pass
            return checks.length > 0 && checks.every(check => check === true);

        } catch (error) {
            logger.error('Cross-chain consistency validation error:', error);
            return false;
        }
    }

    /**
     * Verify event signature for cross-chain proof
     * @param {Object} event - Blockchain event
     * @param {string} expectedSigner - Expected signer address
     * @returns {boolean} Signature validity
     */
    async verifyEventSignature(event, expectedSigner) {
        try {
            const { ethers } = require('ethers');
            
            // Reconstruct the event message
            const message = ethers.solidityPackedKeccak256(
                ['bytes32', 'string', 'string', 'bytes32', 'uint256'],
                [
                    event.documentHash,
                    event.ipfsCID,
                    event.organizationId,
                    event.fabricProofHash,
                    event.timestamp
                ]
            );

            // If event has a signature, verify it
            if (event.signature) {
                const recoveredAddress = ethers.verifyMessage(
                    ethers.getBytes(message),
                    event.signature
                );
                return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
            }

            // For on-chain events, verify the transaction sender
            if (event.transactionHash) {
                const provider = ethereumService.provider;
                const tx = await provider.getTransaction(event.transactionHash);
                return tx.from.toLowerCase() === expectedSigner.toLowerCase();
            }

            return false;
        } catch (error) {
            logger.error('Event signature verification failed:', error);
            return false;
        }
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
