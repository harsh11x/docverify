/**
 * Blockchain service — calls the DocVerify backend API.
 * Backend routes: /api/verify, /api/documents, /api/governance, /api/sync
 */

import { Document, VerificationStatus } from "@/types"

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"

class BlockchainService {
    /**
     * Verify a document by its SHA-256 hash.
     */
    async verifyDocument(hash: string): Promise<Document | null> {
        try {
            const res = await fetch(`${API_BASE}/api/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ hash }),
            })

            if (!res.ok) {
                if (res.status === 404) return null
                throw new Error(`Verification failed: ${res.statusText}`)
            }

            const data = await res.json()

            if (!data.success || !data.data?.verified) return null

            const v = data.data
            return {
                id: v.certificateId || v.documentHash,
                hash: v.documentHash || hash,
                ipfsCid: v.ipfsCID || "",
                fileName: v.metadata?.fileName || "document",
                fileSize: v.metadata?.fileSize || 0,
                uploadedBy: v.organizationId || "",
                organizationId: v.organizationId || "",
                organizationName: v.organizationName || v.organizationId || "",
                status: v.verified ? "verified" : "rejected",
                blockNumber: v.blockNumber || 0,
                transactionHash: v.transactionHash || "",
                timestamp: v.timestamp ? new Date(v.timestamp) : new Date(),
            }
        } catch (err) {
            console.error("[BlockchainService] verifyDocument error:", err)
            return null
        }
    }

    /**
     * Verify a document by IPFS CID.
     */
    async verifyByCID(cid: string): Promise<Document | null> {
        try {
            const res = await fetch(`${API_BASE}/api/verify/cid`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cid }),
            })
            if (!res.ok) return null
            const data = await res.json()
            if (!data.success) return null
            return data.data as Document
        } catch (err) {
            console.error("[BlockchainService] verifyByCID error:", err)
            return null
        }
    }

    /**
     * Verify a document by certificate ID.
     */
    async verifyByCertId(certId: string): Promise<Document | null> {
        try {
            const res = await fetch(`${API_BASE}/api/verify/cert-id`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ certId }),
            })
            if (!res.ok) return null
            const data = await res.json()
            if (!data.success) return null
            return data.data as Document
        } catch (err) {
            console.error("[BlockchainService] verifyByCertId error:", err)
            return null
        }
    }

    /**
     * Submit a document for verification (upload hash + IPFS CID).
     * Returns the Ethereum transaction hash.
     */
    async submitDocument(hash: string, ipfsCid: string): Promise<string> {
        const res = await fetch(`${API_BASE}/api/documents`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hash, ipfsCid }),
        })

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }))
            throw new Error(err.error || "Document submission failed")
        }

        const data = await res.json()
        return data.transactionHash || data.data?.transactionHash || ""
    }

    /**
     * Register a new organization via the governance API.
     * Returns a transaction hash or org ID.
     */
    async registerOrganization(name: string, type: string): Promise<string> {
        const res = await fetch(`${API_BASE}/api/governance/organizations/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, orgType: type }),
        })

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }))
            throw new Error(err.error || "Organization registration failed")
        }

        const data = await res.json()
        return data.orgId || data.data?.orgId || ""
    }

    /**
     * Get verification history for a given document hash.
     */
    async getVerificationHistory(hash: string): Promise<Document[]> {
        try {
            const res = await fetch(`${API_BASE}/api/verify/history/${hash}`)
            if (!res.ok) return []
            const data = await res.json()
            return data.data || []
        } catch {
            return []
        }
    }

    /**
     * Get cross-chain proof for a given document hash.
     */
    async getCrossChainProof(hash: string): Promise<any | null> {
        try {
            const res = await fetch(`${API_BASE}/api/verify/proof/${hash}`)
            if (!res.ok) return null
            const data = await res.json()
            return data.data || null
        } catch {
            return null
        }
    }

    /** Listen to backend sync events (no-op stub — use WebSocket if needed) */
    onDocumentVerified(callback: (data: any) => void): void {
        console.log("[BlockchainService] Real-time events: connect to ws://localhost:5000 for updates")
    }
}

export const blockchainService = new BlockchainService()
