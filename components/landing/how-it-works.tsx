"use client"

import { Upload, Hash, Database, FileCheck, CheckCircle2, Shield } from "lucide-react"

const steps = [
    {
        icon: Upload,
        title: "Upload Document",
        description: "Drag and drop your document for verification",
    },
    {
        icon: Hash,
        title: "Generate Hash",
        description: "Client-side SHA-256 cryptographic hashing",
    },
    {
        icon: Database,
        title: "IPFS Storage",
        description: "Store on decentralized IPFS network",
    },
    {
        icon: FileCheck,
        title: "Smart Contract",
        description: "Submit to blockchain via smart contract",
    },
    {
        icon: Shield,
        title: "Multi-Node Consensus",
        description: "Verify across distributed network nodes",
    },
    {
        icon: CheckCircle2,
        title: "Verified",
        description: "Receive immutable blockchain proof",
    },
]

export function HowItWorks() {
    return (
        <section className="py-20 px-6 bg-muted/30">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Simple, secure, and fully automated document verification process
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {steps.map((step, index) => {
                        const Icon = step.icon
                        return (
                            <div key={index} className="relative">
                                <div className="flex flex-col items-center text-center">
                                    <div className="relative mb-4">
                                        <div className="w-16 h-16 rounded-full bg-gradient-blockchain flex items-center justify-center">
                                            <Icon className="h-8 w-8 text-white" />
                                        </div>
                                        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                                            {index + 1}
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                                    <p className="text-muted-foreground text-sm">{step.description}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
