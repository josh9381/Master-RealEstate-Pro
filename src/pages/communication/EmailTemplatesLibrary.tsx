import { logger } from '@/lib/logger'
import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { Mail, Layout, Type, Code, Eye, RefreshCw, Edit, Trash2, Plus, X, Send, Search, Clock, Copy, ChevronLeft, ChevronRight, FileText, Zap, Variable, CheckCircle2, Settings, ChevronDown } from 'lucide-react';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast'
import { templatesApi } from '@/lib/api'
import api from '@/lib/api'
import { EmailBlockEditor } from '@/components/email/EmailBlockEditor'
import type { EmailTemplate } from '@/types'

const CATEGORIES = ['Onboarding', 'Marketing', 'Content', 'Ecommerce', 'Transactional', 'Events', 'Custom'];

const CATEGORY_ICONS: Record<string, string> = {
  'Onboarding': '👋',
  'Marketing': '📣',
  'Content': '📝',
  'Ecommerce': '🛒',
  'Transactional': '📬',
  'Events': '📅',
  'Custom': '⚙️',
};

const SUBJECT_VARIABLES = [
  { label: 'First Name', value: '{{lead.firstName}}' },
  { label: 'Company', value: '{{lead.company}}' },
  { label: 'Agent', value: '{{agent.name}}' },
];
const PAGE_SIZE = 12;

