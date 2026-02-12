import { mockAnalytics } from "@/lib/mock-data"
import {
    FileText,
    CheckCircle2,
    Clock,
    XCircle,
    Building2,
    Activity,
    Zap,
    Server,
} from "lucide-react"

export default function GovernanceDashboard() {
    const stats = [
        {
            label: "Total Documents",
            value: mockAnalytics.totalDocuments.toLocaleString(),
            icon: FileText,
            color: "text-blue-500",
            trend: "+12.5%",
        },
        {
            label: "Verified Documents",
            value: mockAnalytics.verifiedDocuments.toLocaleString(),
            icon: CheckCircle2,
            color: "text-verification-verified",
            trend: "+8.3%",
        },
        {
            label: "Pending Verification",
            value: mockAnalytics.pendingDocuments.toLocaleString(),
            icon: Clock,
            color: "text-verification-pending",
            trend: "-2.1%",
        },
        {
            label: "Rejected Documents",
            value: mockAnalytics.rejectedDocuments.toLocaleString(),
            icon: XCircle,
            color: "text-verification-rejected",
            trend: "-5.4%",
        },
        {
            label: "Active Organizations",
            value: mockAnalytics.activeOrganizations.toLocaleString(),
            icon: Building2,
            color: "text-purple-500",
            trend: "+15.2%",
        },
        {
            label: "Total Transactions",
            value: mockAnalytics.totalTransactions.toLocaleString(),
            icon: Activity,
            color: "text-cyan-500",
            trend: "+22.7%",
        },
        {
            label: "Smart Contract Calls",
            value: mockAnalytics.smartContractCalls.toLocaleString(),
            icon: Zap,
            color: "text-amber-500",
            trend: "+18.9%",
        },
        {
            label: "Network Nodes",
            value: mockAnalytics.networkNodes.toLocaleString(),
            icon: Server,
            color: "text-emerald-500",
            trend: "+4.2%",
        },
    ]

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-2">Governance Dashboard</h1>
                <p className="text-muted-foreground">
                    Network analytics and system health monitoring
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => {
                    const Icon = stat.icon
                    const isPositive = stat.trend.startsWith("+")

                    return (
                        <div
                            key={index}
                            className="p-6 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <Icon className={`h-6 w-6 ${stat.color}`} />
                                <span
                                    className={`text-xs font-medium ${isPositive ? "text-verification-verified" : "text-verification-rejected"
                                        }`}
                                >
                                    {stat.trend}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                            <p className="text-2xl font-bold">{stat.value}</p>
                        </div>
                    )
                })}
            </div>

            {/* Network Health */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 rounded-lg border border-border bg-card">
                    <h2 className="text-xl font-semibold mb-4">Network Health</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Consensus Status</span>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-verification-verified animate-pulse-slow" />
                                <span className="text-sm font-medium">Healthy</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Block Height</span>
                            <span className="text-sm font-medium">#18,234,567</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Average Block Time</span>
                            <span className="text-sm font-medium">12.5s</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Network Hashrate</span>
                            <span className="text-sm font-medium">892.4 TH/s</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 rounded-lg border border-border bg-card">
                    <h2 className="text-xl font-semibold mb-4">Cross-Chain Sync</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Ethereum Mainnet</span>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-verification-verified" />
                                <span className="text-sm font-medium">Synced</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Hyperledger Fabric</span>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-verification-verified" />
                                <span className="text-sm font-medium">Synced</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">IPFS Network</span>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-verification-verified" />
                                <span className="text-sm font-medium">Online</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Last Sync</span>
                            <span className="text-sm font-medium">2 minutes ago</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
