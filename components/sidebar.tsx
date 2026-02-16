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
                    "fixed left-0 top-0 z-40 h-screen w-64 glass border-r border-border/50 transition-transform lg:translate-x-0 pt-16 lg:pt-0",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex flex-col h-full p-4">
                    {/* Logo (Desktop only) */}
                    <div className="hidden lg:flex mb-8 mt-4 px-2">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-10 h-10 rounded-xl bg-gradient-blockchain flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
                                <Shield className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">DocVerify</span>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-2 mt-4">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                                        isActive
                                            ? "text-primary-foreground font-medium"
                                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                    )}
                                    onClick={() => setIsOpen(false)}
                                >
                                    {isActive && (
                                        <div className="absolute inset-0 bg-gradient-blockchain opacity-100" />
                                    )}
                                    <Icon className={cn("h-5 w-5 relative z-10", isActive ? "text-white" : "group-hover:text-primary transition-colors")} />
                                    <span className="relative z-10">{item.label}</span>
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="pt-4 border-t border-border/50 px-2">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <p className="text-xs text-muted-foreground mb-1">Network Status</p>
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-xs font-medium">Online</span>
                            </div>
                            <p className="font-mono text-[10px] text-muted-foreground mt-2 truncate">0x742d...595f</p>
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