const EmailTemplatesLibrary = () => {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeCategory, setActiveCategory] = useState('All Templates')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)

  // Create/Edit form state
  const [formName, setFormName] = useState('')
  const [formSubject, setFormSubject] = useState('')
  const [formCategory, setFormCategory] = useState('Marketing')
  const [formBody, setFormBody] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [activeStep, setActiveStep] = useState<'details' | 'body'>('details')
  const [showSubjectVars, setShowSubjectVars] = useState(false)

  // Track initial form values for unsaved changes detection
  const [initialFormState, setInitialFormState] = useState({ name: '', subject: '', category: 'Marketing', body: '', isActive: true })

  // Focus trap ref for create/edit modal
  const modalRef = useRef<HTMLDivElement>(null)

  // Template settings
  interface TemplateSettings {
    defaultFont: string;
    primaryColor: string;
    logoUrl: string;
    includeUnsubscribe: boolean;
    enableOpenTracking: boolean;
    enableClickTracking: boolean;
    includeSocialSharing: boolean;
  }
  const SETTINGS_DEFAULTS: TemplateSettings = {
    defaultFont: 'Arial',
    primaryColor: '#0066cc',
    logoUrl: '',
    includeUnsubscribe: true,
    enableOpenTracking: true,
    enableClickTracking: true,
    includeSocialSharing: false,
  }
  const [templateSettings, setTemplateSettings] = useState<TemplateSettings>(SETTINGS_DEFAULTS)

  const { data: savedSettings } = useQuery({
    queryKey: ['email-template-settings'],
    queryFn: async () => {
      const res = await api.get('/api/settings/email-template-defaults')
      return res.data?.data || null
    },
  })

  useEffect(() => {
    if (savedSettings) {
      setTemplateSettings(s => ({ ...s, ...savedSettings }))
    }
  }, [savedSettings])

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: TemplateSettings) => {
      await api.put('/api/settings/email-template-defaults', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-template-settings'] })
      toast.success('Email template settings saved')
    },
    onError: () => {
      toast.error('Failed to save template settings')
    },
  })

  // C1 FIX: Extract nested API response correctly
  const { data: templates = [], isLoading: loading, isFetching, refetch } = useQuery<EmailTemplate[]>({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const response = await templatesApi.getEmailTemplates()
      return response?.data?.templates || response?.templates || (Array.isArray(response) ? response : [])
    }
  })
  const refreshing = isFetching && !loading

  const handleRefresh = () => {
    refetch()
  }

  const resetForm = () => {
    setFormName('')
    setFormSubject('')
    setFormCategory('Marketing')
    setFormBody('')
    setFormIsActive(true)
    setEditingTemplate(null)
    setActiveStep('details')
    setShowSubjectVars(false)
    setInitialFormState({ name: '', subject: '', category: 'Marketing', body: '', isActive: true })
  }

  const hasUnsavedChanges = () => {
    return formName !== initialFormState.name ||
      formSubject !== initialFormState.subject ||
      formCategory !== initialFormState.category ||
      formBody !== initialFormState.body ||
      formIsActive !== initialFormState.isActive
  }

  const handleCloseCreateModal = () => {
    if (hasUnsavedChanges()) {
      if (!window.confirm('You have unsaved changes. Discard them?')) return
    }
    setShowCreateModal(false)
    resetForm()
  }

  const openCreateModal = () => {
    resetForm()
    setActiveStep('details')
    setShowCreateModal(true)
    setInitialFormState({ name: '', subject: '', category: 'Marketing', body: '', isActive: true })
  }

  const openEditModal = (template: EmailTemplate) => {
    setEditingTemplate(template)
    setFormName(template.name || '')
    setFormSubject(template.subject || '')
    setFormCategory(template.category || 'Marketing')
    setFormBody(template.body || '')
    setFormIsActive(template.isActive !== false)
    setActiveStep('body')
    setInitialFormState({
      name: template.name || '',
      subject: template.subject || '',
      category: template.category || 'Marketing',
      body: template.body || '',
      isActive: template.isActive !== false,
    })
    setShowCreateModal(true)
  }

  const handleSaveTemplate = async () => {
    if (!formName.trim()) {
      toast.error('Template name is required')
      return
    }
    if (!formSubject.trim()) {
      toast.error('Subject line is required')
      return
    }
    if (!formBody.trim()) {
      toast.error('Template body is required')
      return
    }

    setSaving(true)
    try {
      const data = {
        name: formName.trim(),
        subject: formSubject.trim(),
        category: formCategory,
        body: formBody.trim(),
        isActive: formIsActive,
      }

      if (editingTemplate) {
        await templatesApi.updateEmailTemplate(editingTemplate.id, data)
        toast.success('Template updated successfully')
      } else {
        await templatesApi.createEmailTemplate(data)
        toast.success('Template created successfully')
      }

      setShowCreateModal(false)
      resetForm()
      refetch()
    } catch (error: unknown) {
      logger.error('Failed to save template:', error)
      const errMsg = error instanceof Error ? error.message : 'Failed to save template'
      const axiosError = error as { response?: { data?: { message?: string } } }
      toast.error(axiosError?.response?.data?.message || errMsg)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    setDeleting(true)
    try {
      await templatesApi.deleteEmailTemplate(id)
      toast.success('Template deleted successfully')
      setShowDeleteConfirm(null)
      refetch()
    } catch (error: unknown) {
      logger.error('Failed to delete template:', error)
      const axiosError = error as { response?: { data?: { message?: string } } }
      toast.error(axiosError?.response?.data?.message || 'Failed to delete template')
    } finally {
      setDeleting(false)
    }
  }

  // M3: Duplicate handler
  const handleDuplicateTemplate = async (id: string) => {
    try {
      await templatesApi.duplicateEmailTemplate(id)
      toast.success('Template duplicated successfully')
      refetch()
    } catch (error: unknown) {
      logger.error('Failed to duplicate template:', error)
      const axiosError = error as { response?: { data?: { message?: string } } }
      toast.error(axiosError?.response?.data?.message || 'Failed to duplicate template')
    }
  }

  const openPreview = (template: EmailTemplate) => {
    setPreviewTemplate(template)
    setShowPreviewModal(true)
  }

  // Validate details step before proceeding to body
  const canProceedToBody = formName.trim().length > 0 && formSubject.trim().length > 0

  // M6: Escape key handler for modals — use refs to avoid stale closures
  const handleCloseRef = useRef(handleCloseCreateModal)
  handleCloseRef.current = handleCloseCreateModal

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showDeleteConfirm) {
        setShowDeleteConfirm(null)
      } else if (showPreviewModal) {
        setShowPreviewModal(false)
        setPreviewTemplate(null)
      } else if (showCreateModal) {
        handleCloseRef.current()
      }
    }
  }, [showDeleteConfirm, showPreviewModal, showCreateModal])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Body scroll lock when any modal is open
  useEffect(() => {
    const anyModalOpen = showCreateModal || showPreviewModal || !!showDeleteConfirm
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [showCreateModal, showPreviewModal, showDeleteConfirm])

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
    // Auto-focus first focusable element
    const firstFocusable = modal.querySelector<HTMLElement>('input, button, [tabindex]:not([tabindex="-1"])')
    firstFocusable?.focus()
    return () => document.removeEventListener('keydown', handleTab)
  }, [showCreateModal, activeStep])

  // m2: Memoize stats
  const mostUsedTemplate = useMemo(() => {
    if (templates.length === 0) return null
    return [...templates].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))[0]
  }, [templates])

  const lastUpdatedTemplate = useMemo(() => {
    if (templates.length === 0) return null
    return [...templates].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())[0]
  }, [templates])

  // M4: Find template name for delete confirmation
  const deleteTemplateName = useMemo(() => {
    if (!showDeleteConfirm) return ''
    return templates.find(t => t.id === showDeleteConfirm)?.name || 'this template'
  }, [showDeleteConfirm, templates])

  // Search + category filtering
  const filteredTemplates = useMemo(() => {
    let result = templates
    if (activeCategory !== 'All Templates') {
      result = result.filter(t => (t.category || '').toLowerCase() === activeCategory.toLowerCase())
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(t =>
        (t.name || '').toLowerCase().includes(query) ||
        (t.subject || '').toLowerCase().includes(query)
      )
    }
    return result
  }, [templates, activeCategory, searchQuery])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / PAGE_SIZE))
  const paginatedTemplates = filteredTemplates.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1) }, [activeCategory, searchQuery])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Templates Library</h1>
          <p className="text-muted-foreground mt-2">
            Pre-designed templates for your email campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      {/* M1: Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates by name or subject..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : (
        <>
      {/* Stats — m2: memoized, m3: Clock icon for Last Updated */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-xs text-muted-foreground">{templates.filter(t => t.isActive !== false).length} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Used</CardTitle>
            <Layout className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{mostUsedTemplate?.name || '—'}</div>
            <p className="text-xs text-muted-foreground">{mostUsedTemplate ? `${mostUsedTemplate.usageCount || 0} uses` : 'No data yet'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(templates.map(t => t.category).filter(Boolean)).size}</div>
            <p className="text-xs text-muted-foreground">Unique categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lastUpdatedTemplate?.updatedAt ? new Date(lastUpdatedTemplate.updatedAt).toLocaleDateString() : '—'}</div>
            <p className="text-xs text-muted-foreground">{lastUpdatedTemplate ? 'Most recent update' : 'No data yet'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Categories Filter — m4: keyboard-accessible buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Browse by Category</CardTitle>
          <CardDescription>Filter templates by type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              'All Templates',
              ...CATEGORIES,
            ].map((category) => (
              <button
                key={category}
                type="button"
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                  category === activeCategory
                    ? 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80'
                    : 'border-border text-foreground hover:bg-accent'
                }`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Template Library</CardTitle>
              <CardDescription>
                {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} found
                {searchQuery && ` for "${searchQuery}"`}
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('grid')}>
                <Layout className="h-4 w-4 mr-2" />
                Grid
              </Button>
              <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')}>
                <Type className="h-4 w-4 mr-2" />
                List
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No templates found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? `No templates matching "${searchQuery}".` : activeCategory !== 'All Templates' ? `No templates in "${activeCategory}" category.` : 'Create your first email template to get started.'}
              </p>
              <Button onClick={openCreateModal}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>
          ) : (
          <>
          {/* m1: removed template.thumbnail references */}
          <div className={viewMode === 'grid' ? 'grid gap-4 md:grid-cols-3' : 'space-y-3'}>
            {paginatedTemplates.map((template) => (
              viewMode === 'grid' ? (
              <div key={template.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-center h-48 bg-gradient-to-br from-blue-50 to-purple-50">
                  <div className="text-6xl">📧</div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold truncate">{template.name}</h4>
                    <Badge variant="outline">{template.category || 'Uncategorized'}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1 truncate">{template.subject}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <span>{template.usageCount || 0} uses</span>
                    <span>{template.updatedAt ? `Updated ${new Date(template.updatedAt).toLocaleDateString()}` : ''}</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openPreview(template)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    {/* C2 FIX: pass template via route state instead of raw clipboard copy */}
                    <Button size="sm" className="flex-1" onClick={() => {
                      navigate('/communication/inbox', { state: { templateId: template.id, templateName: template.name, templateSubject: template.subject, templateBody: template.body } })
                    }}>
                      <Send className="h-4 w-4 mr-1" />
                      Compose
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEditModal(template)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {/* M3: Duplicate button */}
                    <Button variant="outline" size="sm" onClick={() => handleDuplicateTemplate(template.id)} title="Duplicate template">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(template.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
              ) : (
              <div key={template.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow flex items-center gap-4">
                <div className="flex items-center justify-center h-12 w-12 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex-shrink-0">
                  <span className="text-2xl">📧</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold truncate">{template.name}</h4>
                    <Badge variant="outline">{template.category || 'Uncategorized'}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{template.subject}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                    <span>{template.usageCount || 0} uses</span>
                    <span>{template.updatedAt ? `Updated ${new Date(template.updatedAt).toLocaleDateString()}` : ''}</span>
                  </div>
                </div>
                <div className="flex space-x-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => openPreview(template)}>
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  {/* C2 FIX: pass template via route state */}
                  <Button size="sm" onClick={() => {
                    navigate('/communication/inbox', { state: { templateId: template.id, templateName: template.name, templateSubject: template.subject, templateBody: template.body } })
                  }}>
                    <Send className="h-4 w-4 mr-1" />
                    Compose
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEditModal(template)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  {/* M3: Duplicate button */}
                  <Button variant="outline" size="sm" onClick={() => handleDuplicateTemplate(template.id)} title="Duplicate template">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(template.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              )
            ))}
          </div>

          {/* M2: Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filteredTemplates.length)} of {filteredTemplates.length}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm font-medium px-2">Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
          </>
          )}
        </CardContent>
      </Card>
        </>
      )}

      {/* Create/Edit Template Modal — Full-screen two-step layout */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-stretch justify-center" onClick={handleCloseCreateModal}>
          <div ref={modalRef} className="bg-background w-full max-w-6xl my-4 mx-4 rounded-xl shadow-2xl flex flex-col overflow-hidden" role="dialog" aria-modal="true" aria-label={editingTemplate ? 'Edit Template' : 'Create New Template'} onClick={(e) => e.stopPropagation()}>
            {/* Sticky Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-background/95 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">{editingTemplate ? 'Edit Template' : 'Create New Template'}</h2>
                  <p className="text-xs text-muted-foreground">
                    {editingTemplate ? `Editing "${editingTemplate.name}"` : 'Design your email template with the block editor'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Step indicator — visible on all screen sizes */}
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
                    {formName.trim() && formSubject.trim() && (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
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
                    <span className="hidden sm:inline">Content</span>
                    {formBody.trim() && (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
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
                      <label htmlFor="template-name" className="text-sm font-medium">Template Name <span className="text-red-500">*</span></label>
                      <span className={`text-xs ${formName.length > 80 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {formName.length}/100
                      </span>
                    </div>
                    <Input
                      id="template-name"
                      placeholder="e.g., Monthly Newsletter, Open House Invitation"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value.slice(0, 100))}
                      className="h-11"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">Choose a descriptive name to quickly identify this template later.</p>
                  </div>

                  {/* Subject Line */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="template-subject" className="text-sm font-medium">Subject Line <span className="text-red-500">*</span></label>
                      <span className={`text-xs ${formSubject.length > 120 ? 'text-red-500' : formSubject.length > 60 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                        {formSubject.length}/150 {formSubject.length > 60 && formSubject.length <= 120 ? '— may be truncated on mobile' : ''}
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        id="template-subject"
                        placeholder="e.g., Your monthly update from {{company.name}}"
                        value={formSubject}
                        onChange={(e) => setFormSubject(e.target.value.slice(0, 150))}
                        className="h-11 pr-24"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <button
                          type="button"
                          onClick={() => setShowSubjectVars(!showSubjectVars)}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                          <Variable className="h-3.5 w-3.5" />
                          Variables
                        </button>
                      </div>
                    </div>
                    {showSubjectVars && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {SUBJECT_VARIABLES.map(v => (
                          <button
                            key={v.value}
                            type="button"
                            onClick={() => {
                              setFormSubject(prev => prev + v.value)
                              setShowSubjectVars(false)
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border bg-muted/50 text-xs hover:bg-accent transition-colors"
                          >
                            <code className="text-[10px] text-muted-foreground">{v.value}</code>
                            <span className="font-medium">{v.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">Write a compelling subject line. Use variables like {'{{lead.firstName}}'} for personalization.</p>
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <label htmlFor="template-category" className="text-sm font-medium">Category</label>
                    <div id="template-category" className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Template category">
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

                  {/* Active Status Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">Template Status</p>
                      <p className="text-xs text-muted-foreground">Inactive templates won't appear in campaign template selectors.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormIsActive(!formIsActive)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formIsActive ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                      role="switch"
                      aria-checked={formIsActive}
                      aria-label={formIsActive ? 'Template is active' : 'Template is inactive'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                          formIsActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
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
                            <label className="text-sm font-medium mb-2 block">Default Font</label>
                            <select className="w-full px-3 py-2 border rounded-lg bg-background" value={templateSettings.defaultFont} onChange={(e) => setTemplateSettings(s => ({ ...s, defaultFont: e.target.value }))}>
                              <option>Arial</option>
                              <option>Helvetica</option>
                              <option>Georgia</option>
                              <option>Times New Roman</option>
                              <option>Verdana</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">Primary Color</label>
                            <input type="color" value={templateSettings.primaryColor} onChange={(e) => setTemplateSettings(s => ({ ...s, primaryColor: e.target.value }))} className="w-full h-10 border rounded-lg" />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Company Logo URL</label>
                          <input
                            type="url"
                            placeholder="https://example.com/logo.png"
                            value={templateSettings.logoUrl}
                            onChange={(e) => setTemplateSettings(s => ({ ...s, logoUrl: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-lg bg-background"
                          />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={templateSettings.includeUnsubscribe} onChange={(e) => setTemplateSettings(s => ({ ...s, includeUnsubscribe: e.target.checked }))} className="rounded" />
                            <span className="text-sm">Include unsubscribe link</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={templateSettings.enableOpenTracking} onChange={(e) => setTemplateSettings(s => ({ ...s, enableOpenTracking: e.target.checked }))} className="rounded" />
                            <span className="text-sm">Enable open tracking</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={templateSettings.enableClickTracking} onChange={(e) => setTemplateSettings(s => ({ ...s, enableClickTracking: e.target.checked }))} className="rounded" />
                            <span className="text-sm">Enable click tracking</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={templateSettings.includeSocialSharing} onChange={(e) => setTemplateSettings(s => ({ ...s, includeSocialSharing: e.target.checked }))} className="rounded" />
                            <span className="text-sm">Include social sharing</span>
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
                /* ── Step 2: Body / Block Editor ───────────── */
                <div className="h-full p-4">
                  <EmailBlockEditor
                    value={formBody}
                    onChange={setFormBody}
                    minHeight="calc(100vh - 240px)"
                    showTemplates={!editingTemplate}
                  />
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t bg-background/95 backdrop-blur-sm shrink-0">
              <div className="text-xs text-muted-foreground">
                {activeStep === 'details' && (
                  <span>Fill in the template details, then proceed to design the content.</span>
                )}
                {activeStep === 'body' && (
                  <span>Use the block editor to build your email. Add headings, text, images, buttons, and more.</span>
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
                    if (!formSubject.trim()) { toast.error('Subject line is required'); return }
                    setActiveStep('body')
                  }}
                  disabled={!canProceedToBody}
                  >
                    Next: Design Content
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={handleSaveTemplate} disabled={saving || !formBody.trim()}>
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

      {/* Preview Modal */}
      {showPreviewModal && previewTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-label="Template Preview">
          <div className="bg-background rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold">{previewTemplate.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">Subject: {previewTemplate.subject}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setShowPreviewModal(false); setPreviewTemplate(null); }}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6">
              <div className="border rounded-lg p-6 bg-white">
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewTemplate.body || '<p class="text-muted-foreground">No content</p>') }} />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-6 border-t">
              <Button variant="outline" onClick={() => { setShowPreviewModal(false); setPreviewTemplate(null); }}>
                Close
              </Button>
              <Button onClick={() => { setShowPreviewModal(false); openEditModal(previewTemplate); }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal — M4: shows template name, M5: loading state */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-label="Delete Template Confirmation">
          <div className="bg-background rounded-lg w-full max-w-md">
            <div className="p-6">
              <h2 className="text-lg font-bold mb-2">Delete Template</h2>
              <p className="text-muted-foreground">
                Are you sure you want to delete <strong>&ldquo;{deleteTemplateName}&rdquo;</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2 p-6 border-t">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => handleDeleteTemplate(showDeleteConfirm)} disabled={deleting}>
                {deleting ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplatesLibrary;
