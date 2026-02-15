const logger = require('../utils/logger');
const db = require('../database/models');
const fabricService = require('./fabricService');
const ethereumService = require('./ethereumService');
const EventEmitter = require('events');

class SyncEngine extends EventEmitter {
    constructor() {
        super();
        this.isRunning = false;
        this.syncIntervals = new Map();
        this.institutionalWebhooks = new Map();
    }

    /**
     * Initialize the sync engine
     */
    async initialize() {
        try {
            logger.info('Initializing Sync Engine...');

            // Load registered organization webhooks
            await this.loadInstitutionalWebhooks();

            // Initialize sync status records
            await this.initializeSyncStatus();

            logger.info('Sync Engine initialized successfully');
            return true;
        } catch (error) {
            logger.error('Failed to initialize Sync Engine:', error);
            throw error;
        }
    }

    /**
     * Start the sync engine
     */
    async start() {
        if (this.isRunning) {
            logger.warn('Sync Engine already running');
            return;
        }

        this.isRunning = true;
        logger.info('Starting Sync Engine...');

        // Start periodic sync jobs
        this.startEthereumSync();
        this.startFabricSync();
        this.startBatchAnchoringProcessor();
        this.startInstitutionalSyncProcessor();

        logger.info('Sync Engine started successfully');
    }

    /**
     * Load institutional webhooks from database
     */
    async loadInstitutionalWebhooks() {
        try {
            const orgs = await db.Organization.findAll({
                where: { isActive: true },
                attributes: ['orgId', 'metadata']
            });

            for (const org of orgs) {
                if (org.metadata) {
                    const metadata = typeof org.metadata === 'string' 
                        ? JSON.parse(org.metadata) 
                        : org.metadata;
                    
                    if (metadata.webhookUrl) {
                        this.institutionalWebhooks.set(org.orgId, {
                            url: metadata.webhookUrl,
                            secret: metadata.webhookSecret,
                            events: metadata.webhookEvents || ['certificate_issued', 'certificate_revoked']
                        });
                    }
                }
            }

            logger.info(`Loaded ${this.institutionalWebhooks.size} institutional webhooks`);
        } catch (error) {
            logger.error('Failed to load institutional webhooks:', error);
        }
    }

    /**
     * Initialize sync status records
     */
    async initializeSyncStatus() {
        try {
            await db.sequelize.query(
                `INSERT INTO sync_status (source, last_synced_block, status)
                 VALUES ('ethereum', 0, 'active'), ('fabric', 0, 'active')
                 ON CONFLICT (source) DO NOTHING`
            );
        } catch (error) {
            logger.warn('Sync status initialization:', error.message);
        }
    }

    /**
     * Start Ethereum blockchain sync
     */
    startEthereumSync() {
        const interval = parseInt(process.env.ETHEREUM_SYNC_INTERVAL) || 30000;

        const syncJob = setInterval(async () => {
            try {
                await this.syncEthereumEvents();
            } catch (error) {
                logger.error('Ethereum sync error:', error);
            }
        }, interval);

        this.syncIntervals.set('ethereum', syncJob);
        logger.info(`Ethereum sync started (interval: ${interval}ms)`);
    }

    /**
     * Start Fabric blockchain sync
     */
    startFabricSync() {
        const interval = parseInt(process.env.FABRIC_SYNC_INTERVAL) || 30000;

        const syncJob = setInterval(async () => {
            try {
                await this.syncFabricEvents();
            } catch (error) {
                logger.error('Fabric sync error:', error);
            }
        }, interval);

        this.syncIntervals.set('fabric', syncJob);
        logger.info(`Fabric sync started (interval: ${interval}ms)`);
    }

    /**
     * Sync Ethereum events to local database
     */
    async syncEthereumEvents() {
        try {
            // Get last synced block
            const [syncStatus] = await db.sequelize.query(
                `SELECT last_synced_block FROM sync_status WHERE source = 'ethereum'`,
                { type: db.sequelize.QueryTypes.SELECT }
            );

            const fromBlock = (syncStatus?.last_synced_block || 0) + 1;
            const currentBlock = await ethereumService.provider.getBlockNumber();

            if (fromBlock > currentBlock) {
                return; // Already synced
            }

            logger.info(`Syncing Ethereum events from block ${fromBlock} to ${currentBlock}`);

            // Fetch events
            const events = await ethereumService.getPastEvents('DocumentVerified', fromBlock, currentBlock);

            for (const event of events) {
                await this.processEthereumEvent(event);
            }

            // Update sync status
            await db.sequelize.query(
                `UPDATE sync_status SET last_synced_block = :block, last_synced_at = NOW() WHERE source = 'ethereum'`,
                { replacements: { block: currentBlock } }
            );

            logger.info(`Synced ${events.length} Ethereum events`);

        } catch (error) {
            logger.error('Ethereum sync failed:', error);
            await this.recordSyncError('ethereum', error.message);
        }
    }

