const { ethers } = require('ethers');
const logger = require('../utils/logger');
const db = require('../database/models');

class AuthMiddleware {
    /**
     * Authenticate request via wallet signature
     */
    async authenticate(req, res, next) {
        try {
            const { signature, message, address } = req.headers;

            if (!signature || !message || !address) {
                return res.status(401).json({
                    success: false,
                    error: 'Missing authentication headers: signature, message, address'
                });
            }

            // Verify signature
            const recoveredAddress = ethers.verifyMessage(message, signature);

            if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid signature'
                });
            }

            // Check nonce to prevent replay attacks
            const isValidNonce = await this.validateNonce(address, message);
            if (!isValidNonce) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid or expired nonce'
                });
            }

            // Attach user info to request
            req.user = {
                address: recoveredAddress.toLowerCase()
            };

            // Check if address belongs to an organization
            const org = await db.Organization.findOne({
                where: { walletAddress: recoveredAddress.toLowerCase() }
            });

            if (org) {
                // Check if organization is banned
                if (org.status === 'banned' && org.banExpiresAt && new Date(org.banExpiresAt) > new Date()) {
                    return res.status(403).json({
                        success: false,
                        error: `Organization is banned until ${new Date(org.banExpiresAt).toLocaleString()}`
                    });
                }

                req.user.organizationId = org.orgId;
                req.user.isOrganization = true;
            }

            next();

        } catch (error) {
            logger.error('Authentication failed:', error);
            res.status(401).json({
                success: false,
                error: 'Authentication failed'
            });
        }
    }

    /**
     * Validate nonce for replay protection
     */
    async validateNonce(address, message) {
        try {
            // Extract nonce from message (format: "Sign this message with nonce: {nonce}")
            const nonceMatch = message.match(/nonce:\s*(\w+)/i);
            if (!nonceMatch) {
                return false;
            }

            const nonce = nonceMatch[1];

            // Check if nonce exists and is not expired
            const nonceRecord = await db.sequelize.query(
                'SELECT * FROM nonces WHERE wallet_address = :address AND nonce = :nonce AND expires_at > NOW() AND used = false',
                {
                    replacements: { address: address.toLowerCase(), nonce },
                    type: db.sequelize.QueryTypes.SELECT
                }
            );

            if (nonceRecord.length === 0) {
                return false;
            }

            // Mark nonce as used
            await db.sequelize.query(
                'UPDATE nonces SET used = true WHERE wallet_address = :address AND nonce = :nonce',
                {
                    replacements: { address: address.toLowerCase(), nonce }
                }
            );

            return true;

        } catch (error) {
            logger.error('Nonce validation failed:', error);
            return false;
        }
    }

    /**
     * Generate nonce for authentication
     */
    async generateNonce(req, res) {
        try {
            const { address } = req.body;

            if (!address) {
                return res.status(400).json({
                    success: false,
                    error: 'Wallet address is required'
                });
            }

            // Generate random nonce
            const nonce = ethers.hexlify(ethers.randomBytes(32));
            const expiresAt = new Date(Date.now() + parseInt(process.env.NONCE_EXPIRATION || 300000));

            // Store nonce
            await db.sequelize.query(
                'INSERT INTO nonces (wallet_address, nonce, expires_at) VALUES (:address, :nonce, :expiresAt)',
                {
                    replacements: {
                        address: address.toLowerCase(),
                        nonce,
                        expiresAt
                    }
                }
            );

            res.status(200).json({
                success: true,
                data: {
                    nonce,
                    message: `Sign this message with nonce: ${nonce}`,
                    expiresAt
                }
            });

        } catch (error) {
            logger.error('Nonce generation failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate nonce'
            });
        }
    }

    /**
     * Optional authentication (doesn't fail if not authenticated)
     */
    async optionalAuth(req, res, next) {
        try {
            await this.authenticate(req, res, () => { });
        } catch (error) {
            // Continue without authentication
        }
        next();
    }
}

module.exports = new AuthMiddleware();
