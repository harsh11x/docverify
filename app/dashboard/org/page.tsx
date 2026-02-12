import { mockOrganizations } from "@/lib/mock-data"
import { Building2, CheckCircle2, Clock, Database } from "lucide-react"
import { HashDisplay } from "@/components/ui/hash-display"

export default function OrganizationDashboard() {
    const org = mockOrganizations[0]

    const stats = [
        {
            label: "Certificates Issued",
            value: "1,234",
            icon: CheckCircle2,
            color: "text-verification-verified",
        },
        {
            label: "Pending Sync",
            value: "5",
            icon: Clock,
            color: "text-verification-pending",
        },
        {
            label: "Sync Status",
            value: "Active",
            icon: Database,
            color: "text-blue-500",
        },
    ]

    const recentCertificates = [
        {
            id: "1",
            studentWallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
            certificateHash: "0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z",
            timestamp: new Date("2024-02-10T10:30:00"),
            syncStatus: "synced",
        },
        {
            id: "2",
            studentWallet: "0x853e46Dd7745D0543936a4c855Cd9f6a70f1dFc",
            certificateHash: "0x2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a",
            timestamp: new Date("2024-02-09T14:20:00"),
            syncStatus: "syncing",
        },
    ]

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-2">Organization Dashboard</h1>
                <p className="text-muted-foreground">
                    Manage certificates and sync with blockchain
                </p>
            </div>

            {/* Organization Profile */}
            <div className="p-6 rounded-lg border border-border bg-card">
                <div className="flex items-start gap-4 mb-6">
                    <div className="w-16 h-16 rounded-lg bg-gradient-blockchain flex items-center justify-center">
                        <Building2 className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-bold">{org.name}</h2>
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-500 border border-purple-500/30">
                                {org.type.charAt(0).toUpperCase() + org.type.slice(1)}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Registration ID: {org.registrationId}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-muted-foreground mb-2">
                            Blockchain Registration Hash
                        </p>
                        <HashDisplay hash={org.blockchainHash} />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-2">
                            Smart Contract Address
                        </p>
                        <HashDisplay hash={org.smartContractAddress} />
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, index) => {
                    const Icon = stat.icon
                    return (
                        <div
                            key={index}
                            className="p-6 rounded-lg border border-border bg-card"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">
                                        {stat.label}
                                    </p>
                                    <p className="text-3xl font-bold">{stat.value}</p>
                                </div>
                                <Icon className={`h-8 w-8 ${stat.color}`} />
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Recent Certificates */}
            <div className="p-6 rounded-lg border border-border bg-card">
                <h2 className="text-xl font-semibold mb-4">Recent Certificates</h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                                    Student Wallet
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                                    Certificate Hash
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                                    Timestamp
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                                    Sync Status
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentCertificates.map((cert) => (
                                <tr key={cert.id} className="border-b border-border last:border-0">
                                    <td className="py-3 px-4">
                                        <HashDisplay hash={cert.studentWallet} />
                                    </td>
                                    <td className="py-3 px-4">
                                        <HashDisplay hash={cert.certificateHash} />
                                    </td>
                                    <td className="py-3 px-4 text-sm">
                                        {cert.timestamp.toLocaleString()}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${cert.syncStatus === "synced"
                                                    ? "bg-verification-verified/20 text-verification-verified"
                                                    : "bg-verification-pending/20 text-verification-pending"
                                                }`}
                                        >
                                            {cert.syncStatus}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
