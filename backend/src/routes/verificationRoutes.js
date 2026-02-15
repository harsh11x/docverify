const express = require('express');
const publicVerificationController = require('../controllers/publicVerificationController');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

// Public verification endpoint (rate limited)
router.post(
    '/',
    rateLimiter.publicVerification,
    publicVerificationController.verify.bind(publicVerificationController)
);

// Verify by CID (rate limited)
router.post(
    '/cid',
    rateLimiter.publicVerification,
    publicVerificationController.verifyByCID.bind(publicVerificationController)
);

// Bulk verification (stricter rate limit)
router.post(
    '/bulk',
    rateLimiter.bulkVerification,
    publicVerificationController.bulkVerify.bind(publicVerificationController)
);

// Verify by Certificate ID
router.post(
    '/cert-id',
    rateLimiter.publicVerification,
    publicVerificationController.verifyByCertificateId.bind(publicVerificationController)
);
// Download Certificate
router.get(
    '/download/:certificateId',
    rateLimiter.publicVerification,
    publicVerificationController.downloadCertificate.bind(publicVerificationController)
);

// Get verification history
router.get(
    '/history/:documentHash',
    rateLimiter.publicVerification,
    publicVerificationController.getVerificationHistory.bind(publicVerificationController)
);

// Get cross-chain proof
router.get(
    '/proof/:documentHash',
    rateLimiter.publicVerification,
    publicVerificationController.getCrossChainProof.bind(publicVerificationController)
);

module.exports = router;
