import { VerificationStatus } from "@/types"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
    status: VerificationStatus
    className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const variants = {
        pending: "bg-verification-pending/20 text-verification-pending border-verification-pending/30",
        verified: "bg-verification-verified/20 text-verification-verified border-verification-verified/30",
        rejected: "bg-verification-rejected/20 text-verification-rejected border-verification-rejected/30",
        not_found: "bg-muted text-muted-foreground border-border",
    }

    const labels = {
        pending: "Pending",
        verified: "Verified",
        rejected: "Rejected",
        not_found: "Not Found",
    }

    return (
        <span
            className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                variants[status],
                className
            )}
        >
            {labels[status]}
        </span>
    )
}
