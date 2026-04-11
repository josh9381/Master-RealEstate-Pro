import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { calculateSMSSegments } from '@/utils/smsSegments'
import {
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Copy,
  X,
  Mail,
  Phone,
  FileText,
  RefreshCw,
  Zap,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Variable,
  Settings,
  ChevronDown,
  Search,
} from 'lucide-react'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/hooks/useToast'
import { templatesApi } from '@/lib/api'
import api from '@/lib/api'

interface SMSTemplate {
  id: string
  name: string
  body: string
  category: string
  isActive: boolean
  usageCount: number
  lastUsedAt: string | null
  createdAt: string
}

const CATEGORIES = ['Follow-up', 'Appointment', 'Listing', 'Open House', 'Cold Outreach', 'Thank You', 'Custom']
const VARIABLES = ['{{firstName}}', '{{lastName}}', '{{propertyAddress}}', '{{appointmentDate}}', '{{agentName}}', '{{companyName}}']

const CATEGORY_ICONS: Record<string, string> = {
  'Follow-up': '🔄',
  'Appointment': '📅',
  'Listing': '🏠',
  'Open House': '🏡',
  'Cold Outreach': '❄️',
  'Thank You': '🙏',
  'Custom': '⚙️',
}

const SMSTemplatesLibrary = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeCategory, setActiveCategory] = useState('All')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<SMSTemplate | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formBody, setFormBody] = useState('')
  const [formCategory, setFormCategory] = useState('Follow-up')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [activeStep, setActiveStep] = useState<'details' | 'body'>('details')
  const [initialFormState, setInitialFormState] = useState({ name: '', body: '', category: 'Follow-up' })
  const [showSettings, setShowSettings] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  const PAGE_SIZE = 12

  // SMS Template settings
  interface TemplateSettings {
    defaultOptOutText: string;
    characterWarningThreshold: number;
    includeOptOut: boolean;
    enableDeliveryTracking: boolean;
    enableLinkShortening: boolean;
    autoSegmentWarning: boolean;
  }
  const SETTINGS_DEFAULTS: TemplateSettings = {
    defaultOptOutText: 'Reply STOP to unsubscribe',
    characterWarningThreshold: 160,
    includeOptOut: true,
    enableDeliveryTracking: true,
    enableLinkShortening: false,
    autoSegmentWarning: true,
  }
  const [templateSettings, setTemplateSettings] = useState<TemplateSettings>(SETTINGS_DEFAULTS)

  const { data: savedSMSSettings } = useQuery({
    queryKey: ['sms-template-settings'],
    queryFn: async () => {
      const res = await api.get('/api/settings/email-template-defaults')
      // SMS settings share the org defaults endpoint — extract SMS-relevant fields
      return res.data?.data || null
    },
  })

  useEffect(() => {
    if (savedSMSSettings) {
      setTemplateSettings(s => ({ ...s, ...savedSMSSettings }))
    }
  }, [savedSMSSettings])

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: TemplateSettings) => {
      await api.put('/api/settings/email-template-defaults', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-template-settings'] })
      toast.success('SMS template settings saved')
    },
    onError: () => {
      toast.error('Failed to save template settings')
    },
  })

  const { data: templatesResponse, isLoading } = useQuery({
    queryKey: ['sms-templates'],
    queryFn: () => templatesApi.getSMSTemplates(),
  })

  const templates: SMSTemplate[] = templatesResponse?.data?.templates || templatesResponse?.templates || templatesResponse || []

  const filteredTemplates = (() => {
    let result = activeCategory === 'All'
      ? templates
      : templates.filter(t => t.category === activeCategory)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(t =>
        (t.name || '').toLowerCase().includes(query) ||
        (t.body || '').toLowerCase().includes(query)
      )
    }
    return result
  })()

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / PAGE_SIZE))
  const paginatedTemplates = filteredTemplates.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1) }, [activeCategory, searchQuery])

  const resetForm = () => {
    setFormName('')
    setFormBody('')
    setFormCategory('Follow-up')
    setEditingTemplate(null)
    setActiveStep('details')
    setInitialFormState({ name: '', body: '', category: 'Follow-up' })
  }

  const hasUnsavedChanges = () => {
    return formName !== initialFormState.name ||
      formBody !== initialFormState.body ||
      formCategory !== initialFormState.category
  }

  const handleCloseCreateModal = () => {
    if (hasUnsavedChanges()) {
      if (!window.confirm('You have unsaved changes. Discard them?')) return
    }
    setShowCreateModal(false)
    resetForm()
  }

  const openCreate = () => {
    resetForm()
    setActiveStep('details')
    setShowCreateModal(true)
    setInitialFormState({ name: '', body: '', category: 'Follow-up' })
  }

  const openEdit = (template: SMSTemplate) => {
    setFormName(template.name)
    setFormBody(template.body)
    setFormCategory(template.category)
    setEditingTemplate(template)
    setActiveStep('body')
    setInitialFormState({ name: template.name, body: template.body, category: template.category })
    setShowCreateModal(true)
  }

  const canProceedToBody = formName.trim().length > 0

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Template name is required')
      return
    }
    if (!formBody.trim()) {
      toast.error('Message body is required')
      return
    }
    setSaving(true)
    try {
      if (editingTemplate) {
        await templatesApi.updateSMSTemplate(editingTemplate.id, { name: formName, body: formBody, category: formCategory })
        toast.success('Template updated')
      } else {
        await templatesApi.createSMSTemplate({ name: formName, body: formBody, category: formCategory })
        toast.success('Template created')
      }
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] })
      setShowCreateModal(false)
      resetForm()
    } catch {
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      await templatesApi.duplicateSMSTemplate(id)
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] })
      toast.success('Template duplicated')
    } catch {
      toast.error('Failed to duplicate template')
    }
  }

  // Escape key handler — use ref to avoid stale closure
  const handleCloseRef = useRef(handleCloseCreateModal)
  handleCloseRef.current = handleCloseCreateModal

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (deleteConfirmId) {
        setDeleteConfirmId(null)
      } else if (showCreateModal) {
        handleCloseRef.current()
      }
    }
  }, [deleteConfirmId, showCreateModal])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Body scroll lock when any modal is open
  useEffect(() => {
    const anyModalOpen = showCreateModal || !!deleteConfirmId
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [showCreateModal, deleteConfirmId])

  // Focus trap for create/edit modal
  useEffect(() => {
    if (!showCreateModal || !modalRef.current) return
    const modal = modalRef.current
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusable = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handleTab)
    const firstFocusable = modal.querySelector<HTMLElement>('input, button, [tabindex]:not([tabindex="-1"])')
    firstFocusable?.focus()
    return () => document.removeEventListener('keydown', handleTab)
  }, [showCreateModal, activeStep])

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      await templatesApi.deleteSMSTemplate(id)
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] })
      toast.success('Template deleted')
      setDeleteConfirmId(null)
    } catch {
      toast.error('Failed to delete template')
    } finally {
      setDeleting(false)
    }
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SMS Templates</h1>
          <p className="text-muted-foreground mt-2">Manage reusable SMS templates for outreach</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Template
        </Button>
      </div>

      {/* Sub-Navigation */}
      <div className="flex gap-2 border-b pb-3">
        <Link to="/communication"><Button variant="outline" size="sm"><Mail className="mr-2 h-4 w-4" />Inbox</Button></Link>
        <Link to="/communication/templates"><Button variant="outline" size="sm"><FileText className="mr-2 h-4 w-4" />Email Templates</Button></Link>
        <Link to="/communication/sms-templates"><Button variant="default" size="sm"><MessageSquare className="mr-2 h-4 w-4" />SMS Templates</Button></Link>
        <Link to="/communication/calls"><Button variant="outline" size="sm"><Phone className="mr-2 h-4 w-4" />Cold Call Hub</Button></Link>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search SMS templates by name or body..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={activeCategory === 'All' ? 'default' : 'outline'}
          onClick={() => setActiveCategory('All')}
        >
          All ({templates.length})
        </Button>
        {CATEGORIES.map(cat => {
          const count = templates.filter(t => t.category === cat).length
          return (
            <Button
              key={cat}
              size="sm"
              variant={activeCategory === cat ? 'default' : 'outline'}
              onClick={() => setActiveCategory(cat)}
            >
              {cat} ({count})
            </Button>
          )
        })}
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <LoadingSkeleton rows={4} showChart={false} />
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{searchQuery ? `No templates matching "${searchQuery}".` : 'No SMS templates yet. Create your first one!'}</p>
            {!searchQuery && (
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Create Template
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedTemplates.map(template => (
            <Card key={template.id} className="flex flex-col transition-all duration-200 hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <Badge variant="outline" className="text-xs">{template.category}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                {/* Phone preview */}
                <div className="bg-muted rounded-xl p-3 mb-3 border-2 border-border">
                  <div className="bg-success text-white rounded-2xl rounded-br-md px-3 py-2 text-sm ml-auto max-w-[85%]">
                    {template.body.length > 200 ? template.body.substring(0, 200) + '...' : template.body}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-right">
                    {(() => { const seg = calculateSMSSegments(template.body); return `${seg.charCount} chars (${seg.encoding}) \u2022 ${seg.segmentCount} segment${seg.segmentCount !== 1 ? 's' : ''}` })()}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Used {template.usageCount || 0} times</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(template)} title="Edit">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      navigator.clipboard.writeText(template.body)
                      toast.success('Copied to clipboard')
                    }} title="Copy Text">
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDuplicate(template.id)} title="Duplicate Template">
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteConfirmId(template.id)} title="Delete">
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filteredTemplates.length)} of {filteredTemplates.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                const show = page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1
                if (!show) {
                  const prevShow = page - 1 === 1 || page - 1 === totalPages || Math.abs(page - 1 - currentPage) <= 1
                  if (prevShow) return <span key={page} className="px-1 text-muted-foreground text-sm">…</span>
                  return null
                }
                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? 'default' : 'outline'}
                    size="sm"
                    className="min-w-[36px]"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                )
              })}
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
        </>
      )}

      {/* Delete Confirmation Modal — M5: shows template name */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-label="Delete SMS Template Confirmation">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-2">Delete Template</h3>
              <p className="text-muted-foreground mb-4">Are you sure you want to delete <strong>&ldquo;{templates.find(t => t.id === deleteConfirmId)?.name || 'this template'}&rdquo;</strong>? This action cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={deleting}>Cancel</Button>
                <Button variant="destructive" onClick={() => handleDelete(deleteConfirmId)} disabled={deleting}>
                  {deleting ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : 'Delete'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create/Edit Modal — Full-screen two-step layout */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-stretch justify-center" onClick={handleCloseCreateModal}>
          <div ref={modalRef} className="bg-background w-full max-w-4xl my-4 mx-4 rounded-xl shadow-2xl flex flex-col overflow-hidden" role="dialog" aria-modal="true" aria-label={editingTemplate ? 'Edit SMS Template' : 'Create SMS Template'} onClick={(e) => e.stopPropagation()}>
            {/* Sticky Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-background/95 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-success/10">
                  <MessageSquare className="h-5 w-5 text-success" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">{editingTemplate ? 'Edit SMS Template' : 'Create SMS Template'}</h2>
                  <p className="text-xs text-muted-foreground">
                    {editingTemplate ? `Editing "${editingTemplate.name}"` : 'Design your SMS template with variable support'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Step indicator */}
                <div className="flex items-center gap-1 bg-muted/50 rounded-full px-1 py-1">
                  <button
                    type="button"
                    onClick={() => setActiveStep('details')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      activeStep === 'details'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Details</span>
                    {formName.trim() && (
                      <CheckCircle2 className="h-3 w-3 text-success" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => canProceedToBody && setActiveStep('body')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      activeStep === 'body'
                        ? 'bg-background text-foreground shadow-sm'
                        : canProceedToBody ? 'text-muted-foreground hover:text-foreground' : 'text-muted-foreground/40 cursor-not-allowed'
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Message</span>
                    {formBody.trim() && (
                      <CheckCircle2 className="h-3 w-3 text-success" />
                    )}
                  </button>
                </div>
                <Button variant="ghost" size="sm" onClick={handleCloseCreateModal} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
              {activeStep === 'details' ? (
                /* ── Step 1: Details ────────────────────────── */
                <div className="max-w-2xl mx-auto p-8 space-y-6">
                  {/* Template Name */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="sms-template-name" className="text-sm font-medium">Template Name <span className="text-destructive">*</span></label>
                      <span className={`text-xs ${formName.length > 80 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {formName.length}/100
                      </span>
                    </div>
                    <Input
                      id="sms-template-name"
                      placeholder="e.g., Follow-up after showing, Open house reminder"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value.slice(0, 100))}
                      className="h-11"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">Choose a descriptive name to quickly identify this template later.</p>
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="SMS template category">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          role="radio"
                          aria-checked={formCategory === cat}
                          onClick={() => setFormCategory(cat)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                            formCategory === cat
                              ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/20'
                              : 'border-border hover:border-primary/30 hover:bg-accent text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <span>{CATEGORY_ICONS[cat] || '📁'}</span>
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Template Settings (collapsible) */}
                  <div className="border rounded-lg">
                    <button
                      type="button"
                      onClick={() => setShowSettings(!showSettings)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-accent/50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        Template Settings
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showSettings ? 'rotate-180' : ''}`} />
                    </button>
                    {showSettings && (
                      <div className="px-4 pb-4 space-y-4 border-t">
                        <div className="grid gap-4 md:grid-cols-2 pt-3">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Default Opt-Out Text</label>
                            <input type="text" className="w-full px-3 py-2 border rounded-lg bg-background" value={templateSettings.defaultOptOutText} onChange={(e) => setTemplateSettings(s => ({ ...s, defaultOptOutText: e.target.value }))} placeholder="Reply STOP to unsubscribe" />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">Character Warning Threshold</label>
                            <input type="number" min={80} max={1600} className="w-full px-3 py-2 border rounded-lg bg-background" value={templateSettings.characterWarningThreshold} onChange={(e) => setTemplateSettings(s => ({ ...s, characterWarningThreshold: Number(e.target.value) }))} />
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={templateSettings.includeOptOut} onChange={(e) => setTemplateSettings(s => ({ ...s, includeOptOut: e.target.checked }))} className="rounded" />
                            <span className="text-sm">Include opt-out text in templates</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={templateSettings.enableDeliveryTracking} onChange={(e) => setTemplateSettings(s => ({ ...s, enableDeliveryTracking: e.target.checked }))} className="rounded" />
                            <span className="text-sm">Enable delivery tracking</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={templateSettings.enableLinkShortening} onChange={(e) => setTemplateSettings(s => ({ ...s, enableLinkShortening: e.target.checked }))} className="rounded" />
                            <span className="text-sm">Enable link shortening</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={templateSettings.autoSegmentWarning} onChange={(e) => setTemplateSettings(s => ({ ...s, autoSegmentWarning: e.target.checked }))} className="rounded" />
                            <span className="text-sm">Show segment count warnings</span>
                          </label>
                        </div>
                        <Button onClick={() => saveSettingsMutation.mutate(templateSettings)} disabled={saveSettingsMutation.isPending} size="sm">
                          {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ── Step 2: Message Body ──────────────────── */
                <div className="max-w-2xl mx-auto p-8 space-y-6">
                  {/* Message Body */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="sms-template-body" className="text-sm font-medium">Message Body <span className="text-destructive">*</span></label>
                      <span className={`text-xs ${formBody.length > 480 ? 'text-destructive' : formBody.length > 320 ? 'text-warning' : 'text-muted-foreground'}`}>
                        {(() => { const seg = calculateSMSSegments(formBody); return `${seg.charCount}/${seg.encoding === 'UCS-2' ? 70 : 160} (${seg.encoding}) \u2022 ${seg.segmentCount} segment${seg.segmentCount !== 1 ? 's' : ''}${seg.segmentCount > 1 ? ` (${seg.segmentCount}x SMS cost)` : ''}` })()}
                      </span>
                    </div>
                    <textarea
                      id="sms-template-body"
                      value={formBody}
                      onChange={e => setFormBody(e.target.value.slice(0, 1600))}
                      rows={6}
                      className="w-full p-3 border rounded-lg resize-none text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-background transition-colors"
                      placeholder="Hi {{firstName}}, thanks for your interest in..."
                    />
                    <p className="text-xs text-muted-foreground">Write your SMS message. Use variables for personalization.</p>
                  </div>

                  {/* Insert Variables */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Variable className="h-3.5 w-3.5" />
                      Insert Variable
                    </label>
                    <div className="flex gap-1.5 flex-wrap">
                      {VARIABLES.map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setFormBody(prev => prev + v)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border bg-muted/50 text-xs hover:bg-accent transition-colors"
                        >
                          <code className="text-[10px] text-muted-foreground">{v}</code>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Phone Preview */}
                  {formBody && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Preview</label>
                      <div className="bg-muted rounded-xl p-4 border-2 border-border max-w-[300px] mx-auto">
                        <div className="text-center text-xs text-muted-foreground mb-2">SMS Preview</div>
                        <div className="bg-success text-white rounded-2xl rounded-br-md px-3 py-2 text-sm">
                          {formBody}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 text-right">
                          {(() => { const seg = calculateSMSSegments(formBody); return `${seg.charCount} chars (${seg.encoding})` })()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t bg-background/95 backdrop-blur-sm shrink-0">
              <div className="text-xs text-muted-foreground">
                {activeStep === 'details' && (
                  <span>Fill in the template details, then proceed to write your message.</span>
                )}
                {activeStep === 'body' && (
                  <span>Write your SMS message. Use variables like {'{{firstName}}'} for personalization.</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeStep === 'body' && (
                  <Button variant="outline" onClick={() => setActiveStep('details')}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back to Details
                  </Button>
                )}
                <Button variant="outline" onClick={handleCloseCreateModal}>
                  Cancel
                </Button>
                {activeStep === 'details' ? (
                  <Button onClick={() => {
                    if (!formName.trim()) { toast.error('Template name is required'); return }
                    setActiveStep('body')
                  }}
                  disabled={!canProceedToBody}
                  >
                    Next: Write Message
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={handleSave} disabled={saving || !formBody.trim()}>
                    {saving ? (
                      <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />{editingTemplate ? 'Updating...' : 'Creating...'}</>
                    ) : (
                      <>{editingTemplate ? 'Update Template' : 'Create Template'}</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SMSTemplatesLibrary
