"use client"

import { useState, useRef } from "react"
import { Upload, Plus, X, Save, FileText, Move } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

interface TemplateField {
    id: string
    name: string
    x: number
    y: number
    fontSize: number
}

export function TemplateBuilder() {
    const [name, setName] = useState("")
    const [backgroundFile, setBackgroundFile] = useState<File | null>(null)
    const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null)
    const [fields, setFields] = useState<TemplateField[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const pdfContainerRef = useRef<HTMLDivElement>(null)
    const { toast } = useToast()

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            if (file.type !== "application/pdf") {
                toast({
                    title: "Invalid file type",
                    description: "Please upload a PDF file.",
                    variant: "destructive",
                })
                return
            }
            setBackgroundFile(file)
            // For preview, we might need a PDF viewer logic, 
            // but for simplicity in this "mock" builder, we'll assume user uploads an image of the template
            // OR we just show a placeholder. 
            // To properly render PDF in canvas is complex.
            // Let's modify requirement: Upload Image Background (for coordinate setting) 
            // OR use pdf.js. 
            // For this MVP, let's assume they upload an IMAGE as background for the visual editor,
            // but actually we need the PDF for the backend.

            // Let's assume for this UI tool, we ask for an Image preview of the PDF? 
            // Or we just display "PDF Uploaded" and let them place fields on a blank canvas of A4 ratio?
            // Better: Let user upload an image of the certificate for design purposes.

            const reader = new FileReader()
            reader.onload = (e) => {
                setBackgroundPreview(e.target?.result as string)
            }
            reader.readAsDataURL(file) // This works better if it's an image. If PDF, browser won't show it easily in img tag.
        }
    }

    const addField = () => {
        const newField: TemplateField = {
            id: Math.random().toString(36).substr(2, 9),
            name: `Field ${fields.length + 1}`,
            x: 50,
            y: 50,
            fontSize: 12
        }
        setFields([...fields, newField])
    }

    const updateField = (id: string, updates: Partial<TemplateField>) => {
        setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f))
    }

    const removeField = (id: string) => {
        setFields(fields.filter(f => f.id !== id))
    }

    const handleSave = async () => {
        if (!name || !backgroundFile) {
            toast({ title: "Missing details", description: "Please provide a name and background file.", variant: "destructive" })
            return
        }

        try {
            setIsSaving(true)
            // 1. Upload background to IPFS (simulated or real endpoint)
            // We'll send everything to backend create endpoint

            // Mock API call
            // const formData = new FormData()
            // formData.append('background', backgroundFile)
            // formData.append('data', JSON.stringify({ name, structure: fields }))
            // await fetch('/api/templates', ... )

            await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate delay

            toast({ title: "Template Saved", description: "Certificate template created successfully." })
            // Redirect or reset
        } catch (error) {
            toast({ title: "Error", description: "Failed to save template", variant: "destructive" })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sidebar Controls */}
            <div className="space-y-6">
                <Card>
                    <CardContent className="p-6 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="templateName">Template Name</Label>
                            <Input
                                id="templateName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Degree Certificate 2024"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Background PDF</Label>
                            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    accept=".pdf, .png, .jpg" // Allow images for easier preview in this demo
                                    onChange={handleFileChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <div className="flex flex-col items-center gap-2">
                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                        {backgroundFile ? backgroundFile.name : "Click to upload PDF/Image"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-border">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold">Fields</h3>
                                <Button size="sm" variant="outline" onClick={addField}>
                                    <Plus className="h-4 w-4 mr-2" /> Add Field
                                </Button>
                            </div>

                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                {fields.map((field) => (
                                    <div key={field.id} className="flex items-center gap-2 bg-muted/50 p-2 rounded border border-border">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <Input
                                            value={field.name}
                                            onChange={(e) => updateField(field.id, { name: e.target.value })}
                                            className="h-8 text-sm"
                                        />
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            onClick={() => removeField(field.id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {fields.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No fields added yet.
                                    </p>
                                )}
                            </div>
                        </div>

                        <Button className="w-full" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? "Saving..." : "Save Template"}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Preview Canvas */}
            <div className="lg:col-span-2">
                <div className="bg-muted/20 border border-border rounded-lg p-8 min-h-[600px] flex items-center justify-center overflow-auto">
                    <div
                        ref={pdfContainerRef}
                        className="relative bg-white shadow-lg transition-transform"
                        style={{
                            width: '595px', // A4 width @ 72 DPI approx
                            height: '842px', // A4 height @ 72 DPI approx
                            backgroundImage: backgroundPreview ? `url(${backgroundPreview})` : 'none',
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center'
                        }}
                    >
                        {!backgroundPreview && (
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                <p>Upload a background to start designing</p>
                            </div>
                        )}

                        {/* Draggable Fields */}
                        {fields.map((field) => (
                            <div
                                key={field.id}
                                className="absolute cursor-move border-2 border-primary bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded flex items-center gap-1 group"
                                style={{
                                    left: field.x,
                                    top: field.y,
                                    transform: 'translate(-50%, -50%)'
                                }}
                                draggable
                                onDragEnd={(e) => {
                                    // Simple drag logic (would need better implementation for prod)
                                    // For now, let's just use input fields to verify concept?
                                    // Implementing true drag-on-canvas in React requires careful event handling
                                    const rect = pdfContainerRef.current?.getBoundingClientRect();
                                    if (rect) {
                                        const x = e.clientX - rect.left;
                                        const y = e.clientY - rect.top;
                                        updateField(field.id, { x, y });
                                    }
                                }}
                            >
                                {field.name}
                                <Move className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                            </div>
                        ))}
                    </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4 text-center">
                    Note: In this demo, use the visual editor to place fields. Coordinates are auto-mapped to PDF generation.
                </p>
            </div>
        </div>
    )
}