    /**
     * Sync Fabric events (query-based since Fabric doesn't have block numbers like Ethereum)
     */
    async syncFabricEvents() {
        try {
            // Get pending sync items
            const pendingItems = await db.sequelize.query(
                `SELECT * FROM institutional_sync_log WHERE status = 'pending' LIMIT 100`,
                { type: db.sequelize.QueryTypes.SELECT }
            );

            for (const item of pendingItems) {
                try {
                    // Get certificate from Fabric
                    const cert = await fabricService.getCertificate(item.last_certificate_id);
                    
                    // Trigger institutional webhook
                    await this.notifyInstitution(item.organization_id, 'certificate_issued', cert);

                    // Mark as completed
                    await db.sequelize.query(
                        `UPDATE institutional_sync_log SET status = 'completed', completed_at = NOW() WHERE id = :id`,
                        { replacements: { id: item.id } }
                    );
                } catch (itemError) {
                    logger.error(`Failed to sync item ${item.id}:`, itemError);
                    await db.sequelize.query(
                        `UPDATE institutional_sync_log SET status = 'failed', error_message = :error WHERE id = :id`,
                        { replacements: { id: item.id, error: itemError.message } }
                    );
                }
            }

            // Update sync status
            await db.sequelize.query(
                `UPDATE sync_status SET last_synced_at = NOW() WHERE source = 'fabric'`
            );

        } catch (error) {
            logger.error('Fabric sync failed:', error);
            await this.recordSyncError('fabric', error.message);
        }
    }

    /**
     * Process a single Ethereum event
     */
    async processEthereumEvent(event) {
        try {
            // Store in events table
            await db.Event.create({
                eventType: 'verification',
                eventName: event.eventName,
                source: 'ethereum',
                transactionHash: event.transactionHash,
                blockNumber: event.blockNumber,
                payload: event.args,
                processed: false
            });

            // Update verification record if exists
            const documentHash = event.args.documentHash?.replace('0x', '');
            if (documentHash) {
                await db.Verification.update(
                    {
                        ethereumTxHash: event.transactionHash,
                        blockNumber: event.blockNumber,
                        crossChainValidated: true
                    },
                    { where: { documentHash } }
                );
            }

            // Emit event for real-time listeners
            this.emit('ethereum:event', event);

        } catch (error) {
            logger.error('Failed to process Ethereum event:', error);
        }
    }

    /**
     * Start batch anchoring processor
     */
    startBatchAnchoringProcessor() {
        if (process.env.BATCH_ANCHOR_ENABLED !== 'true') {
            logger.info('Batch anchoring disabled');
            return;
        }

        const interval = parseInt(process.env.BATCH_ANCHOR_INTERVAL) || 3600000;
        const batchSize = parseInt(process.env.BATCH_ANCHOR_SIZE) || 100;

        const processorJob = setInterval(async () => {
            try {
                await this.processBatchAnchoring(batchSize);
            } catch (error) {
                logger.error('Batch anchoring error:', error);
            }
        }, interval);

        this.syncIntervals.set('batch_anchor', processorJob);
        logger.info(`Batch anchoring processor started (interval: ${interval}ms, batch size: ${batchSize})`);
    }

