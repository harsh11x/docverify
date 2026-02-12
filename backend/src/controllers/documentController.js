const verificationService = require('../services/verificationService');
const multer = require('multer');
const logger = require('../utils/logger');

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

class DocumentController {
    /**
     * Upload and verify document
     * POST /api/documents/upload
     */
    async uploadDocument(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No file uploaded'
                });
            }

            const { organizationId } = req.body;

            if (!organizationId) {
                return res.status(400).json({
                    success: false,
                    error: 'Organization ID is required'
                });
            }

            const metadata = {
                fileName: req.file.originalname,
                fileType: req.file.mimetype,
                fileSize: req.file.size,
                uploadedBy: req.user?.address || 'anonymous',
                uploadedAt: new Date().toISOString()
            };

            logger.info(`Document upload initiated: ${req.file.originalname}`);

            const result = await verificationService.verifyDocument(
                req.file.buffer,
                metadata,
                organizationId
            );

            res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {
            logger.error('Document upload failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get verification status
     * GET /api/documents/:hash/status
     */
    async getVerificationStatus(req, res) {
        try {
            const { hash } = req.params;

            const result = await verificationService.publicVerify(hash);

            res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {
            logger.error('Failed to get verification status:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get verification history
     * GET /api/documents/:hash/history
     */
    async getVerificationHistory(req, res) {
        try {
            const { hash } = req.params;

            const history = await verificationService.getVerificationHistory(hash);

            res.status(200).json({
                success: true,
                data: history
            });

        } catch (error) {
            logger.error('Failed to get verification history:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Batch upload documents
     * POST /api/documents/batch-upload
     */
    async batchUpload(req, res) {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No files uploaded'
                });
            }

            const { organizationId } = req.body;

            const documents = req.files.map(file => ({
                buffer: file.buffer,
                metadata: {
                    fileName: file.originalname,
                    fileType: file.mimetype,
                    fileSize: file.size
                }
            }));

            const results = await verificationService.batchVerify(documents, organizationId);

            res.status(200).json({
                success: true,
                data: results
            });

        } catch (error) {
            logger.error('Batch upload failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = { DocumentController: new DocumentController(), upload };
