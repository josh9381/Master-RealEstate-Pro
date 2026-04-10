import { logger } from '@/lib/logger'
import { fmtMoney } from '@/lib/metricsCalculator'
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/Dialog'
import { Mail, Phone, Building, Calendar, Edit, Trash2, MessageSquare, FileText, X, AlertTriangle, ArrowLeft, Save, Plus, LayoutDashboard, History, CheckSquare, Wand2, Paperclip, Upload, Download, File, ChevronDown } from 'lucide-react'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { useConfirm } from '@/hooks/useConfirm'
import { AIEmailComposer } from '@/components/ai/AIEmailComposer'
import { AISMSComposer } from '@/components/ai/AISMSComposer'
import { AISuggestedActions } from '@/components/ai/AISuggestedActions'
import { ActivityTimeline } from '@/components/activity/ActivityTimeline'
import { CommunicationHistory } from '@/components/leads/CommunicationHistory'
import { LeadTasks } from '@/components/leads/LeadTasks'
import { FollowUpReminders } from '@/components/leads/FollowUpReminders'
import { LogCallDialog } from '@/components/leads/LogCallDialog'
import intelligenceService, { type LeadPrediction, type EngagementAnalysis } from '@/services/intelligenceService'
import { aiApi } from '@/lib/api'
import { Lead } from '@/types'
import type { AssignedUser, TeamMember, LeadNote } from '@/types'
import { useToast } from '@/hooks/useToast'
import { leadsApi, notesApi, usersApi, pipelinesApi, UpdateLeadData, documentsApi } from '@/lib/api'

// ─── Lead Documents Tab ─────────────────────────────────────────────────────

interface LeadDoc {
  id: string
  filename: string
  mimeType: string
  size: number
  storagePath: string
  url: string
  description?: string
  createdAt: string
  uploadedBy: { id: string; firstName: string; lastName: string }
}

