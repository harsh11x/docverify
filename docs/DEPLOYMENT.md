# Deployment Guide

## Prerequisites

- Kubernetes cluster (v1.24+)
- kubectl configured
- Docker registry access
- Domain name with DNS configured
- SSL/TLS certificates

## Infrastructure Requirements

### Minimum Resources

- **Backend Pods**: 3 replicas × (512MB RAM, 0.25 CPU)
- **PostgreSQL**: 2GB RAM, 1 CPU, 50GB storage
- **IPFS**: 4GB RAM, 2 CPU, 100GB storage
- **Redis**: 512MB RAM, 0.25 CPU
- **Fabric Network**: 4GB RAM, 2 CPU per peer

### Recommended Production

- **Backend Pods**: 5-10 replicas × (1GB RAM, 0.5 CPU)
- **PostgreSQL**: 8GB RAM, 4 CPU, 500GB SSD
- **IPFS Cluster**: 3 nodes × (8GB RAM, 4 CPU, 1TB storage)
- **Redis Cluster**: 3 nodes × (2GB RAM, 1 CPU)
- **Fabric Network**: Multi-org setup with 2-4 peers per org

---

## Step 1: Build and Push Docker Images

```bash
# Build backend image
cd backend
docker build -t your-registry/docverify-backend:v1.0.0 .

# Push to registry
docker push your-registry/docverify-backend:v1.0.0
```

---

## Step 2: Configure Secrets

Create `secrets.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: docverify-secrets
type: Opaque
stringData:
  db-host: "postgres-service.default.svc.cluster.local"
  db-password: "YOUR_SECURE_PASSWORD"
  ethereum-private-key: "YOUR_ETHEREUM_PRIVATE_KEY"
  jwt-secret: "YOUR_JWT_SECRET"
  infura-key: "YOUR_INFURA_API_KEY"
```

Apply:
```bash
kubectl apply -f secrets.yaml
```

---

## Step 3: Deploy PostgreSQL

```bash
kubectl apply -f k8s/postgres.yaml
```

Wait for ready:
```bash
kubectl wait --for=condition=ready pod -l app=postgres --timeout=300s
```

Initialize schema:
```bash
kubectl exec -it postgres-0 -- psql -U postgres -d docverify -f /schema.sql
```

---

## Step 4: Deploy IPFS

```bash
kubectl apply -f k8s/ipfs.yaml
```

---

## Step 5: Deploy Redis

```bash
kubectl apply -f k8s/redis.yaml
```

---

## Step 6: Deploy Fabric Network

```bash
# Generate crypto materials
cd fabric
./network.sh up createChannel -c verification-channel

# Deploy chaincode
./network.sh deployCC -ccn certificate-chaincode -ccp ./chaincode -ccl javascript

# Apply Kubernetes manifests
kubectl apply -f k8s/fabric/
```

---

## Step 7: Deploy Smart Contract

```bash
cd contracts/ethereum
npm install

# Deploy to testnet
npx hardhat run scripts/deploy.js --network sepolia

# Verify on Etherscan
npx hardhat verify --network sepolia DEPLOYED_ADDRESS
```

Update ConfigMap with contract address:
```bash
kubectl edit configmap docverify-config
# Add: ethereum-contract-address: "0x..."
```

---

## Step 8: Deploy Backend

```bash
kubectl apply -f k8s/deployment.yaml
```

Verify deployment:
```bash
kubectl get pods -l app=docverify
kubectl logs -f deployment/docverify-backend
```

---

## Step 9: Configure Ingress

Create `ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: docverify-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.docverify.example.com
    secretName: docverify-tls
  rules:
  - host: api.docverify.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: docverify-backend
            port:
              number: 80
```

Apply:
```bash
kubectl apply -f ingress.yaml
```

---

## Step 10: Verify Deployment

### Health Check

```bash
curl https://api.docverify.example.com/health
```

Expected response:
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

### Test Document Upload

```bash
# Get nonce
curl -X POST https://api.docverify.example.com/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"address": "0x..."}'

# Upload document (with signature)
curl -X POST https://api.docverify.example.com/api/documents/upload \
  -H "signature: 0x..." \
  -H "message: ..." \
  -H "address: 0x..." \
  -F "document=@test.pdf" \
  -F "organizationId=ORG001"
```

---

## Monitoring Setup

### Prometheus

```bash
kubectl apply -f k8s/monitoring/prometheus.yaml
```

### Grafana

```bash
kubectl apply -f k8s/monitoring/grafana.yaml
```

Import dashboards:
- Node.js Application Metrics
- PostgreSQL Database
- Kubernetes Cluster Monitoring

---

## Backup Strategy

### Database Backups

```bash
# Daily backup cronjob
kubectl apply -f k8s/backup/postgres-backup.yaml
```

### IPFS Backups

```bash
# Pin important CIDs to multiple nodes
ipfs pin add QmX...
```

### Fabric Backups

```bash
# Backup ledger snapshots
peer snapshot submitrequest -c verification-channel
```

---

## Scaling

### Horizontal Pod Autoscaling

Already configured in `deployment.yaml`:
- Min replicas: 3
- Max replicas: 10
- CPU threshold: 70%
- Memory threshold: 80%

### Manual Scaling

```bash
kubectl scale deployment docverify-backend --replicas=5
```

---

## Troubleshooting

### Pod Not Starting

```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

### Database Connection Issues

```bash
kubectl exec -it <backend-pod> -- env | grep DB_
kubectl exec -it postgres-0 -- psql -U postgres -c "\l"
```

### Ethereum Connection Issues

```bash
kubectl logs <backend-pod> | grep -i ethereum
# Check RPC URL and private key in secrets
```

### Fabric Connection Issues

```bash
kubectl logs <backend-pod> | grep -i fabric
# Verify network config and certificates
```

---

## Security Checklist

- [ ] Secrets stored in Kubernetes Secrets (not ConfigMaps)
- [ ] TLS/SSL certificates configured
- [ ] Network policies applied
- [ ] RBAC configured
- [ ] Pod security policies enabled
- [ ] Image scanning enabled
- [ ] Regular security updates
- [ ] Backup and disaster recovery tested
- [ ] Rate limiting configured
- [ ] Monitoring and alerting active

---

## Maintenance

### Update Backend

```bash
# Build new version
docker build -t your-registry/docverify-backend:v1.1.0 .
docker push your-registry/docverify-backend:v1.1.0

# Update deployment
kubectl set image deployment/docverify-backend backend=your-registry/docverify-backend:v1.1.0

# Monitor rollout
kubectl rollout status deployment/docverify-backend
```

### Database Migrations

```bash
kubectl exec -it <backend-pod> -- npm run migrate
```

### Smart Contract Upgrades

```bash
cd contracts/ethereum
npx hardhat run scripts/upgrade.js --network sepolia
```

---

## Cost Optimization

1. **Use spot instances** for non-critical workloads
2. **Enable cluster autoscaling** to scale down during low traffic
3. **Use persistent volume claims** efficiently
4. **Implement caching** with Redis
5. **Batch Ethereum transactions** to reduce gas costs
6. **Use CDN** for IPFS gateway
7. **Monitor and optimize** database queries

---

## Support

For deployment issues:
- Check logs: `kubectl logs -f deployment/docverify-backend`
- Health endpoint: `https://api.docverify.example.com/health`
- Metrics: Prometheus/Grafana dashboards
