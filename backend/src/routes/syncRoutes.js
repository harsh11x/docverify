const express = require('express');
const router = express.Router();
const syncEngine = require('../services/syncEngine');
const batchAnchoringService = require('../services/batchAnchoringService');
const authMiddleware = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

// Get sync status
router.get('/status', async (req, res) => {
    try {
        const status = await syncEngine.getSyncStatus();
        res.status(200).json({
            success: true,
            data: status
        });
    } catch (error) {
        logger.error('Failed to get sync status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get batch anchoring status
router.get('/batch/status', async (req, res) => {
    try {
        const stats = await batchAnchoringService.getQueueStats();
        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Failed to get batch status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get specific batch status
router.get('/batch/:batchId', async (req, res) => {
    try {
        const { batchId } = req.params;
        const status = await batchAnchoringService.getBatchStatus(batchId);

        if (!status) {
            return res.status(404).json({
                success: false,
                error: 'Batch not found'
            });
        }

        res.status(200).json({
            success: true,
            data: status
        });
    } catch (error) {
        logger.error('Failed to get batch status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Force batch processing (admin only)
router.post(
    '/batch/process',
    authMiddleware.authenticate.bind(authMiddleware),
    async (req, res) => {
        try {
            // Check if user is admin
            if (!req.user?.organizationId) {
                return res.status(403).json({
                    success: false,
                    error: 'Admin access required'
                });
            }

            await batchAnchoringService.forceProcess();

            res.status(200).json({
                success: true,
                message: 'Batch processing initiated'
            });
        } catch (error) {
            logger.error('Failed to force batch process:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Retry failed batch items (admin only)
router.post(
    '/batch/retry',
    authMiddleware.authenticate.bind(authMiddleware),
    async (req, res) => {
        try {
            if (!req.user?.organizationId) {
                return res.status(403).json({
                    success: false,
                    error: 'Admin access required'
                });
            }

            const retried = await batchAnchoringService.retryFailed();

            res.status(200).json({
                success: true,
                data: {
                    retriedCount: retried
                }
            });
        } catch (error) {
            logger.error('Failed to retry batch items:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Register webhook for institutional sync
router.post(
    '/webhook/register',
    authMiddleware.authenticate.bind(authMiddleware),
    async (req, res) => {
        try {
            const { url, secret, events } = req.body;

            if (!req.user?.organizationId) {
                return res.status(403).json({
                    success: false,
                    error: 'Organization access required'
                });
            }

            if (!url) {
                return res.status(400).json({
                    success: false,
                    error: 'Webhook URL is required'
                });
            }

            await syncEngine.registerWebhook(req.user.organizationId, {
                url,
                secret: secret || '',
                events: events || ['certificate_issued', 'certificate_revoked']
            });

            res.status(200).json({
                success: true,
                message: 'Webhook registered successfully'
            });
        } catch (error) {
            logger.error('Failed to register webhook:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

module.exports = router;