    /**
     * Process batch anchoring queue
     */
    async processBatchAnchoring(batchSize) {
        try {
            // Get pending items
            const items = await db.sequelize.query(
                `SELECT * FROM batch_anchor_queue WHERE status = 'pending' ORDER BY queued_at ASC LIMIT :limit`,
                { replacements: { limit: batchSize }, type: db.sequelize.QueryTypes.SELECT }
            );

            if (items.length === 0) {
                return;
            }

            logger.info(`Processing batch anchoring for ${items.length} items`);

            // Generate batch ID
            const crypto = require('crypto');
            const batchId = crypto.randomBytes(16).toString('hex');

            // Mark items as processing
            const itemIds = items.map(i => i.id);
            await db.sequelize.query(
                `UPDATE batch_anchor_queue SET status = 'processing', batch_id = :batchId WHERE id IN (:ids)`,
                { replacements: { batchId, ids: itemIds } }
            );

            // Create merkle root of all proofs for batch anchoring
            const proofHashes = items.map(i => i.fabric_proof_hash);
            const batchProofHash = this.computeMerkleRoot(proofHashes);

            // Anchor batch to Ethereum (single transaction for multiple certificates)
            try {
                // For batch anchoring, we anchor the merkle root
                const ethResult = await ethereumService.verifyDocument(
                    '0x' + batchProofHash,
                    `batch:${batchId}`,
                    'BATCH_ANCHOR',
                    '0x' + batchProofHash
                );

                // Update all items in batch
                await db.sequelize.query(
                    `UPDATE batch_anchor_queue 
                     SET status = 'completed', processed_at = NOW(), ethereum_tx_hash = :txHash 
                     WHERE batch_id = :batchId`,
                    { replacements: { txHash: ethResult.transactionHash, batchId } }
                );

                // Update verification records
                for (const item of items) {
                    await db.Verification.update(
                        {
                            ethereumTxHash: ethResult.transactionHash,
                            blockNumber: ethResult.blockNumber,
                            crossChainValidated: true
                        },
                        { where: { certificateId: item.certificate_id } }
                    );
                }

                logger.info(`Batch anchoring completed: ${batchId}, TX: ${ethResult.transactionHash}`);

            } catch (ethError) {
                logger.error('Batch anchoring failed:', ethError);
                await db.sequelize.query(
                    `UPDATE batch_anchor_queue 
                     SET status = 'failed', error_message = :error 
                     WHERE batch_id = :batchId`,
                    { replacements: { error: ethError.message, batchId } }
                );
            }

        } catch (error) {
            logger.error('Batch anchoring processor failed:', error);
        }
    }

    /**
     * Compute merkle root for batch of hashes
     */
    computeMerkleRoot(hashes) {
        const crypto = require('crypto');

        if (hashes.length === 0) return '';
        if (hashes.length === 1) return hashes[0];

        const hashPairs = (arr) => {
            const result = [];
            for (let i = 0; i < arr.length; i += 2) {
                const left = arr[i];
                const right = arr[i + 1] || left;
                const combined = crypto.createHash('sha256')
                    .update(left + right)
                    .digest('hex');
                result.push(combined);
            }
            return result;
        };

        let current = hashes;
        while (current.length > 1) {
            current = hashPairs(current);
        }

        return current[0];
    }

    /**
     * Start institutional sync processor
     */
    startInstitutionalSyncProcessor() {
        const interval = parseInt(process.env.INSTITUTIONAL_SYNC_INTERVAL) || 60000;

        const processorJob = setInterval(async () => {
            try {
                await this.processInstitutionalSync();
            } catch (error) {
                logger.error('Institutional sync error:', error);
            }
        }, interval);

        this.syncIntervals.set('institutional', processorJob);
        logger.info(`Institutional sync processor started (interval: ${interval}ms)`);
    }

    /**
     * Process institutional database synchronization
     */
    async processInstitutionalSync() {
        try {
            // Get organizations with pending syncs
            const pendingSyncs = await db.sequelize.query(
                `SELECT DISTINCT organization_id FROM institutional_sync_log WHERE status = 'pending'`,
                { type: db.sequelize.QueryTypes.SELECT }
            );

            for (const sync of pendingSyncs) {
                await this.syncOrganizationDatabase(sync.organization_id);
            }

        } catch (error) {
            logger.error('Institutional sync processor failed:', error);
        }
    }

