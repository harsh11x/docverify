const crypto = require('crypto');
const { ethers } = require('ethers');
const logger = require('../utils/logger');
const db = require('../database/models');

class SecurityMiddleware {
    /**
     * Validate MSP identity for Fabric operations
     */
    async validateMSPIdentity(req, res, next) {
        try {
            const mspId = req.headers['x-msp-id'];
            const mspCertificate = req.headers['x-msp-certificate'];
            const mspSignature = req.headers['x-msp-signature'];

            if (!mspId || !mspCertificate) {
                return res.status(401).json({
                    success: false,
                    error: 'MSP identity headers required'
                });
            }

            // Verify MSP is registered
            const org = await db.Organization.findOne({
                where: { mspId, isActive: true }
            });

            if (!org) {
                return res.status(401).json({
                    success: false,
                    error: 'MSP identity not recognized or organization inactive'
                });
            }

            // Verify certificate matches stored identity
            if (org.fabricIdentityCert) {
                const storedCertHash = crypto.createHash('sha256')
                    .update(org.fabricIdentityCert)
                    .digest('hex');
                const providedCertHash = crypto.createHash('sha256')
                    .update(mspCertificate)
                    .digest('hex');

                if (storedCertHash !== providedCertHash) {
                    logger.warn(`MSP certificate mismatch for ${mspId}`);
                    return res.status(401).json({
                        success: false,
                        error: 'MSP certificate mismatch'
                    });
                }
            }

            // Verify signature if provided
            if (mspSignature) {
                const isValidSignature = await this.verifyMSPSignature(
                    req.body,
                    mspSignature,
                    mspCertificate
                );

                if (!isValidSignature) {
                    return res.status(401).json({
                        success: false,
                        error: 'Invalid MSP signature'
                    });
                }
            }

            // Attach MSP identity to request
            req.mspIdentity = {
                mspId,
                organizationId: org.orgId,
                certificate: mspCertificate
            };

            next();

        } catch (error) {
            logger.error('MSP validation failed:', error);
            res.status(500).json({
                success: false,
                error: 'MSP validation failed'
            });
        }
    }

    /**
     * Verify MSP signature using certificate
     */
    async verifyMSPSignature(data, signature, certificate) {
        try {
            const crypto = require('crypto');
            const message = typeof data === 'string' ? data : JSON.stringify(data);
            
            const verifier = crypto.createVerify('SHA256');
            verifier.update(message);
            
            return verifier.verify(certificate, Buffer.from(signature, 'base64'));
        } catch (error) {
            logger.error('MSP signature verification failed:', error);
            return false;
        }
    }

    /**
     * Validate CID integrity for IPFS operations
     */
    async validateCIDIntegrity(req, res, next) {
        try {
            const { ipfsCID, documentHash } = req.body;

            if (!ipfsCID || !documentHash) {
                return next(); // Skip if not applicable
            }

            // Validate CID format
            const cidV0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
            const cidV1Regex = /^b[A-Za-z2-7]{58}$/;

            if (!cidV0Regex.test(ipfsCID) && !cidV1Regex.test(ipfsCID)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid IPFS CID format'
                });
            }

            // Optionally verify content hash matches
            if (process.env.VERIFY_CID_CONTENT === 'true') {
                const ipfsService = require('../services/ipfsService');
                
                try {
                    const fileBuffer = await ipfsService.getFile(ipfsCID);
                    const computedHash = crypto.createHash('sha256')
                        .update(fileBuffer)
                        .digest('hex');

                    if (computedHash !== documentHash.replace('0x', '')) {
                        return res.status(400).json({
                            success: false,
                            error: 'CID content hash mismatch'
                        });
                    }
                } catch (ipfsError) {
                    logger.warn('CID content verification skipped:', ipfsError.message);
                }
            }

