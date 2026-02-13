"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, FileText, CheckCircle2 } from "lucide-react"

export default function IssueCertificatePage() {
    const [method, setMethod] = useState("manual")
    const [selectedTemplate, setSelectedTemplate] = useState("")

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-2">Issue Certificates</h1>
                <p className="text-muted-foreground">
                    Generate and verify certificates on the blockchain.
                </p>
            </div>

            <Tabs defaultValue="manual" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8">
                    <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                    <TabsTrigger value="bulk">Bulk Upload (CSV)</TabsTrigger>
                    <TabsTrigger value="upload">Upload PDF</TabsTrigger>
                </TabsList>

                <TabsContent value="manual">
                    <Card>
                        <CardHeader>
                            <CardTitle>Manual Issuance</CardTitle>
                            <CardDescription>
                                Fill in details to generate a single certificate from a template.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Select Template</Label>
                                <Select onValueChange={setSelectedTemplate}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose a template..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="temp1">Degree Certificate</SelectItem>
                                        <SelectItem value="temp2">Course Completion</SelectItem>
                                        <SelectItem value="temp3">Performance Report</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedTemplate && (
                                <div className="space-y-4 border-t pt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Recipient Name</Label>
                                            <Input placeholder="e.g. John Doe" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Recipient ID / Roll No</Label>
                                            <Input placeholder="e.g. 12345678" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Course Name</Label>
                                            <Input placeholder="e.g. Computer Science" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Completion Date</Label>
                                            <Input type="date" />
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <Button className="w-full md:w-auto">
                                            <FileText className="mr-2 h-4 w-4" />
                                            Generate & Verify
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="bulk">
                    <Card>
                        <CardHeader>
                            <CardTitle>Bulk Issuance</CardTitle>
                            <CardDescription>
                                Upload a CSV file to generate multiple certificates at once.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Select Template</Label>
                                <Select onValueChange={setSelectedTemplate}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose a template..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="temp1">Degree Certificate</SelectItem>
                                        <SelectItem value="temp2">Course Completion</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-4">
                                <div className="flex justify-center">
                                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                                        <Upload className="h-6 w-6 text-primary" />
                                    </div>
                                </div>
                                <div>
                                    <p className="font-medium">Click to upload CSV</p>
                                    <p className="text-sm text-muted-foreground">or drag and drop</p>
                                </div>
                                <Input type="file" accept=".csv" className="hidden" />
                                <Button variant="outline">Select CSV File</Button>
                            </div>

                            <div className="bg-muted/50 p-4 rounded text-sm">
                                <p className="font-semibold mb-2">CSV Format Guide:</p>
                                <p className="text-muted-foreground">
                                    The CSV should have headers matching the template fields.
                                    Example: <code className="bg-background px-1 rounded">Name, RollNo, Date</code>
                                </p>
                            </div>

                            <Button disabled className="w-full">Upload & Process</Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="upload">
                    <Card>
                        <CardHeader>
                            <CardTitle>Direct PDF Upload</CardTitle>
                            <CardDescription>
                                Upload a pre-generated certificate PDF to verify it on the blockchain.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-4">
                                <div className="flex justify-center">
                                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                                        <Upload className="h-6 w-6 text-primary" />
                                    </div>
                                </div>
                                <div>
                                    <p className="font-medium">Click to upload PDF</p>
                                    <p className="text-sm text-muted-foreground">or drag and drop</p>
                                </div>
                                <Input type="file" accept=".pdf" className="hidden" />
                                <Button variant="outline">Select PDF File</Button>
                            </div>

                            <div className="space-y-2">
                                <Label>Recipient Email (Optional)</Label>
                                <Input placeholder="Enter email to send notification" />
                            </div>

                            <Button className="w-full">
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Verify Document
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
