"use client"

import { NetworkStatus } from "@/types"
import { cn } from "@/lib/utils"

interface NetworkIndicatorProps {
    status: NetworkStatus
    blockHeight?: number
    className?: string
}

export function NetworkIndicator({ status, blockHeight, className }: NetworkIndicatorProps) {
    const statusColors = {
        connected: "bg-verification-verified",
        disconnected: "bg-verification-rejected",
        syncing: "bg-verification-pending",
    }

    const statusLabels = {
        connected: "Connected",
        disconnected: "Disconnected",
        syncing: "Syncing",
    }

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <div className="relative">
                <div
                    className={cn(
                        "w-2 h-2 rounded-full",
                        statusColors[status]
                    )}
                />
                {status === "connected" && (
                    <div
                        className={cn(
                            "absolute inset-0 w-2 h-2 rounded-full animate-pulse-slow",
                            statusColors[status]
                        )}
                    />
                )}
            </div>
            <div className="text-sm">
                <span className="text-foreground font-medium">{statusLabels[status]}</span>
                {blockHeight && (
                    <span className="text-muted-foreground ml-2">
                        Block #{blockHeight.toLocaleString()}
                    </span>
                )}
            </div>
        </div>
    )
}
