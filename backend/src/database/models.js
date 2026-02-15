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
    },
    status: {
        type: DataTypes.STRING(50),
        defaultValue: 'pending'
    },
    banExpiresAt: {
        type: DataTypes.DATE,
        field: 'ban_expires_at'
    },
    mspId: {
        type: DataTypes.STRING(255),
        field: 'msp_id'
    },
    fabricIdentityCert: {
        type: DataTypes.TEXT,
        field: 'fabric_identity_cert'
    },
    governanceWeight: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        field: 'governance_weight'
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
        field: 'ethereum_tx_hash'
    },
    blockNumber: {
        type: DataTypes.BIGINT,
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
    },
    certificateId: {
        type: DataTypes.STRING(255),
        unique: true,
        field: 'certificate_id'
    },
    crossChainValidated: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'cross_chain_validated'
    },
    validationTimestamp: {
        type: DataTypes.DATE,
        field: 'validation_timestamp'
    }
}, {
    tableName: 'verifications',
    underscored: true,
    timestamps: false
});

const GovernanceProposal = sequelize.define('GovernanceProposal', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    proposalId: {
        type: DataTypes.STRING(66),
        unique: true,
        allowNull: false,
        field: 'proposal_id'
    },
    proposalType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'proposal_type'
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    proposerOrgId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'proposer_org_id'
    },
    targetOrgId: {
        type: DataTypes.STRING(255),
        field: 'target_org_id'
    },
    payload: {
        type: DataTypes.JSONB
    },
    status: {
        type: DataTypes.STRING(50),
        defaultValue: 'pending'
    },
    votesFor: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'votes_for'
    },
    votesAgainst: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'votes_against'
    },
    totalWeight: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'total_weight'
    },
    quorumRequired: {
        type: DataTypes.INTEGER,
        defaultValue: 51,
        field: 'quorum_required'
    },
    votingDeadline: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'voting_deadline'
    },
    executedAt: {
        type: DataTypes.DATE,
        field: 'executed_at'
    },
    ethereumTxHash: {
        type: DataTypes.STRING(66),
        field: 'ethereum_tx_hash'
    }
}, {
    tableName: 'governance_proposals',
    underscored: true
});

const GovernanceVote = sequelize.define('GovernanceVote', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    proposalId: {
        type: DataTypes.STRING(66),
        allowNull: false,
        field: 'proposal_id'
    },
    voterOrgId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'voter_org_id'
    },
    vote: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    weight: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    signature: {
        type: DataTypes.STRING(132)
    },
    votedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'voted_at'
    }
}, {
    tableName: 'governance_votes',
    underscored: true,
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['proposal_id', 'voter_org_id']
        }
    ]
});

const BatchAnchorQueue = sequelize.define('BatchAnchorQueue', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    certificateId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'certificate_id'
    },
    documentHash: {
        type: DataTypes.STRING(66),
        allowNull: false,
        field: 'document_hash'
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
    status: {
        type: DataTypes.STRING(50),
        defaultValue: 'pending'
    },
    batchId: {
        type: DataTypes.STRING(66),
        field: 'batch_id'
    },
    queuedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'queued_at'
    },
    processedAt: {
        type: DataTypes.DATE,
        field: 'processed_at'
    },
    ethereumTxHash: {
        type: DataTypes.STRING(66),
        field: 'ethereum_tx_hash'
    },
    errorMessage: {
        type: DataTypes.TEXT,
        field: 'error_message'
    }
}, {
    tableName: 'batch_anchor_queue',
    underscored: true,
    timestamps: false
});

const CrossChainProof = sequelize.define('CrossChainProof', {
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
    fabricProofHash: {
        type: DataTypes.STRING(66),
        allowNull: false,
        field: 'fabric_proof_hash'
    },
    ethereumProofHash: {
        type: DataTypes.STRING(66),
        field: 'ethereum_proof_hash'
    },
    fabricBlockNumber: {
        type: DataTypes.BIGINT,
        field: 'fabric_block_number'
    },
    ethereumBlockNumber: {
        type: DataTypes.BIGINT,
        field: 'ethereum_block_number'
    },
    fabricTxId: {
        type: DataTypes.STRING(66),
        field: 'fabric_tx_id'
    },
    ethereumTxHash: {
        type: DataTypes.STRING(66),
        field: 'ethereum_tx_hash'
    },
    consistencyValidated: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'consistency_validated'
    },
    validationTimestamp: {
        type: DataTypes.DATE,
        field: 'validation_timestamp'
    }
}, {
    tableName: 'cross_chain_proofs',
    underscored: true,
    updatedAt: false
});

const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    action: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    actorType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'actor_type'
    },
    actorId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'actor_id'
    },
    targetType: {
        type: DataTypes.STRING(50),
        field: 'target_type'
    },
    targetId: {
        type: DataTypes.STRING(255),
        field: 'target_id'
    },
    details: {
        type: DataTypes.JSONB
    },
    ipAddress: {
        type: DataTypes.INET,
        field: 'ip_address'
    },
    userAgent: {
        type: DataTypes.TEXT,
        field: 'user_agent'
    }
}, {
    tableName: 'audit_log',
    underscored: true,
    updatedAt: false
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

const Template = sequelize.define('Template', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    organizationId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'organization_id'
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    structure: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    backgroundType: {
        type: DataTypes.STRING(50),
        defaultValue: 'ipfs',
        field: 'background_type'
    },
    backgroundUrl: {
        type: DataTypes.STRING(255),
        field: 'background_url'
    }
}, {
    tableName: 'templates',
    underscored: true
});

// Define associations
Verification.belongsTo(Organization, { foreignKey: 'organizationId', targetKey: 'orgId' });
Organization.hasMany(Verification, { foreignKey: 'organizationId', sourceKey: 'orgId' });

Template.belongsTo(Organization, { foreignKey: 'organizationId', targetKey: 'orgId' });
Organization.hasMany(Template, { foreignKey: 'organizationId', sourceKey: 'orgId' });

GovernanceProposal.belongsTo(Organization, { foreignKey: 'proposerOrgId', targetKey: 'orgId', as: 'proposer' });
GovernanceVote.belongsTo(GovernanceProposal, { foreignKey: 'proposalId', targetKey: 'proposalId' });
GovernanceVote.belongsTo(Organization, { foreignKey: 'voterOrgId', targetKey: 'orgId', as: 'voter' });

BatchAnchorQueue.belongsTo(Organization, { foreignKey: 'organizationId', targetKey: 'orgId' });

// Test connection and sync
async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        logger.info('Database connection established successfully');

        // Sync models (use { force: false } in production)
        await sequelize.sync({ alter: true });
        logger.info('Database models synchronized');

        // Initialize sync status
        await SyncStatus.findOrCreate({
            where: { source: 'ethereum' },
            defaults: { lastSyncedBlock: 0, status: 'active' }
        });
        await SyncStatus.findOrCreate({
            where: { source: 'fabric' },
            defaults: { lastSyncedBlock: 0, status: 'active' }
        });

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
    Template,
    GovernanceProposal,
    GovernanceVote,
    BatchAnchorQueue,
    CrossChainProof,
    AuditLog,
    initializeDatabase
};
