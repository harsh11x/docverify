require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const logger = require('./utils/logger');
const db = require('./database/models');

// Import services
const ipfsService = require('./services/ipfsService');
const ethereumService = require('./services/ethereumService');
const fabricService = require('./services/fabricService');

// Import event listeners
const ethereumListener = require('./events/ethereumListener');
const fabricListener = require('./events/fabricListener');

// Import routes
const documentRoutes = require('./routes/documentRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const authMiddleware = require('./middleware/authMiddleware');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
    cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
        methods: ['GET', 'POST']
    }
});

// Make io available to other modules
module.exports.io = io;

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', {
    stream: {
        write: (message) => logger.http(message.trim())
    }
}));

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                database: false,
                ipfs: false,
                ethereum: false,
                fabric: false
            }
        };

        // Check database
        try {
            await db.sequelize.authenticate();
            health.services.database = true;
        } catch (error) {
            logger.error('Database health check failed:', error);
        }

        // Check IPFS
        health.services.ipfs = await ipfsService.checkConnection();

        // Check Ethereum
        try {
            await ethereumService.getBalance();
            health.services.ethereum = true;
        } catch (error) {
            logger.error('Ethereum health check failed:', error);
        }

        // Check Fabric
        health.services.fabric = fabricService.isConnected();

        const allHealthy = Object.values(health.services).every(s => s === true);
        health.status = allHealthy ? 'healthy' : 'degraded';

        res.status(allHealthy ? 200 : 503).json(health);

    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

// Authentication nonce endpoint
app.post('/api/auth/nonce', authMiddleware.generateNonce.bind(authMiddleware));

// API Routes
app.use('/api/documents', documentRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/verify', verificationRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message
    });
});

// WebSocket connection handling
io.on('connection', (socket) => {
    logger.info(`WebSocket client connected: ${socket.id}`);

    socket.on('subscribe', (channel) => {
        socket.join(channel);
        logger.info(`Client ${socket.id} subscribed to ${channel}`);
    });

    socket.on('unsubscribe', (channel) => {
        socket.leave(channel);
        logger.info(`Client ${socket.id} unsubscribed from ${channel}`);
    });

    socket.on('disconnect', () => {
        logger.info(`WebSocket client disconnected: ${socket.id}`);
    });
});

// Initialize services and start server
async function initialize() {
    try {
        logger.info('Initializing backend services...');

        // Initialize database
        await db.initializeDatabase();
        logger.info('✓ Database initialized');

        // Initialize IPFS
        await ipfsService.initialize();
        logger.info('✓ IPFS initialized');

        // Initialize Ethereum
        await ethereumService.initialize();
        logger.info('✓ Ethereum initialized');

        // Initialize Fabric
        await fabricService.initialize();
        logger.info('✓ Fabric initialized');

        // Start event listeners
        await ethereumListener.start();
        logger.info('✓ Ethereum event listener started');

        await fabricListener.start();
        logger.info('✓ Fabric event listener started');

        logger.info('All services initialized successfully');

    } catch (error) {
        logger.error('Failed to initialize services:', error);
        throw error;
    }
}

// Start server
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

initialize()
    .then(() => {
        server.listen(PORT, HOST, () => {
            logger.info(`===========================================`);
            logger.info(`Server running on ${HOST}:${PORT}`);
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`WebSocket enabled on port ${PORT}`);
            logger.info(`===========================================`);
        });
    })
    .catch((error) => {
        logger.error('Failed to start server:', error);
        process.exit(1);
    });

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');

    ethereumListener.stop();
    await fabricListener.stop();
    await fabricService.disconnect();
    await db.sequelize.close();

    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');

    ethereumListener.stop();
    await fabricListener.stop();
    await fabricService.disconnect();
    await db.sequelize.close();

    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

module.exports = { app, server, io };
