"use client"

import Link from "next/link"
import { Shield } from "lucide-react"
import { useState } from "react"
import { JoinDialog } from "@/components/auth/join-dialog"
import { ThemeToggle } from "@/components/theme-toggle"

export function SiteHeader() {
    const [isJoinOpen, setIsJoinOpen] = useState(false)

    return (
        <>
            <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex h-16 items-center justify-between px-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-6">
                        <Link href="/" className="flex items-center gap-2">
                            <Shield className="h-6 w-6 text-primary" />
                            <span className="font-bold text-lg">DocVerify</span>
                        </Link>

                        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                            <Link href="/verify" className="text-muted-foreground hover:text-foreground transition-colors">
                                Verify
                            </Link>
                            <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                                Features
                            </Link>
                            <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                                Network
                            </Link>
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />

                        <Link
                            href="/dashboard/user"
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
                        >
                            Login
                        </Link>

                        <button
                            onClick={() => setIsJoinOpen(true)}
                            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            Sign Up
                        </button>
                    </div>
                </div>
            </header>

            <JoinDialog
                isOpen={isJoinOpen}
                onClose={() => setIsJoinOpen(false)}
            />
        </>
    )
}
