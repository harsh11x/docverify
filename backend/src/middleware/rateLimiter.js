const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Public verification rate limiter
const publicVerification = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        success: false,
        error: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            error: 'Too many requests, please try again later'
        });
    }
});

// Bulk verification rate limiter (stricter)
const bulkVerification = rateLimit({
    windowMs: 60000, // 1 minute
    max: 10, // Only 10 bulk requests per minute
    message: {
        success: false,
        error: 'Too many bulk verification requests'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Document upload rate limiter
const documentUpload = rateLimit({
    windowMs: 60000,
    max: 50,
    message: {
        success: false,
        error: 'Too many upload requests'
    }
});

// Organization registration rate limiter
const organizationRegistration = rateLimit({
    windowMs: 3600000, // 1 hour
    max: 5, // Only 5 registrations per hour
    message: {
        success: false,
        error: 'Too many organization registration requests'
    }
});

module.exports = {
    publicVerification,
    bulkVerification,
    documentUpload,
    organizationRegistration
};
