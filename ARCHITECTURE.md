# DocVerify - Decentralized Document Verification Infrastructure

## Architecture Overview

A national-level, production-ready decentralized document verification system powered by:
- **Ethereum** (public blockchain for immutable proof anchoring)
- **Hyperledger Fabric** (permissioned enterprise blockchain for certificate management)
- **IPFS** (decentralized document storage)
- **PostgreSQL** (off-chain indexing and analytics)
- **Node.js** (backend orchestration layer)

## System Components

### 1. Blockchain Layer

#### Ethereum Smart Contract (`DocumentVerification.sol`)
- UUPS upgradeable pattern for future improvements
- Role-based access control (ADMIN, ORGANIZATION, UPGRADER)
- Organization registration and lifecycle management
- Document verification with cross-chain proof anchoring
- Event emission for off-chain indexing
- Nonce-based replay protection

#### Hyperledger Fabric Chaincode (`certificateChaincode.js`)
- Certificate issuance with composite key indexing
- Hash-based certificate validation
- Organization-specific queries
- Certificate history tracking
- Multi-organization endorsement support

### 2. Backend Services

#### Core Services
- **EthereumService**: Contract interaction via ethers.js
- **FabricService**: Fabric Gateway integration with wallet management
- **IPFSService**: Decentralized file upload/retrieval/pinning
- **VerificationService**: Complete cross-chain verification workflow

#### Infrastructure Services
- **SyncEngine**: Blockchain-to-database synchronization
- **BatchAnchoringService**: Merkle tree-based batch Ethereum anchoring
- **GovernanceService**: Proposal creation, voting, execution

### 3. Security Layer

#### Authentication
- Wallet-signature authentication (EIP-191)
- Nonce validation for replay protection
- MSP identity verification for Fabric operations

#### Protection
- Rate limiting (public, bulk, upload, registration)
- CID integrity validation
- Event signature verification
- Request sanitization
- Suspicious activity detection

### 4. Verification Workflow

```
Document Upload
     │
     ▼
┌─────────────────┐
│  SHA-256 Hash   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Upload to IPFS │
│  (Pin & Store)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  CID Integrity  │
│   Validation    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Fabric: Validate│
│ Certificate Hash│
└────────┬────────┘
         │
    ┌────┴────┐
    │ Valid?  │
    └────┬────┘
    Yes  │  No
    │    └──► Reject & Log
    ▼
┌─────────────────┐
│ Generate Fabric │
│   Proof Hash    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Ethereum: Anchor│
│  Proof On-Chain │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Store in DB +   │
│ Cross-Chain Proof│
└────────┬────────┘
         │
         ▼
   Verification
    Complete
```

## API Endpoints

### Verification
- `POST /api/verify` - Verify document by hash
- `POST /api/verify/cid` - Verify by IPFS CID
- `POST /api/verify/cert-id` - Verify by certificate ID
- `POST /api/verify/bulk` - Bulk verification (up to 100)
- `GET /api/verify/history/:hash` - Get verification history
- `GET /api/verify/proof/:hash` - Get cross-chain proof
- `GET /api/verify/download/:certId` - Download certificate PDF

### Governance
- `POST /api/governance/proposals` - Create proposal
- `GET /api/governance/proposals` - List proposals
- `GET /api/governance/proposals/:id` - Get proposal details
- `POST /api/governance/proposals/:id/vote` - Cast vote
- `POST /api/governance/organizations/register` - Register organization

### Sync & Batch
- `GET /api/sync/status` - Get sync engine status
- `GET /api/sync/batch/status` - Get batch anchor queue status
- `POST /api/sync/batch/process` - Force batch processing
- `POST /api/sync/webhook/register` - Register institutional webhook

## Multi-Node Fabric Endorsement Policies

| Operation | Policy |
|-----------|--------|
| Certificate Issuance | 2 of 3 organizations |
| Certificate Revocation | Issuing organization only |
| Certificate Query | Any organization member |
| Organization Registration | 2 of 3 admin signatures |
| Governance Proposal | Unanimous (3 of 3) |
| Cross-Chain Anchor | 2 of 3 organizations |

## Deployment

### Docker Compose (Development)
```bash
docker-compose up
```

### Kubernetes (Production)
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/ipfs.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/ingress.yaml
```

## Environment Variables

See `backend/.env.example` for complete configuration options.

Key variables:
- `ETHEREUM_RPC_URL` - Ethereum node endpoint
- `ETHEREUM_CONTRACT_ADDRESS` - Deployed contract address
- `FABRIC_CHANNEL_NAME` - Fabric channel name
- `BATCH_ANCHOR_ENABLED` - Enable batch anchoring (true/false)
- `GOVERNANCE_AUTO_APPROVE` - Auto-approve organizations (dev only)

## Security Considerations

1. **Private Keys**: Never commit private keys; use secrets management
2. **Rate Limiting**: Configured per endpoint type
3. **CORS**: Restrict allowed origins in production
4. **TLS**: Required for all production communications
5. **Audit Logging**: All critical operations logged
6. **Nonce Validation**: Prevents replay attacks

## Scaling

- Backend: Horizontal pod autoscaling (3-20 replicas)
- PostgreSQL: Read replicas for query load
- IPFS: Cluster mode for redundancy
- Redis: Cluster mode for high availability
- Fabric: Multi-peer endorsement for throughput

## Monitoring

Prometheus metrics available at `/metrics`:
- Request rates and latencies
- Verification counts
- Sync lag indicators
- Batch queue sizes
- Database connection status
