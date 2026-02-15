const governanceService = require('../services/governanceService');
const logger = require('../utils/logger');
const db = require('../database/models');

class GovernanceController {
    /**
     * Create a new governance proposal
     * POST /api/governance/proposals
     */
    async createProposal(req, res) {
        try {
            const { type, title, description, targetOrgId, payload } = req.body;

            if (!req.user?.organizationId) {
                return res.status(403).json({
                    success: false,
                    error: 'Only organizations can create proposals'
                });
            }

            if (!type || !title) {
                return res.status(400).json({
                    success: false,
                    error: 'Proposal type and title are required'
                });
            }

            const proposal = await governanceService.createProposal(
                { type, title, description, targetOrgId, payload },
                req.user.organizationId
            );

            res.status(201).json({
                success: true,
                data: proposal
            });

        } catch (error) {
            logger.error('Failed to create proposal:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get all proposals
     * GET /api/governance/proposals
     */
    async getProposals(req, res) {
        try {
            const { status, type, limit, offset } = req.query;

            const proposals = await governanceService.getProposals({
                status,
                type,
                limit: parseInt(limit) || 50,
                offset: parseInt(offset) || 0
            });

            res.status(200).json({
                success: true,
                data: proposals,
                pagination: {
                    limit: parseInt(limit) || 50,
                    offset: parseInt(offset) || 0
                }
            });

        } catch (error) {
            logger.error('Failed to get proposals:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get single proposal with votes
     * GET /api/governance/proposals/:proposalId
     */
    async getProposal(req, res) {
        try {
            const { proposalId } = req.params;

            const proposal = await governanceService.getProposal(proposalId);

            if (!proposal) {
                return res.status(404).json({
                    success: false,
                    error: 'Proposal not found'
                });
            }

            res.status(200).json({
                success: true,
                data: proposal
            });

        } catch (error) {
            logger.error('Failed to get proposal:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Cast vote on proposal
     * POST /api/governance/proposals/:proposalId/vote
     */
    async castVote(req, res) {
        try {
            const { proposalId } = req.params;
            const { vote, signature } = req.body;

            if (!req.user?.organizationId) {
                return res.status(403).json({
                    success: false,
                    error: 'Only organizations can vote'
                });
            }

            if (typeof vote !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    error: 'Vote must be a boolean (true for yes, false for no)'
                });
            }

            const result = await governanceService.castVote(
                proposalId,
                req.user.organizationId,
                vote,
                signature
            );

            res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {
            logger.error('Failed to cast vote:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get proposal votes
     * GET /api/governance/proposals/:proposalId/votes
     */
    async getProposalVotes(req, res) {
        try {
            const { proposalId } = req.params;

            const votes = await db.sequelize.query(
                `SELECT gv.*, o.name as org_name 
                 FROM governance_votes gv 
                 JOIN organizations o ON gv.voter_org_id = o.org_id 
                 WHERE gv.proposal_id = :proposalId
                 ORDER BY gv.voted_at DESC`,
                { replacements: { proposalId }, type: db.sequelize.QueryTypes.SELECT }
            );

            res.status(200).json({
                success: true,
                data: votes
            });

        } catch (error) {
            logger.error('Failed to get votes:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Finalize expired proposals
     * POST /api/governance/finalize-expired
     */
    async finalizeExpired(req, res) {
        try {
            // Check if user is admin
            if (!req.user?.organizationId) {
                return res.status(403).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            const count = await governanceService.finalizeExpiredProposals();

            res.status(200).json({
                success: true,
                data: {
                    finalized: count
                }
            });

        } catch (error) {
            logger.error('Failed to finalize proposals:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Register organization (creates pending record and proposal)
     * POST /api/governance/organizations/register
     */
    async registerOrganization(req, res) {
        try {
            const { orgId, name, orgType, walletAddress, metadata } = req.body;

            if (!orgId || !name || !walletAddress) {
                return res.status(400).json({
                    success: false,
                    error: 'Organization ID, name, and wallet address are required'
                });
            }

            // Check if organization already exists
            const existing = await db.Organization.findOne({
                where: { 
                    [db.sequelize.Op.or]: [
                        { orgId },
                        { walletAddress: walletAddress.toLowerCase() }
                    ]
                }
            });

            if (existing) {
                return res.status(409).json({
                    success: false,
                    error: 'Organization ID or wallet address already registered'
                });
            }

            const org = await governanceService.registerOrganizationRequest(
                { orgId, name, orgType: orgType || 0, metadata },
                walletAddress
            );

            res.status(201).json({
                success: true,
                data: {
                    orgId: org.orgId,
                    status: org.status,
                    message: org.status === 'active' 
                        ? 'Organization registered and activated' 
                        : 'Organization registered, pending governance approval'
                }
            });

        } catch (error) {
            logger.error('Failed to register organization:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get governance statistics
     * GET /api/governance/stats
     */
    async getStats(req, res) {
        try {
            const [proposalStats] = await db.sequelize.query(
                `SELECT 
                    status,
                    COUNT(*) as count
                 FROM governance_proposals
                 GROUP BY status`,
                { type: db.sequelize.QueryTypes.SELECT }
            );

            const [orgStats] = await db.sequelize.query(
                `SELECT 
                    status,
                    COUNT(*) as count
                 FROM organizations
                 GROUP BY status`,
                { type: db.sequelize.QueryTypes.SELECT }
            );

            const [recentActivity] = await db.sequelize.query(
                `SELECT 
                    COUNT(*) as proposals_24h
                 FROM governance_proposals
                 WHERE created_at > NOW() - INTERVAL '24 hours'`,
                { type: db.sequelize.QueryTypes.SELECT }
            );

            const [totalVotes] = await db.sequelize.query(
                `SELECT COUNT(*) as total FROM governance_votes`,
                { type: db.sequelize.QueryTypes.SELECT }
            );

            res.status(200).json({
                success: true,
                data: {
                    proposals: proposalStats,
                    organizations: orgStats,
                    recentProposals24h: parseInt(recentActivity?.proposals_24h || 0),
                    totalVotes: parseInt(totalVotes?.total || 0)
                }
            });

        } catch (error) {
            logger.error('Failed to get governance stats:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new GovernanceController();
