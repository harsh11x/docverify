const crypto = require('crypto');
const logger = require('../utils/logger');
const db = require('../database/models');
const ethereumService = require('./ethereumService');

class BatchAnchoringService {
    constructor() {
        this.isProcessing = false;
        this.processorInterval = null;
    }

    /**
     * Initialize batch anchoring service
     */
    async initialize() {
        logger.info('Initializing Batch Anchoring Service...');
        
        if (process.env.BATCH_ANCHOR_ENABLED !== 'true') {
            logger.info('Batch anchoring is disabled');
            return;
        }

        // Start processor
        this.startProcessor();
        
        logger.info('Batch Anchoring Service initialized');
    }

    /**
     * Start the batch processor
     */
    startProcessor() {
        const interval = parseInt(process.env.BATCH_ANCHOR_INTERVAL) || 3600000; // 1 hour default

        this.processorInterval = setInterval(async () => {
            if (!this.isProcessing) {
                await this.processBatch();
            }
        }, interval);

        logger.info(`Batch processor started (interval: ${interval}ms)`);
    }

    /**
     * Queue a certificate for batch anchoring
     */
    async queueCertificate(certificateData) {
        try {
            await db.sequelize.query(
                `INSERT INTO batch_anchor_queue 
                (certificate_id, document_hash, organization_id, fabric_proof_hash, status)
                VALUES (:certificateId, :documentHash, :organizationId, :fabricProofHash, 'pending')
                ON CONFLICT (certificate_id) DO NOTHING`,
                {
                    replacements: {
                        certificateId: certificateData.certificateId,
                        documentHash: certificateData.documentHash,
                        organizationId: certificateData.organizationId,
                        fabricProofHash: certificateData.fabricProofHash
                    }
                }
            );

            logger.info(`Certificate queued for batch anchoring: ${certificateData.certificateId}`);
            return true;

        } catch (error) {
            logger.error('Failed to queue certificate:', error);
            throw error;
        }
    }

