const verificationService = require('../services/verificationService');
const logger = require('../utils/logger');

class PublicVerificationController {
    /**
     * Public verification endpoint
     * POST /api/verify
     */
    async verify(req, res) {
        try {
            const { documentHash } = req.body;

            if (!documentHash) {
                return res.status(400).json({
                    success: false,
                    error: 'Document hash is required'
                });
            }

            logger.info(`Public verification request for hash: ${documentHash}`);

            const result = await verificationService.publicVerify(documentHash);

            res.status(200).json({
                success: true,
                verified: result.verified,
                data: result
            });

        } catch (error) {
            logger.error('Public verification failed:', error);
            res.status(500).json({
                success: false,
                verified: false,
                error: error.message
            });
        }
    }

    /**
     * Verify by IPFS CID
     * POST /api/verify/cid
     */
    async verifyByCID(req, res) {
        try {
            const { ipfsCID } = req.body;

            if (!ipfsCID) {
                return res.status(400).json({
                    success: false,
                    error: 'IPFS CID is required'
                });
            }

            // Find verification by CID
            const db = require('../database/models');
            const verification = await db.Verification.findOne({
                where: { ipfsCid: ipfsCID }
            });

            if (!verification) {
                return res.status(404).json({
                    success: false,
                    verified: false,
                    error: 'No verification found for this CID'
                });
            }

            // Get full verification details
            const result = await verificationService.publicVerify(verification.documentHash);

            res.status(200).json({
                success: true,
                verified: result.verified,
                data: result
            });

        } catch (error) {
            logger.error('CID verification failed:', error);
            res.status(500).json({
                success: false,
                verified: false,
                error: error.message
            });
        }
    }

    /**
     * Bulk verification
     * POST /api/verify/bulk
     */
    async bulkVerify(req, res) {
        try {
            const { documentHashes } = req.body;

            if (!Array.isArray(documentHashes) || documentHashes.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Document hashes array is required'
                });
            }

            if (documentHashes.length > 100) {
                return res.status(400).json({
                    success: false,
                    error: 'Maximum 100 hashes per request'
                });
            }

            const results = await Promise.all(
                documentHashes.map(async (hash) => {
                    try {
                        const result = await verificationService.publicVerify(hash);
                        return {
                            documentHash: hash,
                            verified: result.verified,
                            ...result
                        };
                    } catch (error) {
                        return {
                            documentHash: hash,
                            verified: false,
                            error: error.message
                        };
                    }
                })
            );

            res.status(200).json({
                success: true,
                data: results
            });

        } catch (error) {
            logger.error('Bulk verification failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * Verify by Certificate ID
     * POST /api/verify/cert-id
     */
    async verifyByCertificateId(req, res) {
        try {
            const { certificateId } = req.body;

            if (!certificateId) {
                return res.status(400).json({
                    success: false,
                    error: 'Certificate ID is required'
                });
            }

            const result = await verificationService.verifyByCertificateId(certificateId);

            if (!result.found && !result.verified) {
                return res.status(404).json({
                    success: false,
                    verified: false,
                    error: 'Certificate not found or invalid'
                });
            }

            res.status(200).json({
                success: true,
                verified: result.verified,
                data: result
            });

        } catch (error) {
            logger.error('Certificate verification failed:', error);
            res.status(500).json({
                success: false,
                verified: false,
                error: error.message
            });
        }
    }
});
        }
    }

    /**
     * Download Certificate PDF
     * GET /api/verify/download/:certificateId
     */
    async downloadCertificate(req, res) {
    try {
        const { certificateId } = req.params;

        if (!certificateId) {
            return res.status(400).json({
                success: false,
                error: 'Certificate ID is required'
            });
        }

        // Find verification record
        const db = require('../database/models');
        const verification = await db.Verification.findOne({
            where: { certificateId }
        });

        if (!verification || !verification.ipfsCID) {
            return res.status(404).json({
                success: false,
                error: 'Certificate not found or file unavailable'
            });
        }

        // Fetch file from IPFS
        const ipfsService = require('../services/ipfsService');
        const fileBuffer = await ipfsService.getFile(verification.ipfsCID);

        // Set headers for download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="certificate-${certificateId}.pdf"`);
        res.send(fileBuffer);

    } catch (error) {
        logger.error('Certificate download failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to download certificate'
        });
    }
}
}

module.exports = new PublicVerificationController();
