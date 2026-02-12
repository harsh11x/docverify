"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    Home,
    Upload,
    Building2,
    BarChart3,
    Shield,
    Menu,
    X,
} from "lucide-react"
import { useState } from "react"

const userNavItems = [
    { href: "/dashboard/user", label: "Dashboard", icon: Home },
    { href: "/dashboard/user/upload", label: "Upload Document", icon: Upload },
    { href: "/verify", label: "Verify Document", icon: Shield },
]

const orgNavItems = [
    { href: "/dashboard/org", label: "Dashboard", icon: Home },
    { href: "/dashboard/org/certificates", label: "Certificates", icon: Upload },
    { href: "/dashboard/org/sync", label: "Sync Status", icon: Building2 },
]

const governanceNavItems = [
    { href: "/dashboard/governance", label: "Dashboard", icon: Home },
    { href: "/dashboard/governance/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/dashboard/governance/network", label: "Network Health", icon: Shield },
]

interface SidebarProps {
    role?: "user" | "organization" | "governance"
}

export function Sidebar({ role = "user" }: SidebarProps) {
    const pathname = usePathname()
    const [isOpen, setIsOpen] = useState(false)

    const navItems =
        role === "organization"
            ? orgNavItems
            : role === "governance"
                ? governanceNavItems
                : userNavItems

    return (
        <>
            {/* Mobile menu button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border"
            >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed left-0 top-0 z-40 h-screen w-64 bg-card border-r border-border transition-transform lg:translate-x-0",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex flex-col h-full p-4">
                    {/* Logo */}
                    <div className="mb-8 mt-4">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-blockchain flex items-center justify-center">
                                <Shield className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xl font-bold">DocVerify</span>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                    )}
                                    onClick={() => setIsOpen(false)}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="pt-4 border-t border-border">
                        <div className="text-xs text-muted-foreground">
                            <p>Smart Contract</p>
                            <p className="font-mono mt-1">0x1234...5678</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    )
}
