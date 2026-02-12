import { Document } from "@/types"
import { StatusBadge } from "../ui/status-badge"
import { HashDisplay } from "../ui/hash-display"
import { formatDate, formatBlockNumber } from "@/lib/utils"
import { ExternalLink, FileText } from "lucide-react"

interface VerificationCardProps {
    document: Document
}

export function VerificationCard({ document }: VerificationCardProps) {
    return (
        <div className="p-6 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold">{document.fileName}</h3>
                        <p className="text-sm text-muted-foreground">{formatDate(document.timestamp)}</p>
                    </div>
                </div>
                <StatusBadge status={document.status} />
            </div>

            <div className="space-y-3">
                <div>
                    <p className="text-xs text-muted-foreground mb-1">Document Hash</p>
                    <HashDisplay hash={document.hash} />
                </div>

                <div>
                    <p className="text-xs text-muted-foreground mb-1">IPFS CID</p>
                    <HashDisplay hash={document.ipfsCid} />
                </div>

                {document.organizationName && (
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Issuing Organization</p>
                        <p className="text-sm font-medium">{document.organizationName}</p>
                    </div>
                )}

                {document.blockNumber && (
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Block Number</p>
                            <p className="text-sm font-medium">{formatBlockNumber(document.blockNumber)}</p>
                        </div>
                        {document.transactionHash && (
                            <a
                                href={`https://etherscan.io/tx/${document.transactionHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                                View on Etherscan
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
