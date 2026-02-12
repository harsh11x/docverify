import { UploadDropzone } from "@/components/dashboard/upload-dropzone"
import { VerificationCard } from "@/components/dashboard/verification-card"
import { mockDocuments } from "@/lib/mock-data"
import { FileText, Upload, CheckCircle2 } from "lucide-react"

export default function UserDashboard() {
    const stats = [
        {
            label: "Total Documents",
            value: "12",
            icon: FileText,
            color: "text-blue-500",
        },
        {
            label: "Verified",
            value: "10",
            icon: CheckCircle2,
            color: "text-verification-verified",
        },
        {
            label: "Pending",
            value: "2",
            icon: Upload,
            color: "text-verification-pending",
        },
    ]

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-2">User Dashboard</h1>
                <p className="text-muted-foreground">
                    Upload and verify your documents on the blockchain
                </p>
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

            {/* Upload Section */}
            <div className="p-6 rounded-lg border border-border bg-card">
                <h2 className="text-xl font-semibold mb-4">Upload Document</h2>
                <UploadDropzone />
            </div>

            {/* Recent Documents */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Recent Documents</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {mockDocuments.map((doc) => (
                        <VerificationCard key={doc.id} document={doc} />
                    ))}
                </div>
            </div>
        </div>
    )
}
