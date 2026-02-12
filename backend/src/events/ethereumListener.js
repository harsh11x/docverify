const ethereumService = require('../services/ethereumService');
const logger = require('../utils/logger');
const db = require('../database/models');
const io = require('../server').io; // WebSocket instance

class EthereumListener {
    constructor() {
        this.isListening = false;
        this.listeners = new Map();
    }

    /**
     * Start listening to all Ethereum events
     */
    async start() {
        try {
            if (this.isListening) {
                logger.warn('Ethereum listener already running');
                return;
            }

            await ethereumService.initialize();

            // Listen to OrganizationRegistered events
            this.listenToOrganizationRegistered();

            // Listen to DocumentVerified events
            this.listenToDocumentVerified();

            // Listen to DocumentRejected events
            this.listenToDocumentRejected();

            // Listen to OrganizationDeactivated events
            this.listenToOrganizationDeactivated();

            this.isListening = true;
            logger.info('Ethereum event listener started successfully');

        } catch (error) {
            logger.error('Failed to start Ethereum listener:', error);
            throw error;
        }
    }

    /**
     * Listen to OrganizationRegistered events
     */
    listenToOrganizationRegistered() {
        ethereumService.listenToEvent('OrganizationRegistered', async (event) => {
            try {
                logger.info(`OrganizationRegistered event received: ${event.args[0]}`);

                // Store event in database
                await db.Event.create({
                    eventType: 'organization',
                    eventName: 'OrganizationRegistered',
                    source: 'ethereum',
                    transactionHash: event.transactionHash,
                    blockNumber: event.blockNumber,
                    payload: {
                        orgId: event.args[0],
                        walletAddress: event.args[1],
                        orgType: event.args[2].toString(),
                        timestamp: event.args[3].toString()
                    },
                    processed: false
                });

                // Process event
                await this.processOrganizationRegistered(event);

                // Emit WebSocket update
                if (io) {
                    io.emit('organization:registered', {
                        orgId: event.args[0],
                        walletAddress: event.args[1],
                        transactionHash: event.transactionHash
                    });
                }

            } catch (error) {
                logger.error('Error processing OrganizationRegistered event:', error);
            }
        });
    }

    /**
     * Listen to DocumentVerified events
     */
    listenToDocumentVerified() {
        ethereumService.listenToEvent('DocumentVerified', async (event) => {
            try {
                logger.info(`DocumentVerified event received: ${event.args[0]}`);

                // Store event in database
                await db.Event.create({
                    eventType: 'verification',
                    eventName: 'DocumentVerified',
                    source: 'ethereum',
                    transactionHash: event.transactionHash,
                    blockNumber: event.blockNumber,
                    payload: {
                        documentHash: event.args[0],
                        organizationId: event.args[1],
                        ipfsCID: event.args[2],
                        fabricProofHash: event.args[3],
                        timestamp: event.args[4].toString(),
                        blockNumber: event.args[5].toString()
                    },
                    processed: false
                });

                // Process event
                await this.processDocumentVerified(event);

                // Emit WebSocket update
                if (io) {
                    io.emit('document:verified', {
                        documentHash: event.args[0],
                        organizationId: event.args[1],
                        ipfsCID: event.args[2],
                        transactionHash: event.transactionHash
                    });
                }

            } catch (error) {
                logger.error('Error processing DocumentVerified event:', error);
            }
        });
    }

    /**
     * Listen to DocumentRejected events
     */
    listenToDocumentRejected() {
        ethereumService.listenToEvent('DocumentRejected', async (event) => {
            try {
                logger.info(`DocumentRejected event received: ${event.args[0]}`);

                // Store event in database
                await db.Event.create({
                    eventType: 'verification',
                    eventName: 'DocumentRejected',
                    source: 'ethereum',
                    transactionHash: event.transactionHash,
                    blockNumber: event.blockNumber,
                    payload: {
                        documentHash: event.args[0],
                        organizationId: event.args[1],
                        reason: event.args[2],
                        timestamp: event.args[3].toString()
                    },
                    processed: false
                });

                // Emit WebSocket update
                if (io) {
                    io.emit('document:rejected', {
                        documentHash: event.args[0],
                        organizationId: event.args[1],
                        reason: event.args[2],
                        transactionHash: event.transactionHash
                    });
                }

            } catch (error) {
                logger.error('Error processing DocumentRejected event:', error);
            }
        });
    }

