"use client"

import { ArrowRight } from "lucide-react"

const steps = [
    { label: "Upload", description: "Upload your document" },
    { label: "Hash", description: "SHA-256 hashing" },
    { label: "IPFS", description: "Decentralized storage" },
    { label: "Smart Contract", description: "Blockchain submission" },
    { label: "Consensus", description: "Multi-node verification" },
    { label: "Verified", description: "Immutable proof" },
]

export function SecurityLayerVisualization() {
    return (
        <div className="w-full">
            <h3 className="text-lg font-semibold mb-4">Security Process Flow</h3>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-primary font-bold">
                                {index + 1}
                            </div>
                            <div className="mt-2 text-center">
                                <div className="font-medium text-sm">{step.label}</div>
                                <div className="text-xs text-muted-foreground">{step.description}</div>
                            </div>
                        </div>
                        {index < steps.length - 1 && (
                            <ArrowRight className="h-5 w-5 text-muted-foreground hidden md:block" />
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