            next();

        } catch (error) {
            logger.error('CID integrity validation failed:', error);
            res.status(500).json({
                success: false,
                error: 'CID validation failed'
            });
        }
    }

    /**
     * Validate event signature for cross-chain operations
     */
    async validateEventSignature(req, res, next) {
        try {
            const { eventData, eventSignature, signerAddress } = req.body;

            if (!eventData || !eventSignature || !signerAddress) {
                return next(); // Skip if not event-related request
            }

            // Reconstruct event message
            const message = typeof eventData === 'string' 
                ? eventData 
                : JSON.stringify(eventData);

            // Verify signature
            const recoveredAddress = ethers.verifyMessage(message, eventSignature);

            if (recoveredAddress.toLowerCase() !== signerAddress.toLowerCase()) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid event signature'
                });
            }

            // Verify signer is authorized organization
            const org = await db.Organization.findOne({
                where: { walletAddress: recoveredAddress.toLowerCase(), isActive: true }
            });

            if (!org) {
                return res.status(401).json({
                    success: false,
                    error: 'Signer not authorized'
                });
            }

            req.verifiedEvent = {
                data: eventData,
                signerAddress: recoveredAddress,
                organizationId: org.orgId
            };

            next();

        } catch (error) {
            logger.error('Event signature validation failed:', error);
            res.status(500).json({
                success: false,
                error: 'Event signature validation failed'
            });
        }
    }

    /**
     * Consensus-based validation for critical operations
     */
    async requireConsensusValidation(req, res, next) {
        try {
            const { signatures, threshold } = req.body;

            if (!signatures || !Array.isArray(signatures)) {
                return res.status(400).json({
                    success: false,
                    error: 'Multiple signatures required for this operation'
                });
            }

            const requiredThreshold = threshold || parseInt(process.env.CONSENSUS_THRESHOLD) || 2;

            if (signatures.length < requiredThreshold) {
                return res.status(400).json({
                    success: false,
                    error: `At least ${requiredThreshold} signatures required`
                });
            }

            // Verify each signature
            const verifiedSigners = new Set();
            const message = req.body.message || JSON.stringify(req.body.data);

            for (const sig of signatures) {
                try {
                    const recoveredAddress = ethers.verifyMessage(message, sig.signature);
                    
                    // Check if signer is active organization
                    const org = await db.Organization.findOne({
                        where: { walletAddress: recoveredAddress.toLowerCase(), isActive: true }
                    });

                    if (org) {
                        verifiedSigners.add(org.orgId);
                    }
                } catch (sigError) {
                    logger.warn('Invalid signature in consensus:', sigError.message);
                }
            }

            if (verifiedSigners.size < requiredThreshold) {
                return res.status(401).json({
                    success: false,
                    error: `Only ${verifiedSigners.size} valid signatures, need ${requiredThreshold}`
                });
            }

            req.consensusSigners = Array.from(verifiedSigners);
            next();

        } catch (error) {
            logger.error('Consensus validation failed:', error);
            res.status(500).json({
                success: false,
                error: 'Consensus validation failed'
            });
        }
    }

    /**
     * Request sanitization middleware
     */
    sanitizeRequest(req, res, next) {
        try {
            // Sanitize body
            if (req.body) {
                req.body = this.sanitizeObject(req.body);
            }

            // Sanitize query params
            if (req.query) {
                req.query = this.sanitizeObject(req.query);
            }

            // Sanitize params
            if (req.params) {
                req.params = this.sanitizeObject(req.params);
            }

            next();
        } catch (error) {
            logger.error('Request sanitization failed:', error);
            next();
        }
    }

    /**
     * Sanitize object recursively
     */
    sanitizeObject(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return this.sanitizeValue(obj);
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item));
        }

        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            // Skip dangerous keys
            if (key.startsWith('$') || key.startsWith('__')) {
                continue;
            }
            sanitized[key] = this.sanitizeObject(value);
        }

        return sanitized;
    }

    /**
     * Sanitize individual value
     */
    sanitizeValue(value) {
        if (typeof value === 'string') {
            // Remove potential XSS vectors
            return value
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+=/gi, '');
        }
        return value;
    }

    /**
     * Log security audit event
     */
    async logSecurityEvent(req, eventType, details) {
        try {
            await db.sequelize.query(
                `INSERT INTO audit_log (action, actor_type, actor_id, target_type, target_id, details, ip_address, user_agent)
                 VALUES (:action, :actorType, :actorId, :targetType, :targetId, :details, :ip, :userAgent)`,
                {
                    replacements: {
                        action: eventType,
                        actorType: req.user ? 'user' : 'anonymous',
                        actorId: req.user?.address || req.ip,
                        targetType: 'endpoint',
                        targetId: req.originalUrl,
                        details: JSON.stringify(details),
                        ip: req.ip,
                        userAgent: req.get('User-Agent')
                    }
                }
            );
        } catch (error) {
            logger.error('Failed to log security event:', error);
        }
    }

    /**
     * Check for suspicious activity patterns
     */
    async detectSuspiciousActivity(req, res, next) {
        try {
            const ip = req.ip;
            const userAgent = req.get('User-Agent');

            // Check rate limit violations
            const [violations] = await db.sequelize.query(
                `SELECT violation_count, blocked_until FROM rate_limit_violations 
                 WHERE ip_address = :ip AND blocked_until > NOW()`,
                { replacements: { ip }, type: db.sequelize.QueryTypes.SELECT }
            );

            if (violations && violations.blocked_until) {
                return res.status(429).json({
                    success: false,
                    error: 'IP temporarily blocked due to suspicious activity',
                    blockedUntil: violations.blocked_until
                });
            }

            // Check for unusual patterns
            const [recentRequests] = await db.sequelize.query(
                `SELECT COUNT(*) as count FROM audit_log 
                 WHERE ip_address = :ip AND created_at > NOW() - INTERVAL '1 minute'`,
                { replacements: { ip }, type: db.sequelize.QueryTypes.SELECT }
            );

            if (parseInt(recentRequests?.count || 0) > 100) {
                // Log suspicious activity
                await this.logSecurityEvent(req, 'suspicious_activity', {
                    reason: 'High request volume',
                    requestCount: recentRequests.count
                });

                // Record violation
                await db.sequelize.query(
                    `INSERT INTO rate_limit_violations (ip_address, endpoint, violation_count, blocked_until)
                     VALUES (:ip, :endpoint, 1, NOW() + INTERVAL '15 minutes')
                     ON CONFLICT (ip_address, endpoint) 
                     DO UPDATE SET violation_count = rate_limit_violations.violation_count + 1,
                                   last_violation_at = NOW(),
                                   blocked_until = NOW() + INTERVAL '15 minutes'`,
                    { replacements: { ip, endpoint: req.originalUrl } }
                );
            }

            next();

        } catch (error) {
            logger.error('Suspicious activity detection failed:', error);
            next();
        }
    }

    /**
     * Verify request timestamp to prevent replay attacks
     */
    verifyRequestTimestamp(req, res, next) {
        try {
            const timestamp = req.headers['x-request-timestamp'];

            if (!timestamp) {
                return next(); // Skip if no timestamp provided
            }

            const requestTime = parseInt(timestamp);
            const now = Date.now();
            const maxAge = parseInt(process.env.REQUEST_MAX_AGE) || 300000; // 5 minutes

            if (Math.abs(now - requestTime) > maxAge) {
                return res.status(400).json({
                    success: false,
                    error: 'Request timestamp expired'
                });
            }

            next();

        } catch (error) {
            logger.error('Timestamp verification failed:', error);
            next();
        }
    }

    /**
     * Add security headers
     */
    addSecurityHeaders(req, res, next) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        res.setHeader('Content-Security-Policy', "default-src 'self'");
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        next();
    }
}

module.exports = new SecurityMiddleware();
