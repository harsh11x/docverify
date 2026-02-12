const ethereumService = require('../services/ethereumService');
const logger = require('../utils/logger');
const db = require('../database/models');

class OrganizationController {
    /**
     * Register new organization
     * POST /api/organizations/register
     */
    async registerOrganization(req, res) {
        try {
            const { orgId, orgType, walletAddress, name, metadata } = req.body;

            // Validate required fields
            if (!orgId || orgType === undefined || !walletAddress || !name) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: orgId, orgType, walletAddress, name'
                });
            }

            logger.info(`Registering organization: ${orgId}`);

            // Register on Ethereum
            const result = await ethereumService.registerOrganization(
                orgId,
                parseInt(orgType),
                walletAddress,
                name,
                metadata || ''
            );

            // Store in database
            await db.Organization.create({
                orgId,
                orgType: parseInt(orgType),
                walletAddress,
                name,
                metadata,
                registrationTimestamp: Date.now(),
                isActive: true
            });

            res.status(201).json({
                success: true,
                data: {
                    orgId,
                    transactionHash: result.transactionHash,
                    blockNumber: result.blockNumber
                }
            });

        } catch (error) {
            logger.error('Organization registration failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get organization details
     * GET /api/organizations/:id
     */
    async getOrganization(req, res) {
        try {
            const { id } = req.params;

            // Try database first
            let org = await db.Organization.findOne({ where: { orgId: id } });

            // If not in database, fetch from Ethereum
            if (!org) {
                const ethOrg = await ethereumService.getOrganization(id);
                org = ethOrg;
            }

            res.status(200).json({
                success: true,
                data: org
            });

        } catch (error) {
            logger.error('Failed to get organization:', error);
            res.status(404).json({
                success: false,
                error: 'Organization not found'
            });
        }
    }

    /**
     * Get all organizations
     * GET /api/organizations
     */
    async getAllOrganizations(req, res) {
        try {
            const { active, limit = 50, offset = 0 } = req.query;

            const where = {};
            if (active !== undefined) {
                where.isActive = active === 'true';
            }

            const organizations = await db.Organization.findAll({
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['createdAt', 'DESC']]
            });

            const total = await db.Organization.count({ where });

            res.status(200).json({
                success: true,
                data: {
                    organizations,
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            });

        } catch (error) {
            logger.error('Failed to get organizations:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Deactivate organization
     * PUT /api/organizations/:id/deactivate
     */
    async deactivateOrganization(req, res) {
        try {
            const { id } = req.params;

            logger.info(`Deactivating organization: ${id}`);

            // Deactivate on Ethereum
            const result = await ethereumService.deactivateOrganization(id);

            // Update database
            await db.Organization.update(
                { isActive: false },
                { where: { orgId: id } }
            );

            res.status(200).json({
                success: true,
                data: {
                    orgId: id,
                    transactionHash: result.transactionHash,
                    blockNumber: result.blockNumber
                }
            });

        } catch (error) {
            logger.error('Organization deactivation failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get organization statistics
     * GET /api/organizations/:id/stats
     */
    async getOrganizationStats(req, res) {
        try {
            const { id } = req.params;

            const totalVerifications = await db.Verification.count({
                where: { organizationId: id }
            });

            const recentVerifications = await db.Verification.findAll({
                where: { organizationId: id },
                limit: 10,
                order: [['verifiedAt', 'DESC']]
            });

            res.status(200).json({
                success: true,
                data: {
                    organizationId: id,
                    totalVerifications,
                    recentVerifications
                }
            });

        } catch (error) {
            logger.error('Failed to get organization stats:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new OrganizationController();
