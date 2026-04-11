import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight,
  ArrowLeft, Columns3, Eye, Loader2, FileText, Download, AlertTriangle,
  X, Layers
} from 'lucide-react'
import { useState, useRef, useCallback } from 'react'
import { useToast } from '@/hooks/useToast'
import { leadsApi, pipelinesApi, type PipelineData } from '@/lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ColumnMapping {
  source: string
  target: string
}

interface MappableField {
  key: string
  label: string
  required: boolean
}

interface PreviewData {
  headers: string[]
  previewRows: Record<string, string>[]
  totalRows: number
  fileType: string
  suggestedMappings: ColumnMapping[]
  mappableFields: MappableField[]
}

interface DuplicateMatch {
  rowIndex: number
  row: Record<string, string>
  existingLeadId: string
  existingLeadName: string
  existingLeadEmail: string
  matchReason: string
}

interface DuplicateCheckResult {
  totalRows: number
  duplicatesFound: number
  duplicates: DuplicateMatch[]
}

interface ImportResult {
  imported: number
  skipped: number
  updated: number
  total: number
  duplicatesFound: number
  errors: string[]
}

type Step = 'upload' | 'mapping' | 'preview' | 'pipeline' | 'results'
type DuplicateAction = 'skip' | 'overwrite' | 'create'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function LeadsImport() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Wizard state
  const [step, setStep] = useState<Step>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)

  // Preview & mapping state
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [mappings, setMappings] = useState<ColumnMapping[]>([])

  // Duplicate handling
  const [duplicateAction, setDuplicateAction] = useState<DuplicateAction>('skip')
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResult | null>(null)

  // Import results
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  // Pipeline assignment
  const [importPipelineId, setImportPipelineId] = useState('')
  const [importStageId, setImportStageId] = useState('')
  const [pipelinesList, setPipelinesList] = useState<PipelineData[]>([])

  // ---------------------------------------------------------------------------
  // File upload & validation
  // ---------------------------------------------------------------------------

  const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.vcf']
  const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

  const getFileExtension = (name: string) => {
    const idx = name.lastIndexOf('.')
    return idx >= 0 ? name.slice(idx).toLowerCase() : ''
  }

  const validateFile = useCallback((file: File): boolean => {
    const ext = getFileExtension(file.name)
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      toast.error('Unsupported file type', `Accepted formats: CSV, Excel (.xlsx/.xls), vCard (.vcf)`)
      return false
    }
    if (file.size > MAX_SIZE) {
      toast.error('File too large', 'Maximum file size is 10 MB')
      return false
    }
    return true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!validateFile(file)) return
    setSelectedFile(file)
    setPreview(null)
    setMappings([])
    setDuplicateCheck(null)
    setImportResult(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && validateFile(file)) {
      setSelectedFile(file)
      setPreview(null)
      setMappings([])
      setDuplicateCheck(null)
      setImportResult(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Step 1 → 2: Upload & Parse
  // ---------------------------------------------------------------------------

  const handleParseFile = async () => {
    if (!selectedFile) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      const response = await leadsApi.previewImport(formData)
      const data = response.data || response
      setPreview(data)
      setMappings(data.suggestedMappings || [])
      setStep('mapping')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to parse file'
      toast.error('Parse failed', message)
    } finally {
      setLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Step 2 → 3: Mapping → Preview + Duplicate Check
  // ---------------------------------------------------------------------------

  const handleCheckDuplicates = async () => {
    if (!selectedFile || !preview) return

    // Validate required mappings
    const requiredFields = preview.mappableFields.filter(f => f.required)
    const mappedTargets = new Set(mappings.filter(m => m.target).map(m => m.target))
    const missingRequired = requiredFields.filter(f => !mappedTargets.has(f.key))

    if (missingRequired.length > 0) {
      toast.error(
        'Missing required mappings',
        `Map these columns: ${missingRequired.map(f => f.label).join(', ')}`
      )
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('columnMappings', JSON.stringify(mappings.filter(m => m.target)))

      const response = await leadsApi.checkImportDuplicates(formData)
      const data = response.data || response
      setDuplicateCheck(data)
      setStep('preview')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to check duplicates'
      toast.error('Duplicate check failed', message)
    } finally {
      setLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Step 3 → 4: Import
  // ---------------------------------------------------------------------------

  const handleImport = async () => {
    if (!selectedFile) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('columnMappings', JSON.stringify(mappings.filter(m => m.target)))
      formData.append('duplicateAction', duplicateAction)
      if (importPipelineId) formData.append('pipelineId', importPipelineId)
      if (importStageId) formData.append('pipelineStageId', importStageId)

      const response = await leadsApi.importLeads(formData)
      const data = response.data || response
      setImportResult(data)
      setStep('results')
      toast.success('Import complete!', `${data.imported} leads imported successfully`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Import failed'
      toast.error('Import failed', message)
    } finally {
      setLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  const handleReset = () => {
    setStep('upload')
    setSelectedFile(null)
    setPreview(null)
    setMappings([])
    setDuplicateCheck(null)
    setImportResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ---------------------------------------------------------------------------
  // Column mapping helpers
  // ---------------------------------------------------------------------------

  const updateMapping = (sourceHeader: string, newTarget: string) => {
    setMappings(prev => {
      const updated = prev.map(m =>
        m.source === sourceHeader ? { ...m, target: newTarget } : m
      )
      // If this target was used elsewhere, clear the old one
      if (newTarget) {
        return updated.map(m =>
          m.source !== sourceHeader && m.target === newTarget ? { ...m, target: '' } : m
        )
      }
      return updated
    })
  }

  // ---------------------------------------------------------------------------
  // Template download
  // ---------------------------------------------------------------------------

  const handleDownloadTemplate = () => {
    const csv = 'First Name,Last Name,Email,Phone,Company,Position,Source\nJohn,Doe,john@example.com,555-0100,Acme Realty,Agent,Website\nJane,Smith,jane@example.com,555-0200,RE/MAX,Broker,Referral\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'leads_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.info('Template downloaded')
  }

  // ---------------------------------------------------------------------------
  // Step indicator
  // ---------------------------------------------------------------------------

  const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: 'upload', label: 'Upload', icon: <Upload className="h-4 w-4" /> },
    { key: 'mapping', label: 'Map Columns', icon: <Columns3 className="h-4 w-4" /> },
    { key: 'preview', label: 'Preview', icon: <Eye className="h-4 w-4" /> },
    { key: 'pipeline', label: 'Pipeline', icon: <Layers className="h-4 w-4" /> },
    { key: 'results', label: 'Results', icon: <CheckCircle2 className="h-4 w-4" /> },
  ]

  const currentStepIndex = steps.findIndex(s => s.key === step)

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-semibold leading-tight">Import Leads</h1>
        <p className="mt-2 text-muted-foreground">
          Upload CSV, Excel, or vCard files to import leads with column mapping and duplicate detection
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              i === currentStepIndex
                ? 'bg-primary text-primary-foreground'
                : i < currentStepIndex
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
            }`}>
              {i < currentStepIndex ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                s.icon
              )}
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${i < currentStepIndex ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>Drag and drop or click to browse. Supports CSV, Excel (.xlsx/.xls), and vCard (.vcf).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors cursor-pointer ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true) }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false) }}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.vcf"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              {selectedFile ? (
                <>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-lg font-medium">{selectedFile.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReset() }}
                      className="p-1 rounded-full hover:bg-muted transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium">Drop your file here</p>
                  <p className="text-sm text-muted-foreground mt-2">or click to browse</p>
                </>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-start space-x-4">
                <FileSpreadsheet className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Need a template?</p>
                  <p className="text-sm text-muted-foreground">Download our CSV template with correct headers</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={handleDownloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleParseFile}
                disabled={!selectedFile || loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                {loading ? 'Parsing...' : 'Next: Map Columns'}
              </Button>
            </div>

            <div className="rounded-lg bg-muted/50 p-4">
              <p className="font-medium mb-2">Supported formats:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li><strong>CSV</strong> — Comma-separated values with headers</li>
                <li><strong>Excel</strong> — .xlsx or .xls files (first sheet used)</li>
                <li><strong>vCard</strong> — .vcf contact files (auto-mapped to lead fields)</li>
                <li>Maximum file size: 10 MB</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Column Mapping */}
      {step === 'mapping' && preview && (
        <Card>
          <CardHeader>
            <CardTitle>Map Columns</CardTitle>
            <CardDescription>
              Match your file columns to lead fields. We auto-detected some mappings — adjust as needed.
              <span className="ml-2 text-xs">
                <Badge variant="secondary">{preview.totalRows} rows</Badge>
                <Badge variant="outline" className="ml-1">{preview.fileType.toUpperCase()}</Badge>
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mapping Table */}
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">File Column</th>
                    <th className="px-4 py-3 text-left font-medium">Sample Data</th>
                    <th className="px-4 py-3 text-left font-medium">Map To</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {mappings.map((mapping) => {
                    const sampleValues = preview.previewRows
                      .slice(0, 3)
                      .map(row => row[mapping.source])
                      .filter(Boolean)
                    return (
                      <tr key={mapping.source} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{mapping.source}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {sampleValues.length > 0 ? sampleValues.join(', ') : <span className="italic">empty</span>}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={mapping.target}
                            onChange={(e) => updateMapping(mapping.source, e.target.value)}
                            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                          >
                            <option value="">— Don't import —</option>
                            {preview.mappableFields.map(field => (
                              <option key={field.key} value={field.key}>
                                {field.label}{field.required ? ' *' : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Required fields warning */}
            {(() => {
              const mappedTargets = new Set(mappings.filter(m => m.target).map(m => m.target))
              const missing = preview.mappableFields.filter(f => f.required && !mappedTargets.has(f.key))
              if (missing.length === 0) return null
              return (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p className="text-sm">
                    Required fields not mapped: <strong>{missing.map(f => f.label).join(', ')}</strong>
                  </p>
                </div>
              )
            })()}

            {/* Data Preview */}
            <div>
              <h3 className="text-sm font-medium mb-2">Data Preview (first 5 rows)</h3>
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                      {preview.headers.map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {preview.previewRows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                        {preview.headers.map(h => (
                          <td key={h} className="px-3 py-2 max-w-[200px] truncate">{row[h] || ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleCheckDuplicates} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                {loading ? 'Checking duplicates...' : 'Next: Review & Import'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview + Duplicate Check */}
      {step === 'preview' && preview && (
        <div className="space-y-6">
          {/* Import Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Import Summary</CardTitle>
              <CardDescription>Review before importing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">{preview.totalRows}</div>
                  <div className="text-sm text-muted-foreground">Total Rows</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">
                    {mappings.filter(m => m.target).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Columns Mapped</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className={`text-2xl font-bold ${(duplicateCheck?.duplicatesFound ?? 0) > 0 ? 'text-warning' : 'text-success'}`}>
                    {duplicateCheck?.duplicatesFound ?? 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Duplicates Found</div>
                </div>
              </div>

              {/* Mapped fields summary */}
              <div className="rounded-lg border p-3">
                <h4 className="text-sm font-medium mb-2">Column Mappings</h4>
                <div className="flex flex-wrap gap-2">
                  {mappings.filter(m => m.target).map(m => {
                    const field = preview.mappableFields.find(f => f.key === m.target)
                    return (
                      <Badge key={m.source} variant="secondary">
                        {m.source} → {field?.label || m.target}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Duplicate Handling */}
          {(duplicateCheck?.duplicatesFound ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  {duplicateCheck!.duplicatesFound} Duplicate{duplicateCheck!.duplicatesFound > 1 ? 's' : ''} Found
                </CardTitle>
                <CardDescription>
                  These rows match existing leads. How should they be handled?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Action selector */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {([
                    { value: 'skip' as const, label: 'Skip Duplicates', desc: 'Don\'t import rows that match existing leads' },
                    { value: 'overwrite' as const, label: 'Update Existing', desc: 'Overwrite existing lead data with import data' },
                    { value: 'create' as const, label: 'Create Anyway', desc: 'Import as new leads (may create true duplicates)' },
                  ]).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setDuplicateAction(opt.value)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        duplicateAction === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-muted-foreground/25 hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium text-sm">{opt.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{opt.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Show first few duplicates */}
                <div className="rounded-lg border overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="px-3 py-2 text-left">Row #</th>
                        <th className="px-3 py-2 text-left">Reason</th>
                        <th className="px-3 py-2 text-left">Existing Lead</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {duplicateCheck!.duplicates.slice(0, 10).map((d, i) => (
                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2">{d.rowIndex + 2}</td>
                          <td className="px-3 py-2">{d.matchReason}</td>
                          <td className="px-3 py-2">{d.existingLeadName} ({d.existingLeadEmail})</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {duplicateCheck!.duplicatesFound > 10 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30">
                      ...and {duplicateCheck!.duplicatesFound - 10} more
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('mapping')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Mapping
            </Button>
            <Button onClick={async () => {
              try {
                const res = await pipelinesApi.getPipelines()
                setPipelinesList(res.data || [])
              } catch { /* pipelines fetch failed, continue anyway */ }
              setStep('pipeline')
            }}>
              <ArrowRight className="h-4 w-4 mr-2" />
              Next: Pipeline Assignment
            </Button>
          </div>
        </div>
      )}

      {/* Step 3.5: Pipeline Assignment (optional) */}
      {step === 'pipeline' && preview && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Assignment</CardTitle>
              <CardDescription>
                Optionally assign all {preview.totalRows} imported leads to a pipeline stage. You can skip this step.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Pipeline</label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={importPipelineId}
                  onChange={(e) => {
                    setImportPipelineId(e.target.value)
                    setImportStageId('')
                    // Auto-select first stage
                    const pipeline = pipelinesList.find(p => p.id === e.target.value)
                    if (pipeline && pipeline.stages.length > 0) {
                      const sorted = [...pipeline.stages].sort((a, b) => a.order - b.order)
                      setImportStageId(sorted[0].id)
                    }
                  }}
                >
                  <option value="">None (Skip pipeline assignment)</option>
                  {pipelinesList.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              {importPipelineId && (() => {
                const pipeline = pipelinesList.find(p => p.id === importPipelineId)
                if (!pipeline) return null
                const sortedStages = [...pipeline.stages].sort((a, b) => a.order - b.order)
                return (
                  <div>
                    <label className="text-sm font-medium">Starting Stage</label>
                    <select
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={importStageId}
                      onChange={(e) => setImportStageId(e.target.value)}
                    >
                      {sortedStages.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('preview')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Preview
            </Button>
            <Button onClick={handleImport} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Importing...' : `Import ${preview.totalRows} Leads`}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Results */}
      {step === 'results' && importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-lg bg-success/10">
                <div className="text-2xl font-bold text-success">{importResult.imported}</div>
                <div className="text-sm text-muted-foreground">Imported</div>
              </div>
              <div className="p-4 rounded-lg bg-primary/10">
                <div className="text-2xl font-bold text-primary">{importResult.updated}</div>
                <div className="text-sm text-muted-foreground">Updated</div>
              </div>
              <div className="p-4 rounded-lg bg-warning/10">
                <div className="text-2xl font-bold text-warning">{importResult.skipped}</div>
                <div className="text-sm text-muted-foreground">Skipped</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{importResult.total}</div>
                <div className="text-sm text-muted-foreground">Total Rows</div>
              </div>
            </div>

            {importResult.duplicatesFound > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
                <p className="text-sm">
                  {importResult.duplicatesFound} duplicate{importResult.duplicatesFound > 1 ? 's' : ''} were detected.
                  {duplicateAction === 'skip' && ' They were skipped.'}
                  {duplicateAction === 'overwrite' && ' Existing leads were updated with new data.'}
                  {duplicateAction === 'create' && ' New leads were created regardless.'}
                </p>
              </div>
            )}

            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-sm font-medium text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Errors ({importResult.errors.length})
                </div>
                <ul className="text-sm text-muted-foreground space-y-0.5 ml-5 list-disc">
                  {importResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleReset}>
                Import More Leads
              </Button>
              <Button onClick={() => window.location.href = '/leads'}>
                View All Leads
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default LeadsImport
