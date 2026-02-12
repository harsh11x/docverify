"use client"

import { useState } from "react"
import { Building2, GraduationCap, Briefcase, X, ChevronRight, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface JoinDialogProps {
    isOpen: boolean
    onClose: () => void
}

type Category = "institutional" | "governmental" | "corporate"

export function JoinDialog({ isOpen, onClose }: JoinDialogProps) {
    const router = useRouter()
    const [step, setStep] = useState<1 | 2>(1)
    const [category, setCategory] = useState<Category | null>(null)
    const [subCategory, setSubCategory] = useState("")

    if (!isOpen) return null

    const handleCategorySelect = (selected: Category) => {
        setCategory(selected)
        setStep(2)
        setSubCategory("") // Reset subcategory
    }

    const handleBack = () => {
        setStep(1)
        setCategory(null)
    }

    const handleSubmit = () => {
        if (category && subCategory) {
            const params = new URLSearchParams({
                type: category,
                subtype: subCategory
            })
            router.push(`/register-organization?${params.toString()}`)
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative z-10 w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="text-lg font-semibold">
                        {step === 1 ? "Join DocVerify" : "Select Organization Type"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {step === 1 ? (
                        <div className="space-y-4">
                            <p className="text-muted-foreground mb-6">
                                Choose the category that best describes your organization to get started.
                            </p>

                            <button
                                onClick={() => handleCategorySelect("institutional")}
                                className="w-full flex items-center p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all group text-left"
                            >
                                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center mr-4 group-hover:bg-blue-500/20 transition-colors">
                                    <GraduationCap className="h-5 w-5 text-blue-500" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-medium">Institutional</h3>
                                    <p className="text-xs text-muted-foreground">Schools, Colleges, Universities</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                            </button>

                            <button
                                onClick={() => handleCategorySelect("governmental")}
                                className="w-full flex items-center p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all group text-left"
                            >
                                <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center mr-4 group-hover:bg-amber-500/20 transition-colors">
                                    <Building2 className="h-5 w-5 text-amber-500" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-medium">Governmental</h3>
                                    <p className="text-xs text-muted-foreground">Hospitals, Public Sector Units</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                            </button>

                            <button
                                onClick={() => handleCategorySelect("corporate")}
                                className="w-full flex items-center p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all group text-left"
                            >
                                <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center mr-4 group-hover:bg-purple-500/20 transition-colors">
                                    <Briefcase className="h-5 w-5 text-purple-500" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-medium">Corporate</h3>
                                    <p className="text-xs text-muted-foreground">Companies, Private Enterprises</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <button
                                onClick={handleBack}
                                className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                            >
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                Back to categories
                            </button>

                            <div>
                                <h3 className="text-xl font-semibold mb-2 capitalize">
                                    {category} Details
                                </h3>
                                <p className="text-muted-foreground text-sm">
                                    Please specify your organization subtype.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-medium">
                                    Organization Subtype
                                </label>

                                {category === "institutional" ? (
                                    <select
                                        value={subCategory}
                                        onChange={(e) => setSubCategory(e.target.value)}
                                        className="w-full px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="">Select subtype</option>
                                        <option value="school">School</option>
                                        <option value="college">College</option>
                                        <option value="university">University</option>
                                        <option value="private-institute">Private Institute</option>
                                    </select>
                                ) : (
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={subCategory}
                                            onChange={(e) => setSubCategory(e.target.value)}
                                            placeholder={`Enter ${category} sector (e.g., Healthcare, Banking)`}
                                            className="w-full px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            * Excluding educational institutes
                                        </p>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={!subCategory}
                                className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Continue to Signup
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
