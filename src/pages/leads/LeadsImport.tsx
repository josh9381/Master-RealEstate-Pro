import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Upload, FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/useToast'

function LeadsImport() {
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)

  const handleFileSelect = () => {
    setUploading(true)
    
    // Simulate file upload and import
    setTimeout(() => {
      setUploading(false)
      const leadsImported = Math.floor(Math.random() * 100) + 50
      toast.success('Import successful!', `${leadsImported} leads imported successfully`)
    }, 2000)
  }

  const handleDownloadTemplate = () => {
    toast.info('Downloading template...', 'Your CSV template will download shortly')
  }

  return (
    <div className="space-y-6">
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
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Drop your CSV file here</p>
              <p className="text-sm text-muted-foreground mt-2">or click to browse</p>
              <Button className="mt-4" onClick={handleFileSelect} loading={uploading}>
                {uploading ? 'Uploading...' : 'Select File'}
              </Button>
            </div>

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
                <li>Required columns: Name, Email</li>
                <li>Optional columns: Phone, Company, Source, Status</li>
                <li>Maximum file size: 10MB</li>
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
