"use client"

import { useState, useCallback, useMemo } from "react"
import { Upload, File, X, Loader2, Building, Building2, Briefcase } from "lucide-react"
import { hashFile } from "@/lib/hash-service"
import { ipfsService } from "@/lib/ipfs-service"
import { blockchainService } from "@/lib/blockchain-service"
import { formatFileSize } from "@/lib/utils"
import { HashDisplay } from "../ui/hash-display"
import { mockOrganizations } from "@/lib/mock-data"
import { OrganizationType } from "@/types"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"]

const categories = [
    { value: "institutional", label: "Institutional", icon: Building },
    { value: "governmental", label: "Governmental", icon: Building2 },
    { value: "corporate", label: "Corporate", icon: Briefcase },
]

const subCategories: Record<string, { value: string; label: string }[]> = {
    institutional: [
        { value: "school", label: "School" },
        { value: "college", label: "College" },
        { value: "university", label: "University" },
        { value: "private-institute", label: "Private Institute" },
    ],
    governmental: [
        { value: "hospital", label: "Hospital" },
        { value: "public-sector", label: "Public Sector" },
    ],
    corporate: [
        { value: "company", label: "Company" },
        { value: "financial", label: "Financial Institutions" },
        { value: "tech", label: "Technology" },
    ],
}

