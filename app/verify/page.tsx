"use client"

import { useState } from "react"
import { Search, Loader2, ExternalLink } from "lucide-react"
import { blockchainService } from "@/lib/blockchain-service"
import { HashDisplay } from "@/components/ui/hash-display"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatDate, formatBlockNumber } from "@/lib/utils"
import { Document } from "@/types"

// ... imports
import { Download } from "lucide-react"

export default function VerifyPage() {
    // ... state
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
        <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl w-full space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                        Verify Document Authenticity
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Securely verify certificates and documents on the blockchain.
                        Enter the document hash or certificate ID below.
                    </p>
                </div>

                {/* Search Input */}
                <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-100">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <input
                            type="text"
                            value={hash}
                            onChange={(e) => setHash(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                            placeholder="Enter Certificate ID (e.g., CERT-123) or Document Hash (0x...)"
                            className="flex-1 px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-mono text-sm"
                        />
                        <button
                            onClick={handleVerify}
                            disabled={isVerifying || !hash.trim()}
                            className="px-8 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
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
                    <div className="bg-white rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 border border-green-100">
                        {/* Header */}
                        <div className="bg-green-50/50 p-8 border-b border-green-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center shadow-inner">
                                    <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">Valid Certificate</h2>
                                    <p className="text-green-700 font-medium flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        Verified on Blockchain
                                    </p>
                                </div>
                            </div>

                            {result.certificateId && result.ipfsCid && (
                                <a
                                    href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/verify/download/${result.certificateId}`}
                                    download
                                    className="px-6 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center gap-2 shadow-sm hover:shadow"
                                    target="_blank" rel="noopener noreferrer"
                                >
                                    <Download className="h-4 w-4" />
                                    Download Verified PDF
                                </a>
                            )}
                        </div>

                        {/* Content */}
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Issuing Organization</label>
                                    <p className="text-lg font-medium text-slate-900 mt-1">{result.organizationName || 'Unknown Organization'}</p>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recipient</label>
                                    {/* Handle potentially nested metadata */}
                                    <p className="text-lg font-medium text-slate-900 mt-1">
                                        {/* @ts-ignore - Temporary loose typing for demo */}
                                        {result.holderName || result.metadata?.name || result.metadata?.recipientName || 'N/A'}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Issue Date</label>
                                    <p className="mt-1 font-mono text-slate-700 bg-slate-50 inline-block px-3 py-1 rounded border border-slate-100">
                                        {formatDate(result.timestamp)}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Certificate ID</label>
                                    <p className="mt-1 font-mono text-sm text-slate-600 break-all bg-slate-50 p-3 rounded border border-slate-100">
                                        {/* @ts-ignore */}
                                        {result.certificateId || 'N/A'}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Document Hash</label>
                                    <div className="mt-1">
                                        <HashDisplay hash={result.hash} truncate={true} />
                                    </div>
                                </div>

                                {result.transactionHash && result.transactionHash !== 'N/A' && (
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Blockchain Proof</label>
                                        <a href="#" className="flex items-center gap-2 mt-1 text-primary hover:text-primary/80 hover:underline">
                                            <span>View Transaction</span>
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Not Found */}
                {notFound && (
                    <div className="p-8 rounded-xl bg-white shadow-lg border border-red-100 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-2">
                        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Verification Failed</h2>
                        <p className="text-slate-600 max-w-md">
                            We couldn't find a certificate matching that ID or hash. Please check your input and try again.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
