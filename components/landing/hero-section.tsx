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
            <div className="absolute inset-0 bg-background">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] animate-float" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/20 blur-[120px] animate-float" style={{ animationDelay: "2s" }} />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(17,24,39,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(17,24,39,0.5)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-5xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm animate-fade-in">
                    <Shield className="h-4 w-4 text-primary animate-pulse-slow" />
                    <span className="text-sm font-medium text-foreground/80">
                        Powered by Ethereum & Hyperledger Fabric
                    </span>
                </div>

                <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
                    Decentralized Document
                    <br />
                    <span className="bg-gradient-blockchain bg-clip-text text-transparent text-glow">
                        Verification
                    </span>
                </h1>

                <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
                    Immutable document validation with cross-institution verification.
                    <br className="hidden md:block" />
                    Zero human intervention. Real-time blockchain proof.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
                    <WalletConnect />

                    <button
                        onClick={() => setIsVerifyOpen(true)}
                        className="flex items-center gap-2 px-8 py-3 rounded-xl border border-border/50 bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all font-medium hover:scale-105 active:scale-95"
                    >
                        Verify Document
                    </button>

                    <button
                        onClick={() => setIsJoinOpen(true)}
                        className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-blockchain text-white hover:opacity-90 transition-all font-medium shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-105 active:scale-95"
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

                <div className="mt-20 grid grid-cols-3 gap-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.4s" }}>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                        <div className="text-3xl font-bold text-primary mb-1">15K+</div>
                        <div className="text-sm text-muted-foreground">Documents Verified</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                        <div className="text-3xl font-bold text-purple-500 mb-1">340+</div>
                        <div className="text-sm text-muted-foreground">Organizations</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                        <div className="text-3xl font-bold text-cyan-500 mb-1">24</div>
                        <div className="text-sm text-muted-foreground">Network Nodes</div>
                    </div>
                </div>
            </div>
        </section>
    )
}