export function UploadDropzone() {
    const [file, setFile] = useState<File | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [hash, setHash] = useState<string>("")
    const [ipfsCid, setIpfsCid] = useState<string>("")
    const [uploadProgress, setUploadProgress] = useState(0)
    const [txHash, setTxHash] = useState<string>("")
    const [status, setStatus] = useState<"idle" | "hashing" | "uploading" | "submitting" | "complete">("idle")
    const [error, setError] = useState<string>("")

    // Organization Selection State
    const [selectedCategory, setSelectedCategory] = useState<OrganizationType | "">("")
    const [selectedSubCategory, setSelectedSubCategory] = useState<string>("")
    const [selectedOrgId, setSelectedOrgId] = useState<string>("")

    const filteredOrganizations = useMemo(() => {
        if (!selectedCategory || !selectedSubCategory) return []
        return mockOrganizations.filter(
            (org) =>
                org.type === selectedCategory &&
                org.subtype === selectedSubCategory &&
                (org.status === 'verified' || org.isActive) // Only show active/verified orgs
        )
    }, [selectedCategory, selectedSubCategory])

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedCategory(e.target.value as OrganizationType)
        setSelectedSubCategory("")
        setSelectedOrgId("")
    }

    const handleSubCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedSubCategory(e.target.value)
        setSelectedOrgId("")
    }

    const validateFile = (file: File): string | null => {
        if (!selectedOrgId) {
            return "Please select an issuing organization before uploading."
        }
        if (file.size > MAX_FILE_SIZE) {
            return `File size exceeds ${formatFileSize(MAX_FILE_SIZE)}`
        }
        if (!ALLOWED_TYPES.includes(file.type)) {
            return "File type not supported. Please upload PDF, PNG, or JPEG files."
        }
        return null
    }

    const handleFile = async (file: File) => {
        const validationError = validateFile(file)
        if (validationError) {
            setError(validationError)
            return
        }

        setFile(file)
        setError("")
        setStatus("hashing")

        try {
            // Step 1: Hash the file
            const fileHash = await hashFile(file)
            setHash(fileHash)

            // Step 2: Upload to IPFS
            setStatus("uploading")
            const result = await ipfsService.uploadFile(file, (progress) => {
                setUploadProgress(progress)
            })
            setIpfsCid(result.cid)

            // Step 3: Submit to blockchain
            setStatus("submitting")
            // In a real app, we would pass the selectedOrgId to the smart contract
            // For now, valid organization selection is enforced by UI
            const transactionHash = await blockchainService.submitDocument(fileHash, result.cid)
            setTxHash(transactionHash)

            setStatus("complete")
        } catch (err) {
            setError("Failed to process document. Please try again.")
            setStatus("idle")
        }
    }

    const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)

        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile) {
            handleFile(droppedFile)
        }
    }, [])

    const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const onDragLeave = useCallback(() => {
        setIsDragging(false)
    }, [])

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            handleFile(selectedFile)
        }
    }

    const reset = () => {
        setFile(null)
        setHash("")
        setIpfsCid("")
        setTxHash("")
        setUploadProgress(0)
        setStatus("idle")
        setError("")
    }

    return (
        <div className="w-full">
            {/* Organization Selection Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select
                        value={selectedCategory}
                        onChange={handleCategoryChange}
                        className="w-full px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="">Select Category</option>
                        {categories.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                                {cat.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Sub-Category</label>
                    <select
                        value={selectedSubCategory}
                        onChange={handleSubCategoryChange}
                        disabled={!selectedCategory}
                        className="w-full px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    >
                        <option value="">Select Sub-Category</option>
                        {selectedCategory && subCategories[selectedCategory]?.map((sub) => (
                            <option key={sub.value} value={sub.value}>
                                {sub.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Issuing Organization</label>
                    <select
                        value={selectedOrgId}
                        onChange={(e) => setSelectedOrgId(e.target.value)}
                        disabled={!selectedSubCategory}
                        className="w-full px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    >
                        <option value="">Select Organization</option>
                        {filteredOrganizations.map((org) => (
                            <option key={org.id} value={org.id}>
                                {org.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {status === "idle" && !file && (
                <div
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${isDragging
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                        } ${!selectedOrgId ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Upload Document</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Drag and drop your file here, or click to browse
                    </p>
                    <input
                        type="file"
                        onChange={onFileSelect}
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        id="file-upload"
                        disabled={!selectedOrgId}
                    />
                    <label
                        htmlFor="file-upload"
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer ${!selectedOrgId ? "pointer-events-none opacity-50" : ""}`}
                    >
                        <File className="h-4 w-4" />
                        Select File
                    </label>
                    <p className="text-xs text-muted-foreground mt-4">
                        Supported: PDF, PNG, JPEG (Max {formatFileSize(MAX_FILE_SIZE)})
                    </p>
                    {!selectedOrgId && (
                        <p className="text-sm text-amber-500 mt-4 font-medium">
                            Please select an organization first
                        </p>
                    )}
                </div>
            )}

            {error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                    {error}
                </div>
            )}

            {file && status !== "idle" && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
                        <div className="flex items-center gap-3">
                            <File className="h-8 w-8 text-primary" />
                            <div>
                                <p className="font-medium">{file.name}</p>
                                <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                            </div>
                        </div>
                        {status === "complete" && (
                            <button onClick={reset} className="text-muted-foreground hover:text-foreground">
                                <X className="h-5 w-5" />
                            </button>
                        )}
                    </div>

                    {hash && (
                        <div className="p-4 rounded-lg bg-card border border-border">
                            <p className="text-sm font-medium mb-2">Document Hash (SHA-256)</p>
                            <HashDisplay hash={hash} truncate={false} />
                        </div>
                    )}

                    {status === "uploading" && (
                        <div className="p-4 rounded-lg bg-card border border-border">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium">Uploading to IPFS</p>
                                <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {ipfsCid && (
                        <div className="p-4 rounded-lg bg-card border border-border">
                            <p className="text-sm font-medium mb-2">IPFS CID</p>
                            <HashDisplay hash={ipfsCid} />
                        </div>
                    )}

                    {status === "submitting" && (
                        <div className="p-4 rounded-lg bg-card border border-border flex items-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <p className="text-sm font-medium">Submitting to blockchain...</p>
                        </div>
                    )}

                    {txHash && status === "complete" && (
                        <div className="p-4 rounded-lg bg-verification-verified/10 border border-verification-verified/20">
                            <p className="text-sm font-medium mb-2 text-verification-verified">
                                ✓ Document Submitted Successfully
                            </p>
                            <p className="text-sm text-muted-foreground mb-2">Transaction Hash:</p>
                            <HashDisplay hash={txHash} />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
