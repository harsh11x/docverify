"use client"

import { Sidebar } from "@/components/sidebar"
import { Navbar } from "@/components/navbar"
import { UserRole } from "@/types"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // In a real app, get role from auth context
    const role: UserRole = "user"

    return (
        <div className="min-h-screen flex">
            <Sidebar role={role} />
            <div className="flex-1 lg:ml-64">
                <Navbar role={role} />
                <main className="p-6">{children}</main>
            </div>
        </div>
    )
}
