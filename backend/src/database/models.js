const { Sequelize, DataTypes } = require('sequelize');
const logger = require('../utils/logger');

// Initialize Sequelize
const sequelize = new Sequelize(
    process.env.DB_NAME || 'docverify',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: (msg) => logger.debug(msg),
        pool: {
            min: parseInt(process.env.DB_POOL_MIN) || 2,
            max: parseInt(process.env.DB_POOL_MAX) || 10,
            acquire: 30000,
            idle: 10000
        }
    }
);

// Define models
const Organization = sequelize.define('Organization', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    orgId: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: false,
        field: 'org_id'
    },
    orgType: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'org_type'
    },
    walletAddress: {
        type: DataTypes.STRING(42),
        unique: true,
        allowNull: false,
        field: 'wallet_address'
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    metadata: {
        type: DataTypes.TEXT
    },
    registrationTimestamp: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: 'registration_timestamp'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    }
}, {
    tableName: 'organizations',
    underscored: true
});

const Document = sequelize.define('Document', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    documentHash: {
        type: DataTypes.STRING(66),
        unique: true,
        allowNull: false,
        field: 'document_hash'
    },
    ipfsCid: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'ipfs_cid'
    },
    fileSize: {
        type: DataTypes.BIGINT,
        field: 'file_size'
    },
    fileType: {
        type: DataTypes.STRING(100),
        field: 'file_type'
    },
    uploadedBy: {
        type: DataTypes.STRING(255),
        field: 'uploaded_by'
    },
    metadata: {
        type: DataTypes.JSONB
    }
}, {
    tableName: 'documents',
    underscored: true
});

const Verification = sequelize.define('Verification', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    documentHash: {
        type: DataTypes.STRING(66),
        allowNull: false,
        field: 'document_hash'
    },
    ipfsCid: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'ipfs_cid'
    },
    organizationId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'organization_id'
    },
    fabricProofHash: {
        type: DataTypes.STRING(66),
        allowNull: false,
        field: 'fabric_proof_hash'
    },
    ethereumTxHash: {
        type: DataTypes.STRING(66),
        allowNull: false,
        field: 'ethereum_tx_hash'
    },
    blockNumber: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: 'block_number'
    },
    verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    verifiedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'verified_at'
    },
    metadata: {
        type: DataTypes.JSONB
    },
    fabricCertificates: {
        type: DataTypes.JSONB,
        field: 'fabric_certificates'
    }
}, {
    tableName: 'verifications',
    underscored: true,
    timestamps: false
});

const Event = sequelize.define('Event', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    eventType: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'event_type'
    },
    eventName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'event_name'
    },
    source: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    transactionHash: {
        type: DataTypes.STRING(66),
        field: 'transaction_hash'
    },
    blockNumber: {
        type: DataTypes.BIGINT,
        field: 'block_number'
    },
    payload: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    processed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    processedAt: {
        type: DataTypes.DATE,
        field: 'processed_at'
    }
}, {
    tableName: 'events',
    underscored: true,
    updatedAt: false
});

const SyncStatus = sequelize.define('SyncStatus', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    source: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    lastSyncedBlock: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: 'last_synced_block'
    },
    lastSyncedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'last_synced_at'
    },
    status: {
        type: DataTypes.STRING(50),
        defaultValue: 'active'
    },
    errorMessage: {
        type: DataTypes.TEXT,
        field: 'error_message'
    }
}, {
    tableName: 'sync_status',
    underscored: true
});

// Define associations
Verification.belongsTo(Organization, { foreignKey: 'organizationId', targetKey: 'orgId' });
Organization.hasMany(Verification, { foreignKey: 'organizationId', sourceKey: 'orgId' });

// Test connection and sync
async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        logger.info('Database connection established successfully');

        // Sync models (use { force: false } in production)
        await sequelize.sync({ alter: false });
        logger.info('Database models synchronized');

        return true;
    } catch (error) {
        logger.error('Unable to connect to database:', error);
        throw error;
    }
}

module.exports = {
    sequelize,
    Organization,
    Document,
    Verification,
    Event,
    SyncStatus,
    initializeDatabase
};
