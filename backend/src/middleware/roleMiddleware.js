const ethereumService = require('../services/ethereumService');
const logger = require('../utils/logger');

class RoleMiddleware {
    /**
     * Require admin role
     */
    async requireAdmin(req, res, next) {
        try {
            if (!req.user || !req.user.address) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Check if user has admin role on smart contract
            const contract = ethereumService.contract;
            const ADMIN_ROLE = await contract.ADMIN_ROLE();
            const hasRole = await contract.hasRole(ADMIN_ROLE, req.user.address);

            if (!hasRole) {
                return res.status(403).json({
                    success: false,
                    error: 'Admin role required'
                });
            }

            next();

        } catch (error) {
            logger.error('Admin role check failed:', error);
            res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }
    }

    /**
     * Require organization role
     */
    async requireOrganization(req, res, next) {
        try {
            if (!req.user || !req.user.address) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Check if user has organization role
            const contract = ethereumService.contract;
            const ORG_ROLE = await contract.ORGANIZATION_ROLE();
            const hasRole = await contract.hasRole(ORG_ROLE, req.user.address);

            if (!hasRole) {
                return res.status(403).json({
                    success: false,
                    error: 'Organization role required'
                });
            }

            next();

        } catch (error) {
            logger.error('Organization role check failed:', error);
            res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }
    }

    /**
     * Require specific organization
     */
    requireOwnOrganization(req, res, next) {
        try {
            if (!req.user || !req.user.organizationId) {
                return res.status(403).json({
                    success: false,
                    error: 'Organization membership required'
                });
            }

            const { organizationId } = req.body || req.params;

            if (req.user.organizationId !== organizationId) {
                return res.status(403).json({
                    success: false,
                    error: 'Can only perform actions for your own organization'
                });
            }

            next();

        } catch (error) {
            logger.error('Organization ownership check failed:', error);
            res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }
    }
}

module.exports = new RoleMiddleware();
