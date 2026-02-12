"use client"

import { useState } from "react"
import { Search, Loader2, ExternalLink } from "lucide-react"
import { blockchainService } from "@/lib/blockchain-service"
import { HashDisplay } from "@/components/ui/hash-display"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatDate, formatBlockNumber } from "@/lib/utils"
import { Document } from "@/types"

export default function VerifyPage() {
    const [hash, setHash] = useState("")
    const [isVerifying, setIsVerifying] = useState(false)
    const [result, setResult] = useState<Document | null>(null)
    const [notFound, setNotFound] = useState(false)

    const handleVerify = async () => {
        if (!hash.trim()) return

        setIsVerifying(true)
        setNotFound(false)
        setResult(null)

        try {
            const document = await blockchainService.verifyDocument(hash)
            if (document) {
                setResult(document)
            } else {
                setNotFound(true)
            }
        } catch (error) {
            setNotFound(true)
        } finally {
            setIsVerifying(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12">
            <div className="max-w-3xl w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">Verify Document</h1>
                    <p className="text-muted-foreground text-lg">
                        Enter a document hash to verify its authenticity on the blockchain
                    </p>
                </div>

                {/* Search Input */}
                <div className="p-8 rounded-lg border border-border bg-card">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={hash}
                            onChange={(e) => setHash(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                            placeholder="Enter document hash (0x...)"
                            className="flex-1 px-4 py-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                        />
                        <button
                            onClick={handleVerify}
                            disabled={isVerifying || !hash.trim()}
                            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                        >
                            {isVerifying ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    <Search className="h-4 w-4" />
                                    Verify
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Verification Result */}
                {result && (
                    <div className="p-8 rounded-lg border-2 border-verification-verified bg-verification-verified/5 animate-fade-in">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-full bg-verification-verified/20 flex items-center justify-center">
                                <svg
                                    className="h-6 w-6 text-verification-verified"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-verification-verified">
                                    Document Verified
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    This document has been verified on the blockchain
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-muted-foreground mb-2">Document Hash</p>
                                <HashDisplay hash={result.hash} truncate={false} />
                            </div>

                            <div>
                                <p className="text-xs text-muted-foreground mb-2">IPFS CID</p>
                                <HashDisplay hash={result.ipfsCid} />
                            </div>

                            {result.organizationName && (
                                <div>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        Issuing Organization
                                    </p>
                                    <p className="text-lg font-semibold">{result.organizationName}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-2">Timestamp</p>
                                    <p className="text-sm font-medium">{formatDate(result.timestamp)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-2">Block Number</p>
                                    <p className="text-sm font-medium">
                                        {result.blockNumber && formatBlockNumber(result.blockNumber)}
                                    </p>
                                </div>
                            </div>

                            {result.transactionHash && (
                                <div>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        Blockchain Proof
                                    </p>
                                    <a
                                        href={`https://etherscan.io/tx/${result.transactionHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-primary hover:underline"
                                    >
                                        View on Etherscan
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Not Found */}
                {notFound && (
                    <div className="p-8 rounded-lg border-2 border-verification-rejected bg-verification-rejected/5 animate-fade-in">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-verification-rejected/20 flex items-center justify-center">
                                <svg
                                    className="h-6 w-6 text-verification-rejected"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-verification-rejected">
                                    Document Not Found
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    This document hash was not found on the blockchain
                                </p>
                            </div>
                        </div>

                        <div className="p-4 rounded-lg bg-muted/50">
                            <p className="text-sm text-muted-foreground mb-2">
                                This could mean:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                <li>The document has not been registered on the blockchain</li>
                                <li>The hash you entered is incorrect</li>
                                <li>The document was registered on a different network</li>
                            </ul>
                            <p className="text-sm text-muted-foreground mt-4">
                                Please verify the hash and try again, or contact the issuing
                                organization for assistance.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
