# Decentralized Document Verification Platform - Backend

A fully decentralized, zero-human-intervention document verification infrastructure powered by Ethereum, Hyperledger Fabric, IPFS, and Node.js.

## 🏗 Architecture

This system implements a hybrid blockchain architecture:

- **Public Layer (Ethereum)**: Immutable verification proofs, public auditability
- **Permissioned Layer (Hyperledger Fabric)**: Institutional databases, certificate management
- **Decentralized Storage (IPFS)**: Document file storage
- **Backend Services (Node.js)**: API gateway, cross-chain orchestration
- **Off-chain Database (PostgreSQL)**: Fast indexing and analytics

## 🚀 Features

- ✅ Zero-human-intervention verification workflow
- ✅ Cross-chain validation (Ethereum ↔ Fabric)
- ✅ Tamper-proof document anchoring
- ✅ Real-time event streaming (WebSocket)
- ✅ Public verification API
- ✅ Multi-organization support
- ✅ Role-based access control
- ✅ Wallet signature authentication
- ✅ Rate limiting & DDoS protection
- ✅ Horizontal scaling ready

## 📋 Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 15
- Docker & Docker Compose
- IPFS node
- Ethereum node access (Infura/Alchemy or local)
- Hyperledger Fabric network

## 🛠 Installation

### 1. Clone and Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Initialize Database

```bash
psql -U postgres -d docverify -f src/database/schema.sql
```

### 4. Deploy Smart Contract

```bash
cd contracts/ethereum
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
```

### 5. Set Up Fabric Network

```bash
cd contracts/fabric
# Follow Fabric network setup guide
```

## 🐳 Docker Deployment

### Local Development

```bash
docker-compose up -d
```

This starts:
- PostgreSQL database
- IPFS node
- Redis cache
- Ganache (local Ethereum)
- Backend API
- Fabric network (orderer + peers)

### Production (Kubernetes)

```bash
kubectl apply -f k8s/deployment.yaml
```

## 📡 API Endpoints

### Authentication

```
POST /api/auth/nonce
```

Generate nonce for wallet signature authentication.

### Documents

```
POST /api/documents/upload
GET  /api/documents/:hash/status
GET  /api/documents/:hash/history
POST /api/documents/batch-upload
```

### Organizations

```
POST /api/organizations/register
GET  /api/organizations/:id
GET  /api/organizations
PUT  /api/organizations/:id/deactivate
GET  /api/organizations/:id/stats
```

### Public Verification

```
POST /api/verify
POST /api/verify/cid
POST /api/verify/bulk
```

### Health Check

```
GET /health
```

## 🔐 Authentication

The API uses wallet signature-based authentication:

1. Request nonce: `POST /api/auth/nonce`
2. Sign message with wallet
3. Include headers in requests:
   - `signature`: Wallet signature
   - `message`: Signed message
   - `address`: Wallet address

## 🔄 Verification Workflow

1. **Client** uploads document
2. **Backend** computes SHA-256 hash
3. **IPFS** stores file, returns CID
4. **Fabric** validates hash against organization database
5. **Backend** generates Fabric proof hash
6. **Ethereum** anchors verification proof
7. **Event listeners** update off-chain database
8. **WebSocket** emits real-time updates

## 📊 Monitoring

Health check endpoint provides status of all services:

```json
{
  "status": "healthy",
  "services": {
    "database": true,
    "ipfs": true,
    "ethereum": true,
    "fabric": true
  }
}
```

## 🧪 Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# All tests with coverage
npm test
```

## 📈 Scalability

- Horizontal scaling via Kubernetes HPA
- Redis caching for frequently accessed data
- Database connection pooling
- Rate limiting per endpoint
- Batch anchoring optimization

## 🔒 Security

- Wallet signature authentication
- Nonce-based replay protection
- Role-based access control (RBAC)
- Rate limiting & DDoS mitigation
- Input validation & sanitization
- Helmet.js security headers
- Non-root Docker containers

## 📝 Environment Variables

See `.env.example` for full configuration options.

Key variables:
- `ETHEREUM_RPC_URL`: Ethereum node URL
- `ETHEREUM_CONTRACT_ADDRESS`: Deployed contract address
- `ETHEREUM_PRIVATE_KEY`: Wallet private key
- `FABRIC_CONNECTION_PROFILE`: Fabric network config
- `IPFS_HOST`: IPFS node host
- `DB_*`: PostgreSQL connection details

## 🤝 Contributing

This is a production-grade system. Contributions should include:
- Comprehensive tests
- Documentation updates
- Security considerations

## 📄 License

MIT

## 🆘 Support

For issues and questions:
- Check logs: `./logs/`
- Health endpoint: `/health`
- Event logs in database: `events` table

## 🚦 Status

- ✅ Smart Contracts: Complete
- ✅ Fabric Chaincode: Complete
- ✅ Backend Services: Complete
- ✅ Event Listeners: Complete
- ✅ API Endpoints: Complete
- ✅ Docker Setup: Complete
- ✅ Kubernetes Manifests: Complete
- ⏳ Integration Tests: In Progress
- ⏳ Load Testing: Planned
- ⏳ Monitoring Dashboard: Planned