function LeadDocumentsTab({ leadId }: { leadId: string }) {
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()
  const showConfirm = useConfirm()
  const queryClient = useQueryClient()

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['lead-documents', leadId],
    queryFn: async () => {
      const res = await documentsApi.getDocuments(leadId)
      return (res.data || []) as LeadDoc[]
    },
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploading(true)
    try {
      await documentsApi.uploadDocuments(leadId, files)
      queryClient.invalidateQueries({ queryKey: ['lead-documents', leadId] })
      toast.success(`${files.length} document(s) uploaded`)
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Upload failed'
      toast.error(message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (docId: string, filename: string) => {
    if (!await showConfirm({ title: 'Delete Document', message: `Delete "${filename}"?`, confirmLabel: 'Delete', variant: 'destructive' })) return
    try {
      await documentsApi.deleteDocument(leadId, docId)
      queryClient.invalidateQueries({ queryKey: ['lead-documents', leadId] })
      toast.success('Document deleted')
    } catch (error) {
      logger.error('Failed to delete document:', error)
      toast.error('Failed to delete document')
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (mime: string) => {
    if (mime.startsWith('image/')) return '🖼️'
    if (mime === 'application/pdf') return '📄'
    if (mime.includes('word') || mime.includes('msword')) return '📝'
    if (mime.includes('excel') || mime.includes('spreadsheet')) return '📊'
    return '📎'
  }

  const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Documents
            {docs.length > 0 && (
              <Badge variant="secondary" className="text-xs">{docs.length}/20</Badge>
            )}
          </CardTitle>
          <label>
            <input
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
              onChange={handleUpload}
              disabled={uploading}
            />
            <Button size="sm" variant="outline" asChild disabled={uploading}>
              <span>
                <Upload className="h-4 w-4 mr-1.5" />
                {uploading ? 'Uploading...' : 'Upload'}
              </span>
            </Button>
          </label>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <File className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No documents attached</p>
            <p className="text-xs mt-1">Upload PDFs, images, or Office files (max 10 MB each, 20 per lead)</p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors group">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-lg shrink-0">{getFileIcon(doc.mimeType)}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(doc.size)} &middot; {doc.uploadedBy.firstName} {doc.uploadedBy.lastName} &middot; {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={`${apiBase}${doc.url}`} target="_blank" rel="noopener noreferrer" download>
                    <Button size="sm" variant="ghost">
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(doc.id, doc.filename)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main LeadDetail Component ──────────────────────────────────────────────

function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const showConfirm = useConfirm()
  const queryClient = useQueryClient()
  const [showEmailComposer, setShowEmailComposer] = useState(false)
  const [showSMSComposer, setShowSMSComposer] = useState(false)
  const [showLogCall, setShowLogCall] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editSections, setEditSections] = useState<Record<string, boolean>>({ company: false, address: false, realEstate: false, notes: false })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [showAddNote, setShowAddNote] = useState(false)
  const [newNoteText, setNewNoteText] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteText, setEditingNoteText] = useState('')
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<'overview' | 'communications' | 'notes' | 'tasks' | 'documents'>('overview')
  // AI Intelligence state
  const [aiPrediction, setAiPrediction] = useState<LeadPrediction | null>(null)
  const [aiEngagement, setAiEngagement] = useState<EngagementAnalysis | null>(null)
  const [loadingAI, setLoadingAI] = useState(false)

  // Fetch notes from API
  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ['lead-notes', id],
    queryFn: async () => {
      const response = await notesApi.getLeadNotes(id!)
      const result = response.data?.notes || response.data
      return Array.isArray(result) ? result : []
    },
    enabled: !!id,
  })

  // Fetch team members for assignedTo dropdown
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      try {
        const members = await usersApi.getTeamMembers()
        return Array.isArray(members) ? members : []
      } catch (error) {
        logger.error('Team members endpoint unavailable, trying fallback:', error)
        // Fallback to users list if team-members endpoint unavailable
        const result = await usersApi.getUsers({ limit: 50 })
        return result?.data?.users || result?.users || []
      }
    },
  })

  // Fetch lead details from API
  const { data: leadResponse, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      try {
        const response = await leadsApi.getLead(id!)
        // Backend returns { success: true, data: { lead } }
        return response.data?.lead || response.data
      } catch (error) {
        return null
      }
    },
    enabled: !!id,
    refetchOnWindowFocus: false,
  })

  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadData }) =>
      leadsApi.updateLead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead updated successfully')
    },
    onError: () => {
      toast.error('Failed to update lead')
    },
  })

  // Delete lead mutation
  const deleteLeadMutation = useMutation({
    mutationFn: (id: string) => leadsApi.deleteLead(id),
    onSuccess: () => {
      toast.success('Lead deleted successfully')
      navigate('/leads')
    },
    onError: () => {
      toast.error('Failed to delete lead')
    },
  })

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: (data: { leadId: string; content: string }) =>
      notesApi.createNote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-notes', id] })
      toast.success('Note added successfully')
      setNewNoteText('')
      setShowAddNote(false)
    },
    onError: () => {
      toast.error('Failed to add note')
    },
  })

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
      notesApi.updateNote(noteId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-notes', id] })
      toast.success('Note updated successfully')
      setEditingNoteId(null)
      setEditingNoteText('')
    },
    onError: () => {
      toast.error('Failed to update note')
    },
  })

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => notesApi.deleteNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-notes', id] })
      toast.success('Note deleted')
    },
    onError: () => {
      toast.error('Failed to delete note')
    },
  })

  const handleAddNote = () => {
    if (!newNoteText.trim() || !id) return
    createNoteMutation.mutate({ leadId: id, content: newNoteText.trim() })
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Hot lead — high quality'
    if (score >= 60) return 'Warm lead — good potential'
    if (score >= 40) return 'Cool lead — needs nurturing'
    return 'Cold lead — early stage'
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success'
    if (score >= 60) return 'text-warning'
    if (score >= 40) return 'text-primary'
    return 'text-gray-500'
  }

  const lead = leadResponse as Lead | undefined
  
  // Load AI intelligence data when lead is available
  useEffect(() => {
    let cancelled = false
    const loadAIInsights = async () => {
      if (!id) return
      
      setLoadingAI(true)
      try {
        const results = await Promise.allSettled([
          intelligenceService.getLeadPrediction(id),
          intelligenceService.getEngagementAnalysis(id),
        ])
        
        if (cancelled) return
        if (results[0].status === 'fulfilled') setAiPrediction(results[0].value)
        if (results[1].status === 'fulfilled') setAiEngagement(results[1].value)
        
        const failures = results.filter(r => r.status === 'rejected')
        if (failures.length === results.length) {
          toast.error('Failed to load AI insights')
        } else if (failures.length > 0) {
          logger.warn('Some AI insights failed to load:', failures)
        }
      } catch (error) {
        if (cancelled) return
        logger.error('Error loading AI insights:', error)
        toast.error('Failed to load AI insights')
      } finally {
        if (!cancelled) setLoadingAI(false)
      }
    }
    
    if (lead) {
      loadAIInsights()
    }

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, lead])

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-10 bg-muted rounded w-1/3 mb-2" />
          <div className="h-6 bg-muted rounded w-1/4" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded animate-pulse" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4">
            <div className="h-48 bg-muted rounded animate-pulse" />
            <div className="h-64 bg-muted rounded animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-32 bg-muted rounded animate-pulse" />
            <div className="h-48 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  // Show error if lead not found
  if (!lead) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Lead not found</h2>
          <p className="text-muted-foreground mb-4">The lead you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => navigate('/leads')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Leads
          </Button>
        </div>
      </div>
    )
  }

  const handleEditLead = () => {
    if (!lead) {
      toast.error('Lead data not loaded')
      return
    }
    // Create a copy with all necessary fields
    setEditingLead({
      ...lead,
      firstName: lead.firstName || '',
      lastName: lead.lastName || '',
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company || '',
      position: lead.position || '',
      status: lead.status || 'new',
      source: lead.source || '',
      score: lead.score || 0,
      notes: lead.notes || ''
    })
    setEditErrors({})
    setShowEditModal(true)
  }

  const validateEditForm = (): Record<string, string> => {
    const newErrors: Record<string, string> = {}
    if (!editingLead) return newErrors
    if (!editingLead.firstName?.trim()) newErrors.firstName = 'First name is required'
    if (!editingLead.lastName?.trim()) newErrors.lastName = 'Last name is required'
    if (editingLead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editingLead.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (editingLead.phone && !/^\+?[\d\s()-]{7,20}$/.test(editingLead.phone)) {
      newErrors.phone = 'Please enter a valid phone number'
    }
    return newErrors
  }

  const handleSaveEdit = async () => {
    if (editingLead && id) {
      const newErrors = validateEditForm()
      setEditErrors(newErrors)
      if (Object.keys(newErrors).length > 0) {
        toast.error('Please fix the validation errors')
        return
      }
      const updateData: UpdateLeadData = {
        firstName: editingLead.firstName,
        lastName: editingLead.lastName,
        email: editingLead.email,
        phone: editingLead.phone,
        company: editingLead.company,
        status: editingLead.status?.toUpperCase() as Lead['status'],
        source: editingLead.source,
        score: editingLead.score,
        assignedToId: typeof editingLead.assignedTo === 'object' && editingLead.assignedTo !== null 
          ? (editingLead.assignedTo as AssignedUser).id 
          : editingLead.assignedTo || undefined,
        tags: editingLead.tags,
        customFields: editingLead.customFields,
      }
      
      updateLeadMutation.mutate({
        id: id,
        data: updateData
      })
      setShowEditModal(false)
      setEditingLead(null)

      // Prompt to move pipeline stage when status changes to WON/LOST
      const newStatus = editingLead.status?.toUpperCase()
      const oldStatus = lead?.status?.toUpperCase()
      if (newStatus !== oldStatus && (newStatus === 'WON' || newStatus === 'LOST')) {
        const shouldMove = await showConfirm({
          title: 'Update Pipeline Stage',
          message: `Also move this lead to the ${newStatus === 'WON' ? 'Win' : 'Lost'} pipeline stage?`,
          confirmLabel: 'Move',
        })
        if (shouldMove) {
          try {
            const res = await pipelinesApi.getPipelines()
            const pipelines = res.data || []
            for (const pipeline of pipelines) {
              const targetStage = pipeline.stages.find(s =>
                newStatus === 'WON' ? s.isWinStage : s.isLostStage
              )
              if (targetStage) {
                await pipelinesApi.moveLeadToStage(id, {
                  pipelineId: pipeline.id,
                  pipelineStageId: targetStage.id,
                })
                queryClient.invalidateQueries({ queryKey: ['pipeline'] })
                toast.success(`Lead moved to ${targetStage.name} stage`)
                break
              }
            }
          } catch (error) {
            logger.error('Failed to move lead to pipeline stage:', error)
            toast.error('Failed to move lead to pipeline stage')
          }
        }
      }
    }
  }

  const handleDeleteLead = () => {
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (id) {
      deleteLeadMutation.mutate(id)
      setShowDeleteConfirm(false)
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
  }

  return (
    <div className="flex flex-col gap-2 max-h-[calc(100vh-12rem)] overflow-hidden">

      {/* Back button */}
      <div className="flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/leads')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Leads
        </Button>
      </div>

      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{lead ? `${lead.firstName} ${lead.lastName}` : 'Unknown Lead'}</h1>
          {(lead?.position || lead?.company) && (
            <p className="text-sm text-muted-foreground">
              {lead?.position && lead?.company
                ? `${lead.position} at ${lead.company}`
                : lead?.position || lead?.company}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const res = await aiApi.enrichLead(id!)
                if (res.data?.suggestions) {
                  const applied = Object.keys(res.data.suggestions).filter(k => res.data.suggestions[k])
                  if (applied.length > 0) {
                    await aiApi.applyEnrichment(id!, res.data.suggestions)
                    queryClient.invalidateQueries({ queryKey: ['lead', id] })
                    toast.success(`AI enriched ${applied.length} fields`)
                  } else {
                    toast.info('No new data to enrich')
                  }
                }
              } catch (error) {
                logger.error('AI enrichment failed:', error)
                toast.error('AI enrichment failed')
              }
            }}
          >
            <Wand2 className="mr-2 h-4 w-4" />
            AI Enrich
          </Button>
          <Button variant="outline" size="sm" onClick={handleEditLead}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeleteLead}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Quick Actions with AI */}
      <div className="flex-shrink-0 grid gap-2 md:grid-cols-4">
        <Button onClick={() => setShowEmailComposer(true)} size="sm" className="h-auto flex-row gap-2 py-1.5 px-3 justify-center">
          <Mail className="h-4 w-4" />
          <span className="font-medium text-sm">Email</span>
          <span className="text-xs opacity-75">✨ AI-powered</span>
        </Button>
        <Button onClick={() => setShowSMSComposer(true)} variant="outline" size="sm" className="h-auto flex-row gap-2 py-1.5 px-3 justify-center">
          <MessageSquare className="h-4 w-4" />
          <span className="font-medium text-sm">SMS</span>
          <span className="text-xs opacity-75">✨ AI-powered</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-auto flex-row gap-2 py-1.5 px-3 justify-center"
          onClick={() => {
            if (lead?.phone) {
              window.open(`tel:${lead.phone}`, '_self')
            } else {
              toast.error('No phone number available for this lead')
            }
          }}
        >
          <Phone className="h-4 w-4" />
          <span className="font-medium text-sm">Call</span>
          <span className="text-xs opacity-75">{lead?.phone ? 'Quick dial' : 'No phone'}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-auto flex-row gap-2 py-1.5 px-3 justify-center"
          onClick={() => setShowLogCall(true)}
        >
          <Phone className="h-4 w-4" />
          <span className="font-medium text-sm">Log Call</span>
          <span className="text-xs opacity-75">Record outcome</span>
        </Button>
      </div>

      <div className="flex-1 min-h-0 grid gap-4 md:grid-cols-[1fr_320px] md:grid-rows-[1fr] overflow-hidden">
        {/* Main Info - Tabbed */}
        <div className="flex flex-col gap-3 min-h-0 overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex-shrink-0 flex gap-1 rounded-lg border bg-muted/30 p-1">
            <Button
              size="sm"
              variant={activeTab === 'overview' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('overview')}
              className="h-9"
            >
              <LayoutDashboard className="h-4 w-4 mr-1.5" />
              Overview
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'communications' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('communications')}
              className="h-9"
            >
              <History className="h-4 w-4 mr-1.5" />
              Communications
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'notes' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('notes')}
              className="h-9"
            >
              <FileText className="h-4 w-4 mr-1.5" />
              Notes
              {notes.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs h-5 px-1.5">{notes.length}</Badge>
              )}
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'tasks' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('tasks')}
              className="h-9"
            >
              <CheckSquare className="h-4 w-4 mr-1.5" />
              Tasks
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'documents' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('documents')}
              className="h-9"
            >
              <Paperclip className="h-4 w-4 mr-1.5" />
              Documents
            </Button>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
          {/* Contact Info Card */}
          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground truncate">{lead?.email || 'No email provided'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground truncate">{lead?.phone || 'No phone provided'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Company</p>
                    <p className="text-sm text-muted-foreground truncate">{lead?.company || 'No company provided'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-sm text-muted-foreground">
                      {lead?.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      }) : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Real Estate Details */}
          {(lead.propertyType || lead.transactionType || lead.budgetMin || lead.budgetMax || lead.preApprovalStatus || lead.moveInTimeline || lead.desiredLocation || lead.bedsMin || lead.bathsMin) && (
            <Card className="transition-all duration-200 hover:shadow-md">
              <CardHeader>
                <CardTitle>Real Estate Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lead.propertyType && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Property Type</span>
                      <span className="text-sm font-medium">{lead.propertyType}</span>
                    </div>
                  )}
                  {lead.transactionType && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Transaction Type</span>
                      <span className="text-sm font-medium">{lead.transactionType}</span>
                    </div>
                  )}
                  {(lead.budgetMin || lead.budgetMax) && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Budget Range</span>
                      <span className="text-sm font-medium">
                        {lead.budgetMin ? fmtMoney(Number(lead.budgetMin)) : '?'}
                        {' – '}
                        {lead.budgetMax ? fmtMoney(Number(lead.budgetMax)) : '?'}
                      </span>
                    </div>
                  )}
                  {lead.preApprovalStatus && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Pre-Approval</span>
                      <span className="text-sm font-medium">{lead.preApprovalStatus}</span>
                    </div>
                  )}
                  {lead.moveInTimeline && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Timeline</span>
                      <span className="text-sm font-medium">{lead.moveInTimeline}</span>
                    </div>
                  )}
                  {lead.desiredLocation && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Desired Location</span>
                      <span className="text-sm font-medium">{lead.desiredLocation}</span>
                    </div>
                  )}
                  {(lead.bedsMin || lead.bathsMin) && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Beds / Baths (min)</span>
                      <span className="text-sm font-medium">
                        {lead.bedsMin ?? '–'} bed / {lead.bathsMin ?? '–'} bath
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity Timeline */}
          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline leadName={`${lead.firstName} ${lead.lastName}`} leadId={id} />
            </CardContent>
          </Card>
            </div>
          )}

          {/* Communications Tab */}
          {activeTab === 'communications' && (
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <Card className="transition-all duration-200 hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Communication History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CommunicationHistory
                  leadId={id!}
                  leadName={`${lead.firstName} ${lead.lastName}`}
                  leadPhone={lead?.phone}
                  onComposeEmail={() => setShowEmailComposer(true)}
                  onComposeSMS={() => setShowSMSComposer(true)}
                  onLogCall={() => setShowLogCall(true)}
                />
              </CardContent>
            </Card>
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Notes ({notes.length})</CardTitle>
                <Button size="sm" onClick={() => setShowAddNote(!showAddNote)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add Note
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Add Note Form */}
                {showAddNote && (
                  <div className="rounded-lg border border-primary/50 p-4 bg-muted/30">
                    <textarea
                      className="w-full p-2 border rounded-md min-h-[80px] text-sm resize-none"
                      placeholder="Write a note about this lead..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowAddNote(false)
                          setNewNoteText('')
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleAddNote}
                        disabled={!newNoteText.trim() || createNoteMutation.isPending}
                      >
                        <Save className="mr-1 h-4 w-4" />
                        {createNoteMutation.isPending ? 'Saving...' : 'Save Note'}
                      </Button>
                    </div>
                  </div>
                )}

                {notesLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : notes.length === 0 && !showAddNote ? (
                  <div className="text-center py-6">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No notes yet.</p>
                    <Button
                      size="sm"
                      variant="link"
                      onClick={() => setShowAddNote(true)}
                      className="mt-1"
                    >
                      Add your first note
                    </Button>
                  </div>
                ) : (
                  notes.map((note: LeadNote) => (
                    <div key={note.id} className="rounded-lg border p-4 hover:bg-muted/30 transition-colors">
                      {editingNoteId === note.id ? (
                        <>
                          <textarea
                            className="w-full p-2 border rounded-md min-h-[60px] text-sm resize-none"
                            value={editingNoteText}
                            onChange={(e) => setEditingNoteText(e.target.value)}
                            autoFocus
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <Button size="sm" variant="outline" onClick={() => { setEditingNoteId(null); setEditingNoteText('') }}>
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => updateNoteMutation.mutate({ noteId: note.id, content: editingNoteText.trim() })}
                              disabled={!editingNoteText.trim() || updateNoteMutation.isPending}
                            >
                              <Save className="mr-1 h-3 w-3" />
                              {updateNoteMutation.isPending ? 'Saving...' : 'Save'}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{note.user?.firstName
                              ? `${note.user.firstName}${note.user.lastName ? ' ' + note.user.lastName : ''}`
                              : (typeof note.author === 'object' && note.author !== null
                                ? `${(note.author as { firstName?: string; lastName?: string }).firstName || ''} ${(note.author as { firstName?: string; lastName?: string }).lastName || ''}`.trim()
                                : note.author || 'You')}</span>
                            <div className="flex items-center gap-3">
                              <span>{note.createdAt ? new Date(note.createdAt).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
                              }) : note.date}</span>
                              <button
                                className="text-primary hover:underline"
                                onClick={() => { setEditingNoteId(note.id); setEditingNoteText(note.content) }}
                              >
                                <Edit className="h-3 w-3 inline mr-0.5" />
                                Edit
                              </button>
                              <button
                                className="text-destructive hover:underline"
                                onClick={async () => {
                                  if (await showConfirm({ title: 'Delete Note', message: 'Delete this note?', confirmLabel: 'Delete', variant: 'destructive' })) {
                                    deleteNoteMutation.mutate(note.id)
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3 inline mr-0.5" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <Card className="transition-all duration-200 hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LeadTasks
                  leadId={id!}
                  leadName={`${lead.firstName} ${lead.lastName}`}
                />
              </CardContent>
            </Card>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <LeadDocumentsTab leadId={id!} />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="min-h-0 overflow-y-auto space-y-3 pr-1">
          {/* AI Suggested Actions */}
          <AISuggestedActions 
            leadId={id}
            onComposeEmail={() => setShowEmailComposer(true)}
            onScheduleCall={() => {
              if (lead?.phone) {
                window.location.href = `tel:${lead.phone}`
              } else {
                toast.info('No phone number available for this lead')
              }
            }}
            onBookDemo={() => {
              toast.info('Demo scheduling — navigate to calendar to book a meeting')
            }}
            prediction={aiPrediction}
            engagement={aiEngagement}
            insightsLoading={loadingAI}
          />

          {/* Follow-Up Reminders */}
          <FollowUpReminders
            leadId={id || ''}
            leadName={`${lead?.firstName || ''} ${lead?.lastName || ''}`}
          />

          {/* Lead Score */}
          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                Lead Score
                <HelpTooltip text="Lead Score (0–100) measures how likely a lead is to convert. It’s calculated from engagement (email opens, clicks), profile completeness, source quality, and activity recency. Score 80+ = Hot, 60–79 = Warm, 40–59 = Cool, below 40 = Cold. Improve it by adding more contact details, sending targeted campaigns, and logging interactions." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                {/* Score Ring */}
                <div className="relative inline-flex items-center justify-center">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                    <circle
                      cx="50" cy="50" r="40" fill="none" strokeWidth="8"
                      strokeDasharray={`${(lead.score / 100) * 251.2} 251.2`}
                      strokeLinecap="round"
                      className={getScoreColor(lead.score)}
                      stroke="currentColor"
                    />
                  </svg>
                  <div className="absolute text-3xl font-bold">{lead.score}</div>
                </div>
                <p className={`mt-2 text-sm font-medium ${getScoreColor(lead.score)}`}>{getScoreLabel(lead.score)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Status & Details */}
          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Status</p>
                <Badge 
                  variant={
                    lead?.status === 'won' ? 'success' :
                    lead?.status === 'lost' ? 'destructive' :
                    lead?.status === 'qualified' ? 'success' :
                    lead?.status === 'proposal' || lead?.status === 'negotiation' ? 'warning' :
                    lead?.status === 'contacted' ? 'default' : 'secondary'
                  } 
                  className="mt-1 capitalize"
                >
                  {lead?.status || 'NEW'}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium">Source</p>
                <p className="mt-1 text-sm text-muted-foreground">{lead?.source || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Assigned To</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {typeof lead?.assignedTo === 'object' && lead?.assignedTo !== null
                    ? `${(lead.assignedTo as AssignedUser).firstName || ''} ${(lead.assignedTo as AssignedUser).lastName || ''}`.trim() || 'Unassigned'
                    : (typeof lead?.assignedTo === 'string' ? lead.assignedTo : 'Unassigned')}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Tags</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Array.isArray(lead?.tags) && lead.tags.length > 0 ? (
                    lead.tags.map((tag, index) => {
                      const tagName = typeof tag === 'object' && tag !== null ? (tag as { name: string }).name : tag
                      return <Badge key={`${tagName}-${index}`} variant="secondary">{tagName}</Badge>
                    })
                  ) : (
                    <span className="text-sm text-muted-foreground">No tags</span>
                  )}
                </div>
              </div>
              {lead?.value != null && lead.value > 0 && (
                <div>
                  <p className="text-sm font-medium">Deal Value</p>
                  <p className="mt-1 text-sm text-muted-foreground font-medium">
                    {fmtMoney(lead.value)}
                  </p>
                </div>
              )}
              {lead?.lastContact && (
                <div>
                  <p className="text-sm font-medium">Last Contact</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {new Date(lead.lastContact).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Composers - Modals */}
      <AIEmailComposer
        isOpen={showEmailComposer}
        onClose={() => setShowEmailComposer(false)}
        leadName={lead ? `${lead.firstName} ${lead.lastName}` : ''}
        leadEmail={lead?.email || ''}
        leadId={id}
      />
      <AISMSComposer
        isOpen={showSMSComposer}
        onClose={() => setShowSMSComposer(false)}
        leadName={lead?.firstName || ''}
        leadPhone={lead?.phone || ''}
        leadId={id}
      />

      {/* Log Call Dialog */}
      <LogCallDialog
        open={showLogCall}
        onOpenChange={setShowLogCall}
        leadId={id || ''}
        leadName={lead ? `${lead.firstName} ${lead.lastName}` : 'Unknown'}
        leadPhone={lead?.phone}
      />

      {/* Edit Lead Modal */}
      {showEditModal && editingLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Edit Lead</h2>
              <Button variant="ghost" size="icon" onClick={() => {
                setShowEditModal(false)
                setEditingLead(null)
              }} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-sm font-medium">First Name *</label>
                        <Input
                          value={editingLead?.firstName || ''}
                          onChange={(e) => setEditingLead({...editingLead!, firstName: e.target.value})}
                          className="mt-1"
                          placeholder="John"
                        />
                        {editErrors.firstName && <p className="text-sm text-destructive mt-1">{editErrors.firstName}</p>}
                      </div>
                      <div>
                        <label className="text-sm font-medium">Last Name *</label>
                        <Input
                          value={editingLead?.lastName || ''}
                          onChange={(e) => setEditingLead({...editingLead!, lastName: e.target.value})}
                          className="mt-1"
                          placeholder="Doe"
                        />
                        {editErrors.lastName && <p className="text-sm text-destructive mt-1">{editErrors.lastName}</p>}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Position/Title</label>
                    <Input
                      value={editingLead?.position || ''}
                      onChange={(e) => setEditingLead({...editingLead!, position: e.target.value})}
                      className="mt-1"
                      placeholder="CEO, Manager, etc."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email *</label>
                    <Input
                      type="email"
                      value={editingLead?.email || ''}
                      onChange={(e) => setEditingLead({...editingLead!, email: e.target.value})}
                      className="mt-1"
                      placeholder="john@example.com"
                    />
                    {editErrors.email && <p className="text-sm text-destructive mt-1">{editErrors.email}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      value={editingLead?.phone || ''}
                      onChange={(e) => setEditingLead({...editingLead!, phone: e.target.value})}
                      className="mt-1"
                      placeholder="+1 (555) 123-4567"
                    />
                    {editErrors.phone && <p className="text-sm text-destructive mt-1">{editErrors.phone}</p>}
                  </div>
                </div>
              </div>

              {/* Company Information */}
              <div className="border rounded-lg">
                <button
                  type="button"
                  className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50 rounded-lg transition-colors"
                  onClick={() => setEditSections(s => ({ ...s, company: !s.company }))}
                >
                  <h3 className="text-lg font-semibold">Company Information</h3>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${editSections.company ? 'rotate-180' : ''}`} />
                </button>
                {editSections.company && <div className="grid grid-cols-2 gap-4 px-3 pb-3">
                  <div>
                    <label className="text-sm font-medium">Company Name</label>
                    <Input
                      value={editingLead?.company || ''}
                      onChange={(e) => setEditingLead({...editingLead!, company: e.target.value})}
                      className="mt-1"
                      placeholder="Acme Inc"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Industry</label>
                    <Input
                      value={editingLead.customFields?.industry || ''}
                      onChange={(e) => setEditingLead({
                        ...editingLead, 
                        customFields: {...editingLead.customFields, industry: e.target.value}
                      })}
                      className="mt-1"
                      placeholder="Technology, Healthcare, etc."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Company Size</label>
                    <Input
                      type="number"
                      value={editingLead.customFields?.companySize || ''}
                      onChange={(e) => setEditingLead({
                        ...editingLead,
                        customFields: {...editingLead.customFields, companySize: parseInt(e.target.value) || 0}
                      })}
                      className="mt-1"
                      placeholder="Number of employees"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Website</label>
                    <Input
                      value={editingLead.customFields?.website || ''}
                      onChange={(e) => setEditingLead({
                        ...editingLead,
                        customFields: {...editingLead.customFields, website: e.target.value}
                      })}
                      className="mt-1"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>}
              </div>

              {/* Address Information */}
              <div className="border rounded-lg">
                <button
                  type="button"
                  className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50 rounded-lg transition-colors"
                  onClick={() => setEditSections(s => ({ ...s, address: !s.address }))}
                >
                  <h3 className="text-lg font-semibold">Address</h3>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${editSections.address ? 'rotate-180' : ''}`} />
                </button>
                {editSections.address && <div className="grid grid-cols-2 gap-4 px-3 pb-3">
                  <div className="col-span-2">
                    <label className="text-sm font-medium">Street Address</label>
                    <Input
                      value={editingLead.customFields?.address?.street || ''}
                      onChange={(e) => setEditingLead({
                        ...editingLead,
                        customFields: {
                          ...editingLead.customFields,
                          address: {...editingLead.customFields?.address, street: e.target.value}
                        }
                      })}
                      className="mt-1"
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">City</label>
                    <Input
                      value={editingLead.customFields?.address?.city || ''}
                      onChange={(e) => setEditingLead({
                        ...editingLead,
                        customFields: {
                          ...editingLead.customFields,
                          address: {...editingLead.customFields?.address, city: e.target.value}
                        }
                      })}
                      className="mt-1"
                      placeholder="New York"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">State/Province</label>
                    <Input
                      value={editingLead.customFields?.address?.state || ''}
                      onChange={(e) => setEditingLead({
                        ...editingLead,
                        customFields: {
                          ...editingLead.customFields,
                          address: {...editingLead.customFields?.address, state: e.target.value}
                        }
                      })}
                      className="mt-1"
                      placeholder="NY"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">ZIP/Postal Code</label>
                    <Input
                      value={editingLead.customFields?.address?.zip || ''}
                      onChange={(e) => setEditingLead({
                        ...editingLead,
                        customFields: {
                          ...editingLead.customFields,
                          address: {...editingLead.customFields?.address, zip: e.target.value}
                        }
                      })}
                      className="mt-1"
                      placeholder="10001"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Country</label>
                    <Input
                      value={editingLead.customFields?.address?.country || ''}
                      onChange={(e) => setEditingLead({
                        ...editingLead,
                        customFields: {
                          ...editingLead.customFields,
                          address: {...editingLead.customFields?.address, country: e.target.value}
                        }
                      })}
                      className="mt-1"
                      placeholder="United States"
                    />
                  </div>
                </div>}
              </div>

              {/* Lead Details */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Lead Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <select 
                      className="w-full mt-1 p-2 border rounded-md"
                      value={editingLead.status}
                      onChange={(e) => setEditingLead({...editingLead, status: e.target.value as Lead['status']})}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="proposal">Proposal</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Source</label>
                    <select 
                      className="w-full mt-1 p-2 border rounded-md capitalize"
                      value={editingLead.source}
                      onChange={(e) => setEditingLead({...editingLead, source: e.target.value})}
                    >
                      <option value="website">Website</option>
                      <option value="referral">Referral</option>
                      <option value="social">Social Media</option>
                      <option value="email">Email Campaign</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="event">Event</option>
                      <option value="partner">Partner</option>
                      <option value="cold_call">Cold Call</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Lead Score (0-100)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={editingLead.score}
                      onChange={(e) => setEditingLead({...editingLead, score: parseInt(e.target.value) || 0})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Assigned To</label>
                    <select 
                      className="w-full mt-1 p-2 border rounded-md"
                      value={typeof editingLead.assignedTo === 'object' && editingLead.assignedTo !== null ? (editingLead.assignedTo as AssignedUser).id : editingLead.assignedTo || ''}
                      onChange={(e) => setEditingLead({...editingLead, assignedTo: e.target.value || null})}
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.length > 0 ? (
                        teamMembers.map((member: TeamMember) => (
                          <option key={member.id} value={member.id}>
                            {member.firstName} {member.lastName}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No team members found</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Deal Value ($)</label>
                    <Input
                      type="number"
                      value={editingLead.value || ''}
                      onChange={(e) => setEditingLead({...editingLead, value: parseInt(e.target.value) || 0})}
                      className="mt-1"
                      placeholder="50000"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Budget ($)</label>
                    <Input
                      type="number"
                      value={editingLead.customFields?.budget || ''}
                      onChange={(e) => setEditingLead({
                        ...editingLead,
                        customFields: {...editingLead.customFields, budget: parseInt(e.target.value) || 0}
                      })}
                      className="mt-1"
                      placeholder="75000"
                    />
                  </div>
                </div>
              </div>

              {/* Real Estate Information */}
              <div className="border rounded-lg">
                <button
                  type="button"
                  className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50 rounded-lg transition-colors"
                  onClick={() => setEditSections(s => ({ ...s, realEstate: !s.realEstate }))}
                >
                  <h3 className="text-lg font-semibold">Real Estate Information</h3>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${editSections.realEstate ? 'rotate-180' : ''}`} />
                </button>
                {editSections.realEstate && <div className="grid grid-cols-2 gap-4 px-3 pb-3">
                  <div>
                    <label className="text-sm font-medium">Property Type</label>
                    <select
                      className="w-full mt-1 p-2 border rounded-md"
                      value={editingLead.propertyType || ''}
                      onChange={(e) => setEditingLead({...editingLead, propertyType: e.target.value || null})}
                    >
                      <option value="">Not specified</option>
                      <option value="Single Family">Single Family</option>
                      <option value="Condo">Condo</option>
                      <option value="Townhouse">Townhouse</option>
                      <option value="Multi-Family">Multi-Family</option>
                      <option value="Land">Land</option>
                      <option value="Commercial">Commercial</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Transaction Type</label>
                    <select
                      className="w-full mt-1 p-2 border rounded-md"
                      value={editingLead.transactionType || ''}
                      onChange={(e) => setEditingLead({...editingLead, transactionType: e.target.value || null})}
                    >
                      <option value="">Not specified</option>
                      <option value="Buyer">Buyer</option>
                      <option value="Seller">Seller</option>
                      <option value="Both">Both (Buy + Sell)</option>
                      <option value="Investor">Investor</option>
                      <option value="Renter">Renter</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Budget Min ($)</label>
                    <input
                      type="number"
                      className="w-full mt-1 p-2 border rounded-md"
                      value={editingLead.budgetMin ?? ''}
                      onChange={(e) => setEditingLead({...editingLead, budgetMin: e.target.value ? parseFloat(e.target.value) : null})}
                      placeholder="200000"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Budget Max ($)</label>
                    <input
                      type="number"
                      className="w-full mt-1 p-2 border rounded-md"
                      value={editingLead.budgetMax ?? ''}
                      onChange={(e) => setEditingLead({...editingLead, budgetMax: e.target.value ? parseFloat(e.target.value) : null})}
                      placeholder="500000"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Pre-Approval Status</label>
                    <select
                      className="w-full mt-1 p-2 border rounded-md"
                      value={editingLead.preApprovalStatus || ''}
                      onChange={(e) => setEditingLead({...editingLead, preApprovalStatus: e.target.value || null})}
                    >
                      <option value="">Not specified</option>
                      <option value="Not Started">Not Started</option>
                      <option value="In-Process">In-Process</option>
                      <option value="Pre-Approved">Pre-Approved</option>
                      <option value="Cash Buyer">Cash Buyer</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Move-In Timeline</label>
                    <select
                      className="w-full mt-1 p-2 border rounded-md"
                      value={editingLead.moveInTimeline || ''}
                      onChange={(e) => setEditingLead({...editingLead, moveInTimeline: e.target.value || null})}
                    >
                      <option value="">Not specified</option>
                      <option value="ASAP">ASAP</option>
                      <option value="1-3 Months">1-3 Months</option>
                      <option value="3-6 Months">3-6 Months</option>
                      <option value="6-12 Months">6-12 Months</option>
                      <option value="Just Browsing">Just Browsing</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium">Desired Location</label>
                    <input
                      type="text"
                      className="w-full mt-1 p-2 border rounded-md"
                      value={editingLead.desiredLocation || ''}
                      onChange={(e) => setEditingLead({...editingLead, desiredLocation: e.target.value || null})}
                      placeholder="City, neighborhood, or zip code"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Min Bedrooms</label>
                    <input
                      type="number"
                      className="w-full mt-1 p-2 border rounded-md"
                      value={editingLead.bedsMin ?? ''}
                      onChange={(e) => setEditingLead({...editingLead, bedsMin: e.target.value ? parseInt(e.target.value) : null})}
                      min="0"
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Min Bathrooms</label>
                    <input
                      type="number"
                      className="w-full mt-1 p-2 border rounded-md"
                      value={editingLead.bathsMin ?? ''}
                      onChange={(e) => setEditingLead({...editingLead, bathsMin: e.target.value ? parseInt(e.target.value) : null})}
                      min="0"
                      placeholder="2"
                    />
                  </div>
                </div>}
              </div>

              {/* Notes */}
              <div className="border rounded-lg">
                <button
                  type="button"
                  className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50 rounded-lg transition-colors"
                  onClick={() => setEditSections(s => ({ ...s, notes: !s.notes }))}
                >
                  <h3 className="text-lg font-semibold">Notes</h3>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${editSections.notes ? 'rotate-180' : ''}`} />
                </button>
                {editSections.notes && <div className="px-3 pb-3"><textarea
                  className="w-full p-2 border rounded-md min-h-[100px]"
                  value={typeof editingLead.notes === 'string' ? editingLead.notes : ''}
                  onChange={(e) => setEditingLead({...editingLead, notes: e.target.value})}
                  placeholder="Add any additional notes about this lead..."
                />
                </div>}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setShowEditModal(false)
                  setEditingLead(null)
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  <FileText className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lead? This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" onClick={cancelDelete}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteLeadMutation.isPending}
            >
              {deleteLeadMutation.isPending ? 'Deleting...' : 'Delete Lead'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default LeadDetail
