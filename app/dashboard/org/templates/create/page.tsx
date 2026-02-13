import { TemplateBuilder } from "@/components/org/template-builder"

export default function CreateTemplatePage() {
    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-2">Create Template</h1>
                <p className="text-muted-foreground">
                    Design your certificate template by uploading a background and adding fields.
                </p>
            </div>

            <TemplateBuilder />
        </div>
    )
}
