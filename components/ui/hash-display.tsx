"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { truncateHash } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface HashDisplayProps {
    hash: string
    truncate?: boolean
    className?: string
}

export function HashDisplay({ hash, truncate = true, className }: HashDisplayProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        await navigator.clipboard.writeText(hash)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div
            className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted font-mono text-sm",
                className
            )}
        >
            <span className="text-muted-foreground">
                {truncate ? truncateHash(hash) : hash}
            </span>
            <button
                onClick={handleCopy}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Copy hash"
            >
                {copied ? (
                    <Check className="h-4 w-4 text-verification-verified" />
                ) : (
                    <Copy className="h-4 w-4" />
                )}
            </button>
        </div>
    )
}
