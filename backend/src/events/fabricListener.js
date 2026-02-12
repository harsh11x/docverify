const fabricService = require('../services/fabricService');
const logger = require('../utils/logger');
const db = require('../database/models');
const io = require('../server').io; // WebSocket instance

class FabricListener {
    constructor() {
        this.isListening = false;
        this.listener = null;
    }

    /**
     * Start listening to Fabric chaincode events
     */
    async start() {
        try {
            if (this.isListening) {
                logger.warn('Fabric listener already running');
                return;
            }

            await fabricService.initialize();

            // Start listening to all chaincode events
            this.listener = await fabricService.listenToEvents(async (event) => {
                await this.handleEvent(event);
            });

            this.isListening = true;
            logger.info('Fabric event listener started successfully');

        } catch (error) {
            logger.error('Failed to start Fabric listener:', error);
            throw error;
        }
    }

    /**
     * Handle incoming Fabric events
     */
    async handleEvent(event) {
        try {
            logger.info(`Fabric event received: ${event.eventName}`);

            // Store event in database
            await db.Event.create({
                eventType: this.getEventType(event.eventName),
                eventName: event.eventName,
                source: 'fabric',
                transactionHash: event.transactionId,
                blockNumber: event.blockNumber,
                payload: event.payload,
                processed: false
            });

            // Route to specific handler
            switch (event.eventName) {
                case 'CertificateIssued':
                    await this.handleCertificateIssued(event);
                    break;
                case 'CertificateStatusUpdated':
                    await this.handleCertificateStatusUpdated(event);
                    break;
                default:
                    logger.info(`No specific handler for event: ${event.eventName}`);
            }

            // Mark event as processed
            await db.Event.update(
                { processed: true, processedAt: new Date() },
                { where: { transactionHash: event.transactionId, source: 'fabric' } }
            );

            // Update sync status
            await this.updateSyncStatus(event.blockNumber);

        } catch (error) {
            logger.error('Error handling Fabric event:', error);
        }
    }

    /**
     * Handle CertificateIssued event
     */
    async handleCertificateIssued(event) {
        try {
            const { certificateId, organizationId, documentHash, timestamp } = event.payload;

            logger.info(`Certificate issued: ${certificateId} by ${organizationId}`);

            // Emit WebSocket update
            if (io) {
                io.emit('certificate:issued', {
                    certificateId,
                    organizationId,
                    documentHash,
                    timestamp,
                    transactionId: event.transactionId
                });
            }

            // Optional: Trigger batch anchoring to Ethereum
            if (process.env.BATCH_ANCHOR_ENABLED === 'true') {
                await this.queueForBatchAnchoring({
                    certificateId,
                    organizationId,
                    documentHash
                });
            }

        } catch (error) {
            logger.error('Error handling CertificateIssued event:', error);
        }
    }

    /**
     * Handle CertificateStatusUpdated event
     */
    async handleCertificateStatusUpdated(event) {
        try {
            const { certificateId, status, reason, timestamp } = event.payload;

            logger.info(`Certificate status updated: ${certificateId} -> ${status}`);

            // Emit WebSocket update
            if (io) {
                io.emit('certificate:status-updated', {
                    certificateId,
                    status,
                    reason,
                    timestamp,
                    transactionId: event.transactionId
                });
            }

        } catch (error) {
            logger.error('Error handling CertificateStatusUpdated event:', error);
        }
    }

    /**
     * Queue certificate for batch anchoring
     */
    async queueForBatchAnchoring(data) {
        try {
            // This would add to batch_queue table
            // Implementation depends on batch anchoring strategy
            logger.info(`Queued for batch anchoring: ${data.certificateId}`);
        } catch (error) {
            logger.error('Error queuing for batch anchoring:', error);
        }
    }

    /**
     * Get event type from event name
     */
    getEventType(eventName) {
        const typeMap = {
            'CertificateIssued': 'certificate',
            'CertificateStatusUpdated': 'certificate',
            'CertificateRevoked': 'certificate'
        };
        return typeMap[eventName] || 'unknown';
    }

    /**
     * Update sync status
     */
    async updateSyncStatus(blockNumber) {
        try {
            await db.SyncStatus.update(
                {
                    lastSyncedBlock: blockNumber,
                    lastSyncedAt: new Date(),
                    status: 'active'
                },
                { where: { source: 'fabric' } }
            );
        } catch (error) {
            logger.error('Error updating sync status:', error);
        }
    }

    /**
     * Stop listening
     */
    async stop() {
        try {
            if (this.listener) {
                // Fabric SDK handles listener cleanup
                await fabricService.disconnect();
            }

            this.isListening = false;
            logger.info('Fabric event listener stopped');
        } catch (error) {
            logger.error('Error stopping Fabric listener:', error);
        }
    }

    /**
     * Get listening status
     */
    getStatus() {
        return {
            isListening: this.isListening,
            connected: fabricService.isConnected()
        };
    }
}

module.exports = new FabricListener();
