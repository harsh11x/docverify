"use client"

import { useState } from "react"
import { Building2, Loader2, CheckCircle2 } from "lucide-react"
import { blockchainService } from "@/lib/blockchain-service"
import { OrganizationType } from "@/types"

export default function RegisterOrganization() {
    const [formData, setFormData] = useState({
        name: "",
        type: "institutional" as OrganizationType,
        registrationId: "",
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [txHash, setTxHash] = useState<string>("")
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const hash = await blockchainService.registerOrganization(
                formData.name,
                formData.type
            )
            setTxHash(hash)
            setSuccess(true)
        } catch (error) {
            console.error("Failed to register organization:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6 py-12">
                <div className="max-w-2xl w-full">
                    <div className="p-8 rounded-lg border-2 border-verification-verified bg-verification-verified/5">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-full bg-verification-verified/20 flex items-center justify-center">
                                <CheckCircle2 className="h-6 w-6 text-verification-verified" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-verification-verified">
                                    Registration Successful
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Your organization has been registered on the blockchain
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground mb-2">
                                    Organization Name
                                </p>
                                <p className="text-lg font-semibold">{formData.name}</p>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground mb-2">Type</p>
                                <p className="text-lg font-semibold capitalize">{formData.type}</p>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground mb-2">
                                    Transaction Hash
                                </p>
                                <p className="text-sm font-mono bg-muted px-3 py-2 rounded">
                                    {txHash}
                                </p>
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={() => (window.location.href = "/dashboard/org")}
                                    className="w-full px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
                                >
                                    Go to Organization Dashboard
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12">
            <div className="max-w-2xl w-full space-y-8">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-lg bg-gradient-blockchain flex items-center justify-center mx-auto mb-4">
                        <Building2 className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold mb-4">Register Organization</h1>
                    <p className="text-muted-foreground text-lg">
                        Join the decentralized verification network
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 rounded-lg border border-border bg-card space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Organization Name
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) =>
                                setFormData({ ...formData, name: e.target.value })
                            }
                            required
                            className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Enter organization name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Organization Type
                        </label>
                        <select
                            value={formData.type}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    type: e.target.value as OrganizationType,
                                })
                            }
                            className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="institutional">
                                Institutional (Schools, Universities, Coaching Centers)
                            </option>
                            <option value="governmental">
                                Governmental (Hospitals, Banks, Public Sector)
                            </option>
                            <option value="private">
                                Private Corporate (Private Hospitals, Banks, Companies)
                            </option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Registration ID
                        </label>
                        <input
                            type="text"
                            value={formData.registrationId}
                            onChange={(e) =>
                                setFormData({ ...formData, registrationId: e.target.value })
                            }
                            required
                            className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Enter official registration ID"
                        />
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">
                            By registering, you agree to:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mt-2">
                            <li>Maintain accurate and up-to-date organization information</li>
                            <li>Follow blockchain verification standards</li>
                            <li>Sync with Hyperledger Fabric network</li>
                            <li>Pay gas fees for blockchain transactions</li>
                        </ul>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Registering on Blockchain...
                            </>
                        ) : (
                            "Register Organization"
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