    /**
     * Listen to OrganizationDeactivated events
     */
    listenToOrganizationDeactivated() {
        ethereumService.listenToEvent('OrganizationDeactivated', async (event) => {
            try {
                logger.info(`OrganizationDeactivated event received: ${event.args[0]}`);

                // Store event in database
                await db.Event.create({
                    eventType: 'organization',
                    eventName: 'OrganizationDeactivated',
                    source: 'ethereum',
                    transactionHash: event.transactionHash,
                    blockNumber: event.blockNumber,
                    payload: {
                        orgId: event.args[0],
                        walletAddress: event.args[1],
                        timestamp: event.args[2].toString()
                    },
                    processed: false
                });

                // Process event
                await this.processOrganizationDeactivated(event);

                // Emit WebSocket update
                if (io) {
                    io.emit('organization:deactivated', {
                        orgId: event.args[0],
                        transactionHash: event.transactionHash
                    });
                }

            } catch (error) {
                logger.error('Error processing OrganizationDeactivated event:', error);
            }
        });
    }

    /**
     * Process OrganizationRegistered event
     */
    async processOrganizationRegistered(event) {
        try {
            // Get full organization details from Ethereum
            const org = await ethereumService.getOrganization(event.args[0]);

            // Store/update in database
            await db.Organization.upsert({
                orgId: org.orgId,
                orgType: org.orgType,
                walletAddress: org.walletAddress,
                name: org.name,
                metadata: org.metadata,
                registrationTimestamp: org.registrationTimestamp,
                isActive: org.isActive
            });

            logger.info(`Organization ${org.orgId} synced to database`);

        } catch (error) {
            logger.error('Error processing organization registration:', error);
            throw error;
        }
    }

    /**
     * Process DocumentVerified event
     */
    async processDocumentVerified(event) {
        try {
            // Update verification record if exists, or log
            const [verification, created] = await db.Verification.findOrCreate({
                where: { documentHash: event.args[0] },
                defaults: {
                    documentHash: event.args[0],
                    ipfsCid: event.args[2],
                    organizationId: event.args[1],
                    fabricProofHash: event.args[3],
                    ethereumTxHash: event.transactionHash,
                    blockNumber: event.blockNumber,
                    verified: true,
                    verifiedAt: new Date()
                }
            });

            if (!created) {
                logger.info(`Verification record already exists for ${event.args[0]}`);
            } else {
                logger.info(`Verification record created for ${event.args[0]}`);
            }

            // Update sync status
            await this.updateSyncStatus('ethereum', event.blockNumber);

        } catch (error) {
            logger.error('Error processing document verification:', error);
            throw error;
        }
    }

    /**
     * Process OrganizationDeactivated event
     */
    async processOrganizationDeactivated(event) {
        try {
            await db.Organization.update(
                { isActive: false },
                { where: { orgId: event.args[0] } }
            );

            logger.info(`Organization ${event.args[0]} deactivated in database`);

        } catch (error) {
            logger.error('Error processing organization deactivation:', error);
            throw error;
        }
    }

    /**
     * Update sync status
     */
    async updateSyncStatus(source, blockNumber) {
        try {
            await db.SyncStatus.update(
                {
                    lastSyncedBlock: blockNumber,
                    lastSyncedAt: new Date(),
                    status: 'active'
                },
                { where: { source } }
            );
        } catch (error) {
            logger.error('Error updating sync status:', error);
        }
    }

    /**
     * Stop listening
     */
    stop() {
        // Remove all listeners
        this.listeners.forEach((listener, eventName) => {
            // Ethereum service handles listener removal
        });

        this.isListening = false;
        logger.info('Ethereum event listener stopped');
    }

    /**
     * Get listening status
     */
    getStatus() {
        return {
            isListening: this.isListening,
            activeListeners: this.listeners.size
        };
    }
}

module.exports = new EthereumListener();
