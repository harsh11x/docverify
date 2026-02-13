const express = require('express');
const organizationController = require('../controllers/organizationController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// Register organization (admin only)
router.post(
    '/register',
    authMiddleware.authenticate,
    roleMiddleware.requireAdmin,
    organizationController.registerOrganization.bind(organizationController)
);

// Get organization details (public)
router.get(
    '/:id',
    organizationController.getOrganization.bind(organizationController)
);

// Get all organizations (public)
router.get(
    '/',
    organizationController.getAllOrganizations.bind(organizationController)
);

// Deactivate organization (admin only)
router.put(
    '/:id/deactivate',
    authMiddleware.authenticate,
    roleMiddleware.requireAdmin,
    organizationController.deactivateOrganization.bind(organizationController)
);

// Approve organization (admin only)
router.put(
    '/:id/approve',
    authMiddleware.authenticate,
    roleMiddleware.requireAdmin,
    organizationController.approveOrganization.bind(organizationController)
);

// Reject organization (admin only)
router.put(
    '/:id/reject',
    authMiddleware.authenticate,
    roleMiddleware.requireAdmin,
    organizationController.rejectOrganization.bind(organizationController)
);

// Ban organization (admin only)
router.put(
    '/:id/ban',
    authMiddleware.authenticate,
    roleMiddleware.requireAdmin,
    organizationController.banOrganization.bind(organizationController)
);

// Get organization statistics (public)
router.get(
    '/:id/stats',
    organizationController.getOrganizationStats.bind(organizationController)
);

module.exports = router;
