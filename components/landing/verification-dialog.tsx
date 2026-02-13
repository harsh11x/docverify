"use client"

import { useState } from "react"
import { X, Search, CheckCircle, AlertCircle, Loader2, QrCode, FileText } from "lucide-react"
import { Scanner } from '@yudiel/react-qr-scanner';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface VerificationDialogProps {
    isOpen: boolean
    onClose: () => void
}

export function VerificationDialog({ isOpen, onClose }: VerificationDialogProps) {
    const [activeTab, setActiveTab] = useState("id")
    const [inputValue, setInputValue] = useState("")
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState("")

    if (!isOpen) return null

    const handleClose = () => {
        setInputValue("")
        setStatus("idle")
        setResult(null)
        setError("")
        setActiveTab("id")
        onClose()
    }

    const handleVerify = async (value: string = inputValue) => {
        if (!value.trim()) return

        setStatus("loading")
        setError("")
        setResult(null)

        let endpoint = "/api/verify/cert-id"
        let body: any = { certificateId: value.trim() }

        if (activeTab === "hash") {
            endpoint = "/api/verify"
            body = { documentHash: value.trim() }
        }

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            })

            const data = await response.json()

            if (response.ok && data.success && data.verified) {
                setStatus("success")
                setResult(data.data)
            } else {
                setStatus("error")
                setError(data.error || "Verification failed. Document not found or invalid.")
            }
        } catch (err) {
            setStatus("error")
            setError("Failed to verify. Please check your connection.")
        }
    }

    const handleScan = (result: any) => {
        if (result) {
            // Assume QR contains raw text of ID or Hash, or a URL
            // Simple logic: if contains "http", try to extract ID param, else treat as ID
            let value = result[0]?.rawValue || "";
            if (!value) return;

            // Stop scanning once found
            setInputValue(value)

            // Auto-detect type if possible or just try ID first? 
            // For now, let's treat QR as ID source unless it looks like a hash (64 hex chars)
            const isHash = /^[a-fA-F0-9]{64}$/.test(value);

            if (isHash) {
                setActiveTab("hash");
                // Need to set active tab state before verify? valid might depend on it
                // Actually handleVerify uses activeTab state, so we might need to pass overrides
                // For simplicity, just set value in ID tab or Hash tab and let user click verify?
                // Or force verify:
                // We needs separate function or pass params
            } else {
                setActiveTab("id");
            }

            // To auto-verify, we need to handle the state update async issue
            // For now, populate the correct tab and let user confirm, or auto-submit
        }
    }

    const reset = () => {
        setInputValue("")
        setStatus("idle")
        setResult(null)
        setError("")
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal Content */}
            <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="text-lg font-semibold">Verify Document</h2>
                    <button
                        onClick={handleClose}
                        className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {status === "success" ? (
                        <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                                <CheckCircle className="h-8 w-8 text-green-500" />
                            </div>

                            <div>
                                <h3 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-1">
                                    Verified Successfully
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    This document is authentic and verified on the blockchain.
                                </p>
                            </div>

                            <div className="bg-muted/50 p-4 rounded-lg text-left text-sm space-y-3 border border-border">
                                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                                    <span className="text-muted-foreground">Organization</span>
                                    <span className="font-medium">{result?.organization?.name || "Unknown"}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                                    <span className="text-muted-foreground">Verified Date</span>
                                    <span className="font-medium">
                                        {result?.timestamp ? new Date(result.timestamp * 1000).toLocaleDateString() : "N/A"}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Certificate ID</span>
                                    <span className="font-medium font-mono text-xs bg-background px-2 py-1 rounded border border-border">
                                        {result?.certificateId || inputValue}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={reset}
                                className="w-full py-2 px-4 border border-border rounded-lg font-medium hover:bg-accent transition-colors"
                            >
                                Verify Another Document
                            </button>
                        </div>
                    ) : (
                        <Tabs defaultValue="id" value={activeTab} onValueChange={(val) => { setActiveTab(val); setError(""); }}>
                            <TabsList className="grid w-full grid-cols-3 mb-6">
                                <TabsTrigger value="id">Certificate ID</TabsTrigger>
                                <TabsTrigger value="hash">Doc Hash</TabsTrigger>
                                <TabsTrigger value="qr">Scan QR</TabsTrigger>
                            </TabsList>

                            <TabsContent value="id" className="space-y-4 mt-0">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Certificate ID / Serial Number
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            placeholder="Enter Certificate ID (e.g. CERT-2023...)"
                                            className="w-full px-4 py-2 pl-10 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                                            autoFocus
                                        />
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Enter the unique ID found on your certificate.
                                    </p>
                                </div>
                            </TabsContent>

                            <TabsContent value="hash" className="space-y-4 mt-0">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Document Hash (SHA-256)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            placeholder="e.g. 8f4343..."
                                            className="w-full px-4 py-2 pl-10 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all font-mono text-sm"
                                            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                                            autoFocus
                                        />
                                        <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Enter the cryptographic hash of the original document.
                                    </p>
                                </div>
                            </TabsContent>

                            <TabsContent value="qr" className="space-y-4 mt-0">
                                <div className="rounded-lg overflow-hidden border border-border bg-black aspect-square max-w-[300px] mx-auto relative">
                                    <Scanner
                                        onScan={handleScan}
                                        onError={(error) => console.log(error)}
                                        classNames={{ container: 'w-full h-full' }}
                                    />
                                    <div className="absolute inset-0 border-2 border-white/20 pointer-events-none flex items-center justify-center">
                                        <div className="w-48 h-48 border-2 border-white/50 rounded-lg" />
                                    </div>
                                </div>
                                <p className="text-xs text-center text-muted-foreground">
                                    Point your camera at the QR code on the certificate.
                                </p>
                            </TabsContent>

                            {status === "error" && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {activeTab !== 'qr' && (
                                <button
                                    onClick={() => handleVerify()}
                                    disabled={status === "loading" || !inputValue.trim()}
                                    className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {status === "loading" ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        <>
                                            Verify Certificate
                                        </>
                                    )}
                                </button>
                            )}
                        </Tabs>
                    )}
                </div>
            </div>
        </div>
    )
}
