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

module.exports = router;
