import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react'
import { useState, useRef } from 'react'
import { useToast } from '@/hooks/useToast'
import { leadsApi } from '@/lib/api'
import { LeadsSubNav } from '@/components/leads/LeadsSubNav'

interface ImportResult {
  imported: number
  skipped: number
  total: number
  errors: string[]
}

function LeadsImport() {
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.csv')) {
      toast.error('Invalid file type', 'Please select a CSV file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', 'Maximum file size is 5MB')
      return
    }
    setSelectedFile(file)
    setImportResult(null)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    setImportResult(null)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      const response = await leadsApi.importLeads(formData)
      const result = response.data || response
      setImportResult(result)
      toast.success('Import complete!', `${result.imported} of ${result.total} leads imported successfully`)
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Import failed'
      toast.error('Import failed', message)
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadTemplate = () => {
    const csv = 'First Name,Last Name,Email,Phone,Source\nJohn,Doe,john@example.com,555-0100,Website\nJane,Smith,jane@example.com,555-0200,Referral\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'leads_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.info('Template downloaded', 'Check your downloads folder')
  }

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <LeadsSubNav />

      <div>
        <h1 className="text-3xl font-bold">Import Leads</h1>
        <p className="mt-2 text-muted-foreground">
          Upload a CSV file to import multiple leads at once
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Upload Area */}
            <div
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors cursor-pointer ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
              onDrop={(e) => {
                e.preventDefault(); e.stopPropagation(); setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  if (!file.name.endsWith('.csv')) { toast.error('Invalid file type', 'Please select a CSV file'); return; }
                  if (file.size > 5 * 1024 * 1024) { toast.error('File too large', 'Maximum file size is 5MB'); return; }
                  setSelectedFile(file); setImportResult(null);
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">
                {selectedFile ? selectedFile.name : 'Drop your CSV file here'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {selectedFile
                  ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                  : 'or click to browse'}
              </p>
              <Button
                className="mt-4"
                onClick={(e) => { e.stopPropagation(); selectedFile ? handleUpload() : fileInputRef.current?.click() }}
                loading={uploading}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : selectedFile ? 'Upload & Import' : 'Select File'}
              </Button>
            </div>

            {/* Import Results */}
            {importResult && (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Import Complete</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                    <div className="text-sm text-muted-foreground">Imported</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{importResult.skipped}</div>
                    <div className="text-sm text-muted-foreground">Skipped</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{importResult.total}</div>
                    <div className="text-sm text-muted-foreground">Total Rows</div>
                  </div>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-1 text-sm font-medium text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      Errors:
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-0.5 ml-5 list-disc">
                      {importResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Template Download */}
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-start space-x-4">
                <FileSpreadsheet className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Need a template?</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Download our CSV template with the correct format and headers
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={handleDownloadTemplate}>
                    Download Template
                  </Button>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <p className="font-medium">Import Instructions:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>File must be in CSV format</li>
                <li>Required columns: First Name, Last Name, Email</li>
                <li>Optional columns: Phone, Company, Source, Status</li>
                <li>Maximum file size: 5MB</li>
                <li>Maximum 1,000 leads per import</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default LeadsImport
