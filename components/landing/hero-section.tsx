"use client"

import Link from "next/link"
import { WalletConnect } from "../wallet-connect"
import { ArrowRight, Shield } from "lucide-react"
import { useState } from "react"
import { JoinDialog } from "@/components/auth/join-dialog"
import { VerificationDialog } from "./verification-dialog"

export function HeroSection() {
    const [isJoinOpen, setIsJoinOpen] = useState(false)
    const [isVerifyOpen, setIsVerifyOpen] = useState(false)

    return (
        <section className="relative min-h-[90vh] flex items-center justify-center px-6 overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/5 to-background">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(76,_140,_255,_0.1),transparent_50%)] animate-pulse-slow" />
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-5xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">
                        Powered by Ethereum & Hyperledger Fabric
                    </span>
                </div>

                <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Decentralized Document Verification
                    <br />
                    <span className="bg-gradient-blockchain bg-clip-text text-transparent">
                        Powered by Blockchain
                    </span>
                </h1>

                <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto">
                    Immutable document validation with cross-institution verification.
                    Zero human intervention. Real-time blockchain proof.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <WalletConnect />

                    <button
                        onClick={() => setIsVerifyOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-border hover:bg-accent transition-colors font-medium"
                    >
                        Verify Document
                    </button>

                    <button
                        onClick={() => setIsJoinOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/20"
                    >
                        Join Now
                        <ArrowRight className="h-4 w-4" />
                    </button>

                    <JoinDialog
                        isOpen={isJoinOpen}
                        onClose={() => setIsJoinOpen(false)}
                    />
                    <VerificationDialog
                        isOpen={isVerifyOpen}
                        onClose={() => setIsVerifyOpen(false)}
                    />
                </div>

                <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
                    <div>
                        <div className="text-3xl font-bold text-primary mb-2">15K+</div>
                        <div className="text-sm text-muted-foreground">Documents Verified</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-primary mb-2">340+</div>
                        <div className="text-sm text-muted-foreground">Organizations</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-primary mb-2">24</div>
                        <div className="text-sm text-muted-foreground">Network Nodes</div>
                    </div>
                </div>
            </div>
        </section>
    )
}
