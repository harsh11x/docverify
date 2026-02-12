export type UserRole = "user" | "organization" | "governance"

export type OrganizationType = "institutional" | "governmental" | "private"

export type VerificationStatus = "pending" | "verified" | "rejected" | "not_found"

export type NetworkStatus = "connected" | "disconnected" | "syncing"

export interface User {
    walletAddress: string
    role: UserRole
    balance?: string
    registeredAt?: Date
}

export interface Organization {
    id: string
    name: string
    type: OrganizationType
    walletAddress: string
    registrationId: string
    blockchainHash: string
    smartContractAddress: string
    registeredAt: Date
    isActive: boolean
}

export interface Document {
    id: string
    hash: string
    ipfsCid: string
    fileName: string
    fileSize: number
    uploadedBy: string
    organizationId?: string
    organizationName?: string
    status: VerificationStatus
    blockNumber?: number
    transactionHash?: string
    timestamp: Date
}

export interface Transaction {
    id: string
    hash: string
    from: string
    to: string
    blockNumber: number
    timestamp: Date
    type: "upload" | "verify" | "register"
    status: "pending" | "confirmed" | "failed"
    gasUsed?: string
}

export interface NetworkHealth {
    status: NetworkStatus
    blockHeight: number
    nodeCount: number
    lastSyncTime: Date
    consensusHealth: "healthy" | "degraded" | "critical"
}

export interface Analytics {
    totalDocuments: number
    verifiedDocuments: number
    pendingDocuments: number
    rejectedDocuments: number
    activeOrganizations: number
    totalTransactions: number
    smartContractCalls: number
    networkNodes: number
}

export interface SyncStatus {
    lastSyncTime: Date
    blockHeight: number
    consensusProof: boolean
    syncProgress: number
    status: "synced" | "syncing" | "error"
}
