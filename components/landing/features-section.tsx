"use client"

import { Shield, Lock, Globe, Zap, FileCheck, Database } from "lucide-react"

const features = [
    {
        icon: Shield,
        title: "Tamper-proof Verification",
        description: "Immutable blockchain records ensure document authenticity cannot be altered",
    },
    {
        icon: Zap,
        title: "Smart Contract Automation",
        description: "Zero human intervention with automated verification workflows",
    },
    {
        icon: Database,
        title: "IPFS Decentralized Storage",
        description: "Distributed file storage with permanent, censorship-resistant access",
    },
    {
        icon: Globe,
        title: "Multi-Organization Support",
        description: "Cross-institution verification with institutional, governmental, and private entities",
    },
    {
        icon: Lock,
        title: "Cryptographic Security",
        description: "SHA-256 hashing with multi-node consensus verification",
    },
    {
        icon: FileCheck,
        title: "Real-time Validation",
        description: "Instant verification status with blockchain transaction tracking",
    },
]

export function FeaturesSection() {
    return (
        <section className="py-20 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Enterprise-Grade Blockchain Security
                    </h2>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Built on Ethereum and Hyperledger Fabric for maximum security and scalability
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => {
                        const Icon = feature.icon
                        return (
                            <div
                                key={index}
                                className="group p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
                            >
                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                                    <Icon className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                                <p className="text-muted-foreground text-sm">{feature.description}</p>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
