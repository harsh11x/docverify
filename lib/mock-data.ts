import { Document, VerificationStatus } from "@/types"

// Mock data for development
export const mockDocuments: Document[] = [
    {
        id: "1",
        hash: "0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z",
        ipfsCid: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
        fileName: "degree_certificate.pdf",
        fileSize: 245760,
        uploadedBy: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        organizationId: "org1",
        organizationName: "Stanford University",
        status: "verified",
        blockNumber: 18234567,
        transactionHash: "0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a",
        timestamp: new Date("2024-01-15T10:30:00"),
    },
    {
        id: "2",
        hash: "0x2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a",
        ipfsCid: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
        fileName: "transcript.pdf",
        fileSize: 189440,
        uploadedBy: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        status: "pending",
        timestamp: new Date("2024-02-10T14:20:00"),
    },
]

export const mockOrganizations = [
    {
        id: "org1",
        name: "Stanford University",
        type: "institutional" as const,
        walletAddress: "0x1234567890123456789012345678901234567890",
        registrationId: "EDU-US-2024-001",
        blockchainHash: "0xabc123def456ghi789jkl012mno345pqr678stu901vwx234yz",
        smartContractAddress: "0x9876543210987654321098765432109876543210",
        registeredAt: new Date("2024-01-01T00:00:00"),
        isActive: true,
    },
    {
        id: "org2",
        name: "City General Hospital",
        type: "governmental" as const,
        walletAddress: "0x2345678901234567890123456789012345678901",
        registrationId: "GOV-US-2024-002",
        blockchainHash: "0xdef456ghi789jkl012mno345pqr678stu901vwx234yzabc123",
        smartContractAddress: "0x8765432109876543210987654321098765432109",
        registeredAt: new Date("2024-01-05T00:00:00"),
        isActive: true,
    },
]

export const mockAnalytics = {
    totalDocuments: 15234,
    verifiedDocuments: 14892,
    pendingDocuments: 287,
    rejectedDocuments: 55,
    activeOrganizations: 342,
    totalTransactions: 45678,
    smartContractCalls: 89234,
    networkNodes: 24,
}
