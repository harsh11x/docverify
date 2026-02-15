const express = require('express');
const router = express.Router();
const governanceController = require('../controllers/governanceController');
const authMiddleware = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');
const securityMiddleware = require('../middleware/securityMiddleware');

// Apply security headers
router.use(securityMiddleware.addSecurityHeaders);

// Create proposal (requires authentication)
router.post(
    '/proposals',
    authMiddleware.authenticate.bind(authMiddleware),
    rateLimiter.organizationRegistration,
    governanceController.createProposal.bind(governanceController)
);

// Get all proposals
router.get(
    '/proposals',
    authMiddleware.optionalAuth.bind(authMiddleware),
    governanceController.getProposals.bind(governanceController)
);

// Get single proposal
router.get(
    '/proposals/:proposalId',
    governanceController.getProposal.bind(governanceController)
);

// Cast vote
router.post(
    '/proposals/:proposalId/vote',
    authMiddleware.authenticate.bind(authMiddleware),
    governanceController.castVote.bind(governanceController)
);

// Get proposal votes
router.get(
    '/proposals/:proposalId/votes',
    governanceController.getProposalVotes.bind(governanceController)
);

// Admin: Finalize expired proposals
router.post(
    '/finalize-expired',
    authMiddleware.authenticate.bind(authMiddleware),
    governanceController.finalizeExpired.bind(governanceController)
);

// Register organization (creates proposal for approval)
router.post(
    '/organizations/register',
    rateLimiter.organizationRegistration,
    securityMiddleware.sanitizeRequest.bind(securityMiddleware),
    governanceController.registerOrganization.bind(governanceController)
);

// Get governance statistics
router.get(
    '/stats',
    governanceController.getStats.bind(governanceController)
);

module.exports = router;
