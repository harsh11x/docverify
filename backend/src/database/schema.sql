-- DocVerify Database Schema
-- National-Level Decentralized Document Verification Infrastructure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Nonces table for replay protection
CREATE TABLE IF NOT EXISTS nonces (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL,
    nonce VARCHAR(66) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wallet_address, nonce)
);

CREATE INDEX idx_nonces_wallet ON nonces(wallet_address);
CREATE INDEX idx_nonces_expires ON nonces(expires_at);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    org_id VARCHAR(255) UNIQUE NOT NULL,
    org_type INTEGER NOT NULL,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    metadata TEXT,
    registration_timestamp BIGINT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'pending',
    ban_expires_at TIMESTAMP WITH TIME ZONE,
    msp_id VARCHAR(255),
    fabric_identity_cert TEXT,
    governance_weight INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_org_wallet ON organizations(wallet_address);
CREATE INDEX idx_org_status ON organizations(status);
CREATE INDEX idx_org_msp ON organizations(msp_id);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    document_hash VARCHAR(66) UNIQUE NOT NULL,
    ipfs_cid VARCHAR(255) NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(100),
    uploaded_by VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_doc_hash ON documents(document_hash);
CREATE INDEX idx_doc_cid ON documents(ipfs_cid);

-- Verifications table
CREATE TABLE IF NOT EXISTS verifications (
    id SERIAL PRIMARY KEY,
    document_hash VARCHAR(66) NOT NULL,
    ipfs_cid VARCHAR(255) NOT NULL,
    organization_id VARCHAR(255) NOT NULL,
    fabric_proof_hash VARCHAR(66) NOT NULL,
    ethereum_tx_hash VARCHAR(66),
    block_number BIGINT,
    verified BOOLEAN DEFAULT TRUE,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    fabric_certificates JSONB,
    certificate_id VARCHAR(255) UNIQUE,
    cross_chain_validated BOOLEAN DEFAULT FALSE,
    validation_timestamp TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (organization_id) REFERENCES organizations(org_id)
);

CREATE INDEX idx_ver_hash ON verifications(document_hash);
CREATE INDEX idx_ver_org ON verifications(organization_id);
CREATE INDEX idx_ver_cert ON verifications(certificate_id);
CREATE INDEX idx_ver_eth_tx ON verifications(ethereum_tx_hash);

-- Events table for blockchain event tracking
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    source VARCHAR(50) NOT NULL,
    transaction_hash VARCHAR(66),
    block_number BIGINT,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_source ON events(source);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_processed ON events(processed);
CREATE INDEX idx_events_tx ON events(transaction_hash);

-- Sync status for blockchain synchronization
CREATE TABLE IF NOT EXISTS sync_status (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL UNIQUE,
    last_synced_block BIGINT NOT NULL DEFAULT 0,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Templates for certificate generation
CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    organization_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    structure JSONB NOT NULL,
    background_type VARCHAR(50) DEFAULT 'ipfs',
    background_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(org_id)
);

CREATE INDEX idx_template_org ON templates(organization_id);

-- Governance proposals table
CREATE TABLE IF NOT EXISTS governance_proposals (
    id SERIAL PRIMARY KEY,
    proposal_id VARCHAR(66) UNIQUE NOT NULL,
    proposal_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    proposer_org_id VARCHAR(255) NOT NULL,
    target_org_id VARCHAR(255),
    payload JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    votes_for INTEGER DEFAULT 0,
    votes_against INTEGER DEFAULT 0,
    total_weight INTEGER DEFAULT 0,
    quorum_required INTEGER DEFAULT 51,
    voting_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE,
    ethereum_tx_hash VARCHAR(66),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proposer_org_id) REFERENCES organizations(org_id)
);

CREATE INDEX idx_proposal_status ON governance_proposals(status);
CREATE INDEX idx_proposal_type ON governance_proposals(proposal_type);

-- Governance votes table
CREATE TABLE IF NOT EXISTS governance_votes (
    id SERIAL PRIMARY KEY,
    proposal_id VARCHAR(66) NOT NULL,
    voter_org_id VARCHAR(255) NOT NULL,
    vote BOOLEAN NOT NULL,
    weight INTEGER DEFAULT 1,
    signature VARCHAR(132),
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(proposal_id, voter_org_id),
    FOREIGN KEY (proposal_id) REFERENCES governance_proposals(proposal_id),
    FOREIGN KEY (voter_org_id) REFERENCES organizations(org_id)
);

CREATE INDEX idx_vote_proposal ON governance_votes(proposal_id);

-- Batch anchoring queue
CREATE TABLE IF NOT EXISTS batch_anchor_queue (
    id SERIAL PRIMARY KEY,
    certificate_id VARCHAR(255) NOT NULL,
    document_hash VARCHAR(66) NOT NULL,
    organization_id VARCHAR(255) NOT NULL,
    fabric_proof_hash VARCHAR(66) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    batch_id VARCHAR(66),
    queued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    ethereum_tx_hash VARCHAR(66),
    error_message TEXT,
    FOREIGN KEY (organization_id) REFERENCES organizations(org_id)
);

CREATE INDEX idx_batch_status ON batch_anchor_queue(status);
CREATE INDEX idx_batch_id ON batch_anchor_queue(batch_id);

-- Cross-chain proofs table
CREATE TABLE IF NOT EXISTS cross_chain_proofs (
    id SERIAL PRIMARY KEY,
    document_hash VARCHAR(66) NOT NULL,
    fabric_proof_hash VARCHAR(66) NOT NULL,
    ethereum_proof_hash VARCHAR(66),
    fabric_block_number BIGINT,
    ethereum_block_number BIGINT,
    fabric_tx_id VARCHAR(66),
    ethereum_tx_hash VARCHAR(66),
    consistency_validated BOOLEAN DEFAULT FALSE,
    validation_timestamp TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_proof_doc ON cross_chain_proofs(document_hash);
CREATE INDEX idx_proof_fabric ON cross_chain_proofs(fabric_proof_hash);

-- Institutional sync log
CREATE TABLE IF NOT EXISTS institutional_sync_log (
    id SERIAL PRIMARY KEY,
    organization_id VARCHAR(255) NOT NULL,
    sync_type VARCHAR(50) NOT NULL,
    records_synced INTEGER DEFAULT 0,
    last_certificate_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'completed',
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (organization_id) REFERENCES organizations(org_id)
);

CREATE INDEX idx_sync_org ON institutional_sync_log(organization_id);

-- Audit log for all critical operations
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    actor_type VARCHAR(50) NOT NULL,
    actor_id VARCHAR(255) NOT NULL,
    target_type VARCHAR(50),
    target_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- Rate limiting tracking (complement to Redis)
CREATE TABLE IF NOT EXISTS rate_limit_violations (
    id SERIAL PRIMARY KEY,
    ip_address INET NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    violation_count INTEGER DEFAULT 1,
    first_violation_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_violation_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    blocked_until TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_rate_ip ON rate_limit_violations(ip_address);

-- Initialize sync status records
INSERT INTO sync_status (source, last_synced_block, status) 
VALUES ('ethereum', 0, 'active'), ('fabric', 0, 'active')
ON CONFLICT (source) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_governance_proposals_updated_at BEFORE UPDATE ON governance_proposals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_status_updated_at BEFORE UPDATE ON sync_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Cleanup expired nonces (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_nonces()
RETURNS void AS $$
BEGIN
    DELETE FROM nonces WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;
