# API Documentation

## Base URL

```
Development: http://localhost:5000/api
Production: https://api.docverify.example.com/api
```

## Authentication

Most endpoints require wallet signature authentication.

### Get Nonce

```http
POST /auth/nonce
Content-Type: application/json

{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "nonce": "0x1234...",
    "message": "Sign this message with nonce: 0x1234...",
    "expiresAt": "2024-02-12T15:30:00.000Z"
  }
}
```

### Authenticated Requests

Include these headers:
```
signature: 0xabc123...
message: Sign this message with nonce: 0x1234...
address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

---

## Documents

### Upload Document

```http
POST /documents/upload
Headers: signature, message, address
Content-Type: multipart/form-data

{
  "document": <file>,
  "organizationId": "ORG001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "documentHash": "0xabc123...",
    "ipfsCID": "QmX...",
    "fabricProofHash": "0xdef456...",
    "ethereumTxHash": "0x789...",
    "blockNumber": 12345,
    "gasUsed": "150000",
    "verificationId": 1
  }
}
```

### Get Verification Status

```http
GET /documents/:hash/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "documentHash": "0xabc123...",
    "ipfsCID": "QmX...",
    "organization": {
      "id": "ORG001",
      "name": "University of Example",
      "type": 0,
      "isActive": true
    },
    "timestamp": 1707745800,
    "blockNumber": 12345,
    "proof": { ... }
  }
}
```

### Get Verification History

```http
GET /documents/:hash/history
```

### Batch Upload

```http
POST /documents/batch-upload
Headers: signature, message, address
Content-Type: multipart/form-data

{
  "documents": [<file1>, <file2>, ...],
  "organizationId": "ORG001"
}
```

---

## Organizations

### Register Organization

```http
POST /organizations/register
Headers: signature, message, address (admin only)
Content-Type: application/json

{
  "orgId": "ORG001",
  "orgType": 0,
  "walletAddress": "0x123...",
  "name": "University of Example",
  "metadata": "QmMetadata..."
}
```

**Organization Types:**
- `0`: UNIVERSITY
- `1`: GOVERNMENT
- `2`: CORPORATE
- `3`: CERTIFICATION_BODY

**Response:**
```json
{
  "success": true,
  "data": {
    "orgId": "ORG001",
    "transactionHash": "0x456...",
    "blockNumber": 12340
  }
}
```

### Get Organization

```http
GET /organizations/:id
```

### Get All Organizations

```http
GET /organizations?active=true&limit=50&offset=0
```

### Deactivate Organization

```http
PUT /organizations/:id/deactivate
Headers: signature, message, address (admin only)
```

### Get Organization Statistics

```http
GET /organizations/:id/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "organizationId": "ORG001",
    "totalVerifications": 1523,
    "recentVerifications": [...]
  }
}
```

---

## Public Verification

### Verify Document Hash

```http
POST /verify
Content-Type: application/json

{
  "documentHash": "0xabc123..."
}
```

**Response:**
```json
{
  "success": true,
  "verified": true,
  "data": {
    "documentHash": "0xabc123...",
    "ipfsCID": "QmX...",
    "organization": { ... },
    "timestamp": 1707745800,
    "blockNumber": 12345,
    "proof": { ... }
  }
}
```

### Verify by IPFS CID

```http
POST /verify/cid
Content-Type: application/json

{
  "ipfsCID": "QmX..."
}
```

### Bulk Verification

```http
POST /verify/bulk
Content-Type: application/json

{
  "documentHashes": [
    "0xabc123...",
    "0xdef456...",
    "0xghi789..."
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "documentHash": "0xabc123...",
      "verified": true,
      ...
    },
    ...
  ]
}
```

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/verify` | 100 requests/minute |
| `/verify/bulk` | 10 requests/minute |
| `/documents/upload` | 50 requests/minute |
| `/organizations/register` | 5 requests/hour |

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Missing required fields"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Invalid signature"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Admin role required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Organization not found"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": "Too many requests, please try again later"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## WebSocket Events

Connect to WebSocket:
```javascript
const socket = io('http://localhost:5000');
```

### Subscribe to Events

```javascript
socket.emit('subscribe', 'organization:registered');
socket.emit('subscribe', 'document:verified');
socket.emit('subscribe', 'certificate:issued');
```

### Event Types

**organization:registered**
```json
{
  "orgId": "ORG001",
  "walletAddress": "0x123...",
  "transactionHash": "0x456..."
}
```

**document:verified**
```json
{
  "documentHash": "0xabc...",
  "organizationId": "ORG001",
  "ipfsCID": "QmX...",
  "transactionHash": "0x789..."
}
```

**certificate:issued**
```json
{
  "certificateId": "CERT001",
  "organizationId": "ORG001",
  "documentHash": "0xabc...",
  "timestamp": "2024-02-12T15:30:00.000Z"
}
```

---

## Code Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');
const { ethers } = require('ethers');

// Get nonce
const { data: { data: { nonce, message } } } = await axios.post(
  'http://localhost:5000/api/auth/nonce',
  { address: wallet.address }
);

// Sign message
const signature = await wallet.signMessage(message);

// Upload document
const formData = new FormData();
formData.append('document', fileBuffer, 'certificate.pdf');
formData.append('organizationId', 'ORG001');

const response = await axios.post(
  'http://localhost:5000/api/documents/upload',
  formData,
  {
    headers: {
      signature,
      message,
      address: wallet.address
    }
  }
);
```

### Python

```python
import requests
from eth_account.messages import encode_defunct
from eth_account import Account

# Get nonce
response = requests.post(
    'http://localhost:5000/api/auth/nonce',
    json={'address': wallet_address}
)
nonce_data = response.json()['data']

# Sign message
message = encode_defunct(text=nonce_data['message'])
signed = Account.sign_message(message, private_key)

# Upload document
files = {'document': open('certificate.pdf', 'rb')}
data = {'organizationId': 'ORG001'}
headers = {
    'signature': signed.signature.hex(),
    'message': nonce_data['message'],
    'address': wallet_address
}

response = requests.post(
    'http://localhost:5000/api/documents/upload',
    files=files,
    data=data,
    headers=headers
)
```

---

## Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-02-12T15:30:00.000Z",
  "services": {
    "database": true,
    "ipfs": true,
    "ethereum": true,
    "fabric": true
  }
}
```
