-- Document Verification Platform Database Schema

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    org_id VARCHAR(255) UNIQUE NOT NULL,
    org_type INTEGER NOT NULL,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    metadata TEXT,
    registration_timestamp BIGINT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizations_org_id ON organizations(org_id);
CREATE INDEX idx_organizations_wallet ON organizations(wallet_address);
CREATE INDEX idx_organizations_active ON organizations(is_active);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    document_hash VARCHAR(66) UNIQUE NOT NULL,
    ipfs_cid VARCHAR(255) NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(100),
    uploaded_by VARCHAR(255),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE INDEX idx_documents_hash ON documents(document_hash);
CREATE INDEX idx_documents_cid ON documents(ipfs_cid);
CREATE INDEX idx_documents_uploaded_at ON documents(uploaded_at);

-- Verifications table
CREATE TABLE IF NOT EXISTS verifications (
    id SERIAL PRIMARY KEY,
    document_hash VARCHAR(66) NOT NULL,
    ipfs_cid VARCHAR(255) NOT NULL,
    organization_id VARCHAR(255) NOT NULL,
    fabric_proof_hash VARCHAR(66) NOT NULL,
    ethereum_tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    verified BOOLEAN DEFAULT true,
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    fabric_certificates JSONB,
    FOREIGN KEY (organization_id) REFERENCES organizations(org_id)
);

CREATE INDEX idx_verifications_doc_hash ON verifications(document_hash);
CREATE INDEX idx_verifications_org_id ON verifications(organization_id);
CREATE INDEX idx_verifications_tx_hash ON verifications(ethereum_tx_hash);
CREATE INDEX idx_verifications_block_number ON verifications(block_number);
CREATE INDEX idx_verifications_verified_at ON verifications(verified_at);

-- Events table (for audit trail)
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    source VARCHAR(50) NOT NULL, -- 'ethereum' or 'fabric'
    transaction_hash VARCHAR(66),
    block_number BIGINT,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_source ON events(source);
CREATE INDEX idx_events_tx_hash ON events(transaction_hash);
CREATE INDEX idx_events_block_number ON events(block_number);
CREATE INDEX idx_events_processed ON events(processed);
CREATE INDEX idx_events_created_at ON events(created_at);

-- Sync status table
CREATE TABLE IF NOT EXISTS sync_status (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL, -- 'ethereum' or 'fabric'
    last_synced_block BIGINT NOT NULL,
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'error'
    error_message TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_status_source ON sync_status(source);

-- Nonces table (for replay attack protection)
CREATE TABLE IF NOT EXISTS nonces (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL,
    nonce VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_nonces_wallet ON nonces(wallet_address);
CREATE INDEX idx_nonces_nonce ON nonces(nonce);
CREATE INDEX idx_nonces_expires_at ON nonces(expires_at);

-- API keys table (for rate limiting and authentication)
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    organization_id VARCHAR(255),
    name VARCHAR(255),
    permissions JSONB,
    rate_limit INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(org_id)
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_org_id ON api_keys(organization_id);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);

-- Batch anchoring queue (for optimization)
CREATE TABLE IF NOT EXISTS batch_queue (
    id SERIAL PRIMARY KEY,
    document_hash VARCHAR(66) NOT NULL,
    organization_id VARCHAR(255) NOT NULL,
    fabric_proof_hash VARCHAR(66) NOT NULL,
    ipfs_cid VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'batched', 'anchored'
    batch_id VARCHAR(255),
    anchored_tx_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    anchored_at TIMESTAMP
);

CREATE INDEX idx_batch_queue_status ON batch_queue(status);
CREATE INDEX idx_batch_queue_batch_id ON batch_queue(batch_id);
CREATE INDEX idx_batch_queue_created_at ON batch_queue(created_at);

-- Statistics table (for analytics)
CREATE TABLE IF NOT EXISTS statistics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(255) NOT NULL,
    metric_value NUMERIC NOT NULL,
    organization_id VARCHAR(255),
    period VARCHAR(50), -- 'hourly', 'daily', 'weekly', 'monthly'
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE INDEX idx_statistics_metric ON statistics(metric_name);
CREATE INDEX idx_statistics_org_id ON statistics(organization_id);
CREATE INDEX idx_statistics_period ON statistics(period);
CREATE INDEX idx_statistics_timestamp ON statistics(timestamp);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_status_updated_at BEFORE UPDATE ON sync_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial sync status records
INSERT INTO sync_status (source, last_synced_block, status) 
VALUES ('ethereum', 0, 'active'), ('fabric', 0, 'active')
ON CONFLICT DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE organizations IS 'Stores registered organizations from Ethereum smart contract';
COMMENT ON TABLE documents IS 'Stores document metadata and IPFS references';
COMMENT ON TABLE verifications IS 'Stores cross-chain verification proofs';
COMMENT ON TABLE events IS 'Audit trail of all blockchain events';
COMMENT ON TABLE sync_status IS 'Tracks synchronization status with blockchains';
COMMENT ON TABLE nonces IS 'Stores nonces for replay attack protection';
COMMENT ON TABLE api_keys IS 'API keys for authentication and rate limiting';
COMMENT ON TABLE batch_queue IS 'Queue for batch anchoring optimization';
COMMENT ON TABLE statistics IS 'Analytics and metrics data';