    /**
     * Process pending batch
     */
    async processBatch() {
        if (this.isProcessing) {
            logger.warn('Batch processing already in progress');
            return;
        }

        this.isProcessing = true;

        try {
            const batchSize = parseInt(process.env.BATCH_ANCHOR_SIZE) || 100;

            // Get pending items
            const items = await db.sequelize.query(
                `SELECT * FROM batch_anchor_queue 
                 WHERE status = 'pending' 
                 ORDER BY queued_at ASC 
                 LIMIT :limit`,
                { replacements: { limit: batchSize }, type: db.sequelize.QueryTypes.SELECT }
            );

            if (items.length === 0) {
                logger.debug('No pending items for batch anchoring');
                this.isProcessing = false;
                return;
            }

            logger.info(`Processing batch of ${items.length} certificates`);

            // Generate batch ID
            const batchId = crypto.randomBytes(16).toString('hex');

            // Mark items as processing
            const itemIds = items.map(i => i.id);
            await db.sequelize.query(
                `UPDATE batch_anchor_queue 
                 SET status = 'processing', batch_id = :batchId 
                 WHERE id IN (:ids)`,
                { replacements: { batchId, ids: itemIds } }
            );

            // Build merkle tree
            const leaves = items.map(item => ({
                certificateId: item.certificate_id,
                documentHash: item.document_hash,
                fabricProofHash: item.fabric_proof_hash
            }));

            const merkleRoot = this.buildMerkleTree(leaves);
            const merkleProofs = this.generateMerkleProofs(leaves, merkleRoot);

            // Anchor merkle root to Ethereum
            const anchorResult = await this.anchorMerkleRoot(batchId, merkleRoot, items.length);

            if (anchorResult.success) {
                // Update all items with transaction hash
                await db.sequelize.query(
                    `UPDATE batch_anchor_queue 
                     SET status = 'completed', 
                         processed_at = NOW(), 
                         ethereum_tx_hash = :txHash 
                     WHERE batch_id = :batchId`,
                    { replacements: { txHash: anchorResult.transactionHash, batchId } }
                );

                // Update verification records
                for (const item of items) {
                    await db.Verification.update(
                        {
                            ethereumTxHash: anchorResult.transactionHash,
                            blockNumber: anchorResult.blockNumber,
                            crossChainValidated: true,
                            metadata: db.sequelize.fn(
                                'jsonb_set',
                                db.sequelize.col('metadata'),
                                '{batchAnchor}',
                                JSON.stringify({
                                    batchId,
                                    merkleRoot,
                                    proof: merkleProofs[item.certificate_id]
                                })
                            )
                        },
                        { where: { certificateId: item.certificate_id } }
                    );
                }

                // Store batch record
                await this.storeBatchRecord(batchId, merkleRoot, anchorResult, items.length);

                logger.info(`Batch anchoring completed: ${batchId}, TX: ${anchorResult.transactionHash}`);

            } else {
                // Mark batch as failed
                await db.sequelize.query(
                    `UPDATE batch_anchor_queue 
                     SET status = 'failed', error_message = :error 
                     WHERE batch_id = :batchId`,
                    { replacements: { error: anchorResult.error, batchId } }
                );

                logger.error(`Batch anchoring failed: ${batchId}`, anchorResult.error);
            }

        } catch (error) {
            logger.error('Batch processing error:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Build merkle tree from leaves
     */
    buildMerkleTree(leaves) {
        if (leaves.length === 0) return '';

        // Hash each leaf
        let hashes = leaves.map(leaf => 
            crypto.createHash('sha256')
                .update(JSON.stringify(leaf))
                .digest('hex')
        );

        // Build tree
        while (hashes.length > 1) {
            const newLevel = [];
            for (let i = 0; i < hashes.length; i += 2) {
                const left = hashes[i];
                const right = hashes[i + 1] || left;
                const combined = crypto.createHash('sha256')
                    .update(left + right)
                    .digest('hex');
                newLevel.push(combined);
            }
            hashes = newLevel;
        }

        return hashes[0];
    }

    /**
     * Generate merkle proofs for each leaf
     */
    generateMerkleProofs(leaves, merkleRoot) {
        const proofs = {};

        // Hash each leaf
        let currentLevel = leaves.map((leaf, index) => ({
            hash: crypto.createHash('sha256').update(JSON.stringify(leaf)).digest('hex'),
            certificateId: leaf.certificateId,
            index
        }));

        // Initialize proofs
        for (const item of currentLevel) {
            proofs[item.certificateId] = [];
        }

        // Build proofs while building tree
        while (currentLevel.length > 1) {
            const newLevel = [];
            
            for (let i = 0; i < currentLevel.length; i += 2) {
                const left = currentLevel[i];
                const right = currentLevel[i + 1] || left;
                
                // Add sibling to proof
                if (left.certificateId) {
                    proofs[left.certificateId].push({
                        hash: right.hash,
                        position: 'right'
                    });
                }
                if (right.certificateId && right !== left) {
                    proofs[right.certificateId].push({
                        hash: left.hash,
                        position: 'left'
                    });
                }

                const combined = crypto.createHash('sha256')
                    .update(left.hash + right.hash)
                    .digest('hex');

                newLevel.push({
                    hash: combined,
                    certificateId: null
                });
            }

            currentLevel = newLevel;
        }

        return proofs;
    }

    /**
     * Verify merkle proof
     */
    verifyMerkleProof(leaf, proof, merkleRoot) {
        let hash = crypto.createHash('sha256')
            .update(JSON.stringify(leaf))
            .digest('hex');

        for (const node of proof) {
            if (node.position === 'left') {
                hash = crypto.createHash('sha256')
                    .update(node.hash + hash)
                    .digest('hex');
            } else {
                hash = crypto.createHash('sha256')
                    .update(hash + node.hash)
                    .digest('hex');
            }
        }

        return hash === merkleRoot;
    }

    /**
     * Anchor merkle root to Ethereum
     */
    async anchorMerkleRoot(batchId, merkleRoot, itemCount) {
        try {
            // Use a special document hash for batch anchoring
            const batchDocHash = crypto.createHash('sha256')
                .update(`BATCH:${batchId}:${merkleRoot}`)
                .digest('hex');

            const result = await ethereumService.verifyDocument(
                '0x' + batchDocHash,
                `batch://${batchId}`,
                'BATCH_ANCHOR_SYSTEM',
                '0x' + merkleRoot
            );

            return {
                success: true,
                transactionHash: result.transactionHash,
                blockNumber: result.blockNumber,
                gasUsed: result.gasUsed
            };

        } catch (error) {
            logger.error('Merkle root anchoring failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Store batch record for audit
     */
    async storeBatchRecord(batchId, merkleRoot, anchorResult, itemCount) {
        try {
            await db.sequelize.query(
                `INSERT INTO audit_log 
                (action, actor_type, actor_id, target_type, target_id, details)
                VALUES ('batch_anchor', 'system', 'batch_service', 'batch', :batchId, :details)`,
                {
                    replacements: {
                        batchId,
                        details: JSON.stringify({
                            merkleRoot,
                            itemCount,
                            transactionHash: anchorResult.transactionHash,
                            blockNumber: anchorResult.blockNumber,
                            gasUsed: anchorResult.gasUsed
                        })
                    }
                }
            );
        } catch (error) {
            logger.error('Failed to store batch record:', error);
        }
    }

    /**
     * Get batch status
     */
    async getBatchStatus(batchId) {
        try {
            const items = await db.sequelize.query(
                `SELECT * FROM batch_anchor_queue WHERE batch_id = :batchId`,
                { replacements: { batchId }, type: db.sequelize.QueryTypes.SELECT }
            );

            if (items.length === 0) {
                return null;
            }

            const completed = items.filter(i => i.status === 'completed').length;
            const failed = items.filter(i => i.status === 'failed').length;

            return {
                batchId,
                totalItems: items.length,
                completed,
                failed,
                pending: items.length - completed - failed,
                ethereumTxHash: items[0].ethereum_tx_hash,
                status: failed > 0 ? 'partial' : (completed === items.length ? 'completed' : 'processing')
            };

        } catch (error) {
            logger.error('Failed to get batch status:', error);
            throw error;
        }
    }

    /**
     * Get queue statistics
     */
    async getQueueStats() {
        try {
            const stats = await db.sequelize.query(
                `SELECT status, COUNT(*) as count FROM batch_anchor_queue GROUP BY status`,
                { type: db.sequelize.QueryTypes.SELECT }
            );

            return {
                stats: stats.reduce((acc, s) => {
                    acc[s.status] = parseInt(s.count);
                    return acc;
                }, {}),
                isProcessing: this.isProcessing
            };

        } catch (error) {
            logger.error('Failed to get queue stats:', error);
            throw error;
        }
    }

    /**
     * Retry failed items
     */
    async retryFailed() {
        try {
            const result = await db.sequelize.query(
                `UPDATE batch_anchor_queue 
                 SET status = 'pending', batch_id = NULL, error_message = NULL 
                 WHERE status = 'failed'
                 RETURNING id`
            );

            const retried = result[0]?.length || 0;
            logger.info(`Retrying ${retried} failed batch items`);

            return retried;

        } catch (error) {
            logger.error('Failed to retry failed items:', error);
            throw error;
        }
    }

    /**
     * Force process batch immediately
     */
    async forceProcess() {
        if (this.isProcessing) {
            throw new Error('Batch processing already in progress');
        }

        await this.processBatch();
    }

    /**
     * Stop the processor
     */
    stop() {
        if (this.processorInterval) {
            clearInterval(this.processorInterval);
            this.processorInterval = null;
        }
        logger.info('Batch anchoring processor stopped');
    }
}

module.exports = new BatchAnchoringService();
