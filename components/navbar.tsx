"use client"

import { WalletConnect } from "./wallet-connect"
import { ThemeToggle } from "./theme-toggle"
import { NetworkIndicator } from "./ui/network-indicator"
import { UserRole } from "@/types"
import { cn } from "@/lib/utils"

interface NavbarProps {
    role?: UserRole
    className?: string
}

const roleBadges = {
    user: { label: "User", color: "bg-blue-500/20 text-blue-500 border-blue-500/30" },
    organization: { label: "Organization", color: "bg-purple-500/20 text-purple-500 border-purple-500/30" },
    governance: { label: "Governance", color: "bg-amber-500/20 text-amber-500 border-amber-500/30" },
}

export function Navbar({ role = "user", className }: NavbarProps) {
    const badge = roleBadges[role]

    return (
        <nav
            className={cn(
                "sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
                className
            )}
        >
            <div className="flex h-16 items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <NetworkIndicator status="connected" blockHeight={18234567} />
                </div>

                <div className="flex items-center gap-4">
                    <span
                        className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium border",
                            badge.color
                        )}
                    >
                        {badge.label}
                    </span>
                    <ThemeToggle />
                    <WalletConnect />
                </div>
            </div>
        </nav>
    )
}