    /**
     * Sync a specific organization's database
     */
    async syncOrganizationDatabase(organizationId) {
        try {
            const webhook = this.institutionalWebhooks.get(organizationId);
            if (!webhook) {
                logger.debug(`No webhook configured for organization: ${organizationId}`);
                return;
            }

            // Get pending sync items for this organization
            const items = await db.sequelize.query(
                `SELECT * FROM institutional_sync_log 
                 WHERE organization_id = :orgId AND status = 'pending' 
                 ORDER BY started_at ASC LIMIT 50`,
                { replacements: { orgId: organizationId }, type: db.sequelize.QueryTypes.SELECT }
            );

            if (items.length === 0) return;

            // Prepare batch payload
            const certificates = [];
            for (const item of items) {
                if (item.last_certificate_id) {
                    const verification = await db.Verification.findOne({
                        where: { certificateId: item.last_certificate_id }
                    });
                    if (verification) {
                        certificates.push({
                            certificateId: verification.certificateId,
                            documentHash: verification.documentHash,
                            ipfsCid: verification.ipfsCid,
                            fabricProofHash: verification.fabricProofHash,
                            ethereumTxHash: verification.ethereumTxHash,
                            verifiedAt: verification.verifiedAt,
                            metadata: verification.metadata
                        });
                    }
                }
            }

            // Send to institutional webhook
            await this.notifyInstitution(organizationId, 'batch_sync', { certificates });

            // Mark items as completed
            const itemIds = items.map(i => i.id);
            await db.sequelize.query(
                `UPDATE institutional_sync_log 
                 SET status = 'completed', completed_at = NOW(), records_synced = :count 
                 WHERE id IN (:ids)`,
                { replacements: { count: certificates.length, ids: itemIds } }
            );

            logger.info(`Synced ${certificates.length} certificates to organization: ${organizationId}`);

        } catch (error) {
            logger.error(`Failed to sync organization ${organizationId}:`, error);
        }
    }

    /**
     * Notify institution via webhook
     */
    async notifyInstitution(organizationId, eventType, payload) {
        try {
            const webhook = this.institutionalWebhooks.get(organizationId);
            if (!webhook) return;

            if (!webhook.events.includes(eventType) && !webhook.events.includes('*')) {
                return;
            }

            const crypto = require('crypto');
            const axios = require('axios');

            // Generate HMAC signature
            const timestamp = Date.now();
            const body = JSON.stringify({
                eventType,
                organizationId,
                timestamp,
                payload
            });

            const signature = crypto
                .createHmac('sha256', webhook.secret || '')
                .update(body)
                .digest('hex');

            // Send webhook
            await axios.post(webhook.url, body, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-DocVerify-Signature': signature,
                    'X-DocVerify-Timestamp': timestamp.toString()
                },
                timeout: 10000
            });

            logger.info(`Webhook sent to ${organizationId}: ${eventType}`);

        } catch (error) {
            logger.error(`Webhook notification failed for ${organizationId}:`, error.message);
        }
    }

    /**
     * Record sync error
     */
    async recordSyncError(source, errorMessage) {
        try {
            await db.sequelize.query(
                `UPDATE sync_status SET status = 'error', error_message = :error WHERE source = :source`,
                { replacements: { source, error: errorMessage } }
            );
        } catch (error) {
            logger.error('Failed to record sync error:', error);
        }
    }

    /**
     * Register institutional webhook
     */
    async registerWebhook(organizationId, webhookConfig) {
        try {
            this.institutionalWebhooks.set(organizationId, webhookConfig);

            // Update organization metadata
            await db.Organization.update(
                {
                    metadata: db.sequelize.fn(
                        'jsonb_set',
                        db.sequelize.col('metadata'),
                        '{webhookUrl}',
                        JSON.stringify(webhookConfig.url)
                    )
                },
                { where: { orgId: organizationId } }
            );

            logger.info(`Webhook registered for organization: ${organizationId}`);
            return true;
        } catch (error) {
            logger.error('Failed to register webhook:', error);
            throw error;
        }
    }

    /**
     * Get sync status
     */
    async getSyncStatus() {
        try {
            const statuses = await db.sequelize.query(
                `SELECT * FROM sync_status`,
                { type: db.sequelize.QueryTypes.SELECT }
            );

            const queueStats = await db.sequelize.query(
                `SELECT status, COUNT(*) as count FROM batch_anchor_queue GROUP BY status`,
                { type: db.sequelize.QueryTypes.SELECT }
            );

            return {
                isRunning: this.isRunning,
                blockchainSync: statuses,
                batchAnchorQueue: queueStats,
                registeredWebhooks: this.institutionalWebhooks.size
            };
        } catch (error) {
            logger.error('Failed to get sync status:', error);
            throw error;
        }
    }

    /**
     * Stop the sync engine
     */
    stop() {
        logger.info('Stopping Sync Engine...');

        for (const [name, interval] of this.syncIntervals) {
            clearInterval(interval);
            logger.info(`Stopped sync job: ${name}`);
        }

        this.syncIntervals.clear();
        this.isRunning = false;

        logger.info('Sync Engine stopped');
    }
}

module.exports = new SyncEngine();
