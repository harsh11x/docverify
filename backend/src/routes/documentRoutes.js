const express = require('express');
const { DocumentController, upload } = require('../controllers/documentController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Upload single document (requires authentication)
router.post(
    '/upload',
    authMiddleware.authenticate,
    upload.single('document'),
    DocumentController.uploadDocument.bind(DocumentController)
);

// Batch upload documents (requires authentication)
router.post(
    '/batch-upload',
    authMiddleware.authenticate,
    upload.array('documents', 10),
    DocumentController.batchUpload.bind(DocumentController)
);

// Get verification status (public)
router.get(
    '/:hash/status',
    DocumentController.getVerificationStatus.bind(DocumentController)
);

// Get verification history (public)
router.get(
    '/:hash/history',
    DocumentController.getVerificationHistory.bind(DocumentController)
);

module.exports = router;
