import { logger } from '@/lib/logger'
import { fmtMoney } from '@/lib/metricsCalculator'
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Mail, MessageSquare, Phone, Users, Calendar, DollarSign, Target, Sparkles, RefreshCw, Save, ChevronRight, ChevronLeft, Eye, AtSign, Smartphone, AlertTriangle, FileText, Check } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { campaignsApi, leadsApi, templatesApi, segmentsApi, CreateCampaignData } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { CampaignPreviewModal } from '@/components/campaigns/CampaignPreviewModal'
import { MessageEnhancerModal } from '@/components/ai/MessageEnhancerModal'
import { ContentGeneratorWizard } from '@/components/ai/ContentGeneratorWizard'
import { DaysOfWeekPicker } from '@/components/ui/DaysOfWeekPicker'
import { AdvancedAudienceFilters } from '@/components/campaigns/AdvancedAudienceFilters'
import { EmailBlockEditor } from '@/components/email/EmailBlockEditor'
import type { CampaignPreviewData, EmailTemplateResponse } from '@/types'

const campaignTypes = [
  {
    type: 'email',
    title: 'Email Campaign',
    description: 'Send targeted emails to your leads',
    icon: Mail,
    comingSoon: false,
  },
  {
    type: 'sms',
    title: 'SMS Campaign',
    description: 'Send text messages to your contacts',
    icon: MessageSquare,
    comingSoon: false,
  },
  {
    type: 'phone',
    title: 'Phone Campaign',
    description: 'Automated or manual calling campaign',
    icon: Phone,
    comingSoon: true,
  },
  {
    type: 'social',
    title: 'Social Media',
    description: 'Post to your social media channels',
    icon: Users,
    comingSoon: true,
  },
]

// Personalization tokens available for insertion
const personalizationTokens = [
  { token: '{{firstName}}', label: 'First Name' },
  { token: '{{lastName}}', label: 'Last Name' },
  { token: '{{email}}', label: 'Email' },
  { token: '{{phone}}', label: 'Phone' },
  { token: '{{propertyAddress}}', label: 'Property Address' },
  { token: '{{propertyType}}', label: 'Property Type' },
  { token: '{{agentName}}', label: 'Agent Name' },
  { token: '{{companyName}}', label: 'Company' },
]

// Quick-start templates for Step 1
const quickStartTemplates = {
  email: [
    { id: 'email-welcome', name: 'Welcome Series', description: 'Introduce yourself to new leads', subject: 'Welcome! Let\'s Find Your Dream Home', body: '' },
    { id: 'email-listing', name: 'New Listing Alert', description: 'Notify leads about a new property', subject: 'Just Listed: {{propertyAddress}}', body: '' },
    { id: 'email-followup', name: 'Follow-Up', description: 'Check in with contacted leads', subject: 'Still Looking? Here\'s What\'s New', body: '' },
    { id: 'email-market', name: 'Market Update', description: 'Share local market insights', subject: 'Your Monthly Market Update', body: '' },
  ],
  sms: [
    { id: 'sms-intro', name: 'Introduction', description: 'First contact text message', body: 'Hi {{firstName}}, this is {{agentName}}. I saw you were interested in properties in the area. Would you like to chat about what you\'re looking for?' },
    { id: 'sms-listing', name: 'New Listing', description: 'Alert about a new property', body: 'Hi {{firstName}}! A new property just hit the market that matches your criteria. Want me to send you the details?' },
    { id: 'sms-openhouse', name: 'Open House Invite', description: 'Invite to an open house event', body: 'Hi {{firstName}}, you\'re invited to an open house this weekend at {{propertyAddress}}. Would you like to attend?' },
    { id: 'sms-checkin', name: 'Check-In', description: 'Follow up with existing leads', body: 'Hi {{firstName}}, just checking in! Are you still looking for a home? I have some great new options to share.' },
  ],
}

// Step definitions for the wizard
const wizardSteps = [
  { num: 1, label: 'Type', icon: Mail },
  { num: 2, label: 'Details', icon: FileText },
  { num: 3, label: 'Content', icon: MessageSquare },
  { num: 4, label: 'Audience', icon: Target },
  { num: 5, label: 'Schedule', icon: Calendar },
  { num: 6, label: 'Review', icon: Eye },
]

function CampaignCreate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [selectedType, setSelectedType] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  
  // Auto-select type from URL query param (e.g., /campaigns/create?type=email)
  // Also pre-populate from template if templateId is provided
  const typeParam = searchParams.get('type')
  const templateId = searchParams.get('templateId')
  const templateName = searchParams.get('templateName')
  const templateSubject = searchParams.get('templateSubject')
  
  useEffect(() => {
    let cancelled = false
    if (typeParam) {
      const matchedType = campaignTypes.find(t => t.type === typeParam.toLowerCase())
      if (matchedType && !matchedType.comingSoon) {
        setSelectedType(typeParam.toLowerCase())
        setStep(2)
      }
    }
    // Pre-populate form from template params (from EmailTemplatesLibrary "Use" button)
    if (templateId) {
      setFormData(prev => ({
        ...prev,
        name: templateName ? `Campaign - ${templateName}` : prev.name,
        subject: templateSubject || prev.subject,
      }))
      // Load template body from API
      templatesApi.getEmailTemplate(templateId).then((res: EmailTemplateResponse) => {
        if (cancelled) return
        const body = res?.body || res?.data?.body || ''
        if (body) {
          setFormData(prev => ({ ...prev, content: body }))
        }
      }).catch(() => {
        if (!cancelled) {
          toast.warning('Could not load template content — you can type manually')
        }
      })
    }
    return () => { cancelled = true }
  }, [typeParam, templateId, templateName, templateSubject, toast])
  
  // Preview modal state
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<CampaignPreviewData | null>(null)
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  
  // AI Message Enhancer state
  const [showEnhancer, setShowEnhancer] = useState(false)
  
  // SMS phone preview state
  const [showSmsPreview, setShowSmsPreview] = useState(false)
  
  // Token inserter for subject line field
  const [showSubjectTokens, setShowSubjectTokens] = useState(false)
  const [showSmsTokens, setShowSmsTokens] = useState(false)
  
  const insertTokenIntoField = (token: string, field: 'subject' | 'content') => {
    updateFormData({ [field]: formData[field] + token })
    if (field === 'subject') setShowSubjectTokens(false)
    if (field === 'content') setShowSmsTokens(false)
  }
  
  // AI Content Generator state
  const [showContentGenerator, setShowContentGenerator] = useState(false)
  
  // Fetch leads counts for audience selection
  const { data: leadsData } = useQuery({
    queryKey: ['leads-count'],
    queryFn: async () => {
      const [allRes, newRes, contactedRes, qualifiedRes] = await Promise.allSettled([
        leadsApi.getLeads({ page: 1, limit: 1 }),
        leadsApi.getLeads({ page: 1, limit: 1, status: 'new' }),
        leadsApi.getLeads({ page: 1, limit: 1, status: 'contacted' }),
        leadsApi.getLeads({ page: 1, limit: 1, status: 'qualified' }),
      ])
      return {
        total: allRes.status === 'fulfilled' ? (allRes.value.data?.pagination?.total || 0) : 0,
        new: newRes.status === 'fulfilled' ? (newRes.value.data?.pagination?.total || 0) : 0,
        contacted: contactedRes.status === 'fulfilled' ? (contactedRes.value.data?.pagination?.total || 0) : 0,
        qualified: qualifiedRes.status === 'fulfilled' ? (qualifiedRes.value.data?.pagination?.total || 0) : 0,
      }
    },
  })

  const totalLeads = leadsData?.total || 0
  const newLeads = leadsData?.new || 0
  const warmLeads = (leadsData?.contacted || 0) + (leadsData?.qualified || 0)
  const hotLeads = leadsData?.qualified || 0
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: '',
    previewText: '',
    content: '',
    audience: 'all' as 'all' | 'new' | 'warm' | 'hot' | 'custom',
    customAudience: [] as string[],
    schedule: 'immediate' as 'immediate' | 'scheduled',
    scheduleDate: '',
    scheduleTime: '',
    budget: '',
    enableABTest: false,
    abTestVariant: '',
    abTestWinnerMetric: 'open_rate' as 'open_rate' | 'click_rate',
    abTestEvalHours: 24,
    // Recurring campaign fields
    isRecurring: false,
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    daysOfWeek: [] as number[],
    dayOfMonth: 1,
    recurringEndType: 'never' as 'never' | 'date' | 'count',
    recurringEndDate: '',
    maxOccurrences: 10,
    // Advanced audience filters
    audienceFilters: [] as Array<{ field: string; operator: string; value: string | number | string[] }>,
    // Email attachments
    attachments: [] as Array<{ filename: string; path: string; url: string; size: number; type: string }>,
    // MMS media URL
    mediaUrl: '',
    // Send-time optimization
    sendTimeOptimization: 'none' as 'none' | 'timezone' | 'engagement' | 'both',
  })
  const [campaignErrors, setCampaignErrors] = useState<Record<string, string>>({})
  
  // Track filtered lead count
  const [filteredLeadCount, setFilteredLeadCount] = useState(totalLeads)

  // Fetch segments for audience picker
  const { data: segmentsData } = useQuery({
    queryKey: ['segments'],
    queryFn: async () => {
      const response = await segmentsApi.getSegments()
      return response.data || response.segments || []
    },
  })
  const savedSegments = (segmentsData || []).map((s: Record<string, unknown>) => ({
    id: s.id,
    name: s.name,
    filters: ((s.rules as Array<Record<string, unknown>>) || []).map((r) => ({ field: r.field, operator: r.operator, value: r.value })),
    leadCount: (s.memberCount as number) || 0,
  }))

  // Fetch filtered lead count when filters change
  useEffect(() => {
    const fetchFilteredCount = async () => {
      if (formData.audience === 'custom' && formData.audienceFilters.length > 0) {
        try {
          const response = await leadsApi.countFiltered(formData.audienceFilters)
          setFilteredLeadCount(response.data.count)
        } catch (error) {
          logger.error('Failed to fetch filtered lead count:', error)
          setFilteredLeadCount(0)
        }
      } else {
        // Reset to appropriate count based on audience type
        switch (formData.audience) {
          case 'all':
            setFilteredLeadCount(totalLeads)
            break
          case 'new':
            setFilteredLeadCount(newLeads)
            break
          case 'warm':
            setFilteredLeadCount(warmLeads)
            break
          case 'hot':
            setFilteredLeadCount(hotLeads)
            break
          default:
            setFilteredLeadCount(totalLeads)
        }
      }
    }

    fetchFilteredCount()
  }, [formData.audience, formData.audienceFilters, totalLeads, newLeads, warmLeads, hotLeads])

  const handleTypeSelect = (type: string) => {
    const typeConfig = campaignTypes.find(t => t.type === type)
    if (typeConfig?.comingSoon) return
    setSelectedType(type)
    setStep(2)
  }

  const handleQuickStart = (type: string, template: { id: string; name: string; description: string; subject?: string; body: string }) => {
    const typeConfig = campaignTypes.find(t => t.type === type)
    if (typeConfig?.comingSoon) return
    setSelectedType(type)
    setFormData(prev => ({
      ...prev,
      name: template.name,
      subject: template.subject || '',
      content: template.body || '',
    }))
    setStep(2)
  }

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  // Build the campaign data payload (shared between create & save-as-draft)
  const buildCampaignPayload = (statusOverride?: string): CreateCampaignData => {
    return {
      name: formData.name,
      type: selectedType.toUpperCase() as 'EMAIL' | 'SMS' | 'PHONE' | 'SOCIAL',
      status: (statusOverride || 'DRAFT') as 'DRAFT' | 'SCHEDULED' | 'ACTIVE',
      subject: formData.subject || undefined,
      body: formData.content || undefined,
      previewText: formData.previewText || formData.description || undefined,
      startDate: formData.schedule === 'scheduled' && formData.scheduleDate 
        ? `${formData.scheduleDate}T${formData.scheduleTime || '00:00'}:00Z` 
        : undefined,
      audience: formData.audience === 'custom' 
        ? formData.customAudience.length 
        : formData.audience === 'all' 
        ? totalLeads 
        : formData.audience === 'new'
        ? newLeads
        : formData.audience === 'warm'
        ? warmLeads
        : hotLeads,
      budget: formData.budget ? parseFloat(formData.budget) : undefined,
      isABTest: formData.enableABTest,
      abTestData: formData.enableABTest && formData.abTestVariant 
        ? { variantSubject: formData.abTestVariant } 
        : undefined,
      abTestWinnerMetric: formData.enableABTest ? formData.abTestWinnerMetric : undefined,
      abTestEvalHours: formData.enableABTest ? formData.abTestEvalHours : undefined,
      // Recurring campaign fields
      isRecurring: formData.isRecurring,
      frequency: formData.isRecurring ? formData.frequency : undefined,
      recurringPattern: formData.isRecurring ? {
        ...(formData.frequency === 'weekly' && formData.daysOfWeek.length > 0 && {
          daysOfWeek: formData.daysOfWeek
        }),
        ...(formData.frequency === 'monthly' && {
          dayOfMonth: formData.dayOfMonth
        }),
        time: formData.scheduleTime || '09:00'
      } : undefined,
      endDate: formData.isRecurring && formData.recurringEndType === 'date' && formData.recurringEndDate
        ? new Date(formData.recurringEndDate).toISOString()
        : undefined,
      maxOccurrences: formData.isRecurring && formData.recurringEndType === 'count'
        ? formData.maxOccurrences
        : undefined,
      // Email attachments
      ...(formData.attachments.length > 0 ? {
        attachments: formData.attachments.map(a => ({ filename: a.filename, path: a.path, size: a.size, type: a.type }))
      } : {}),
      // MMS media URL
      ...(formData.mediaUrl.trim() ? { mediaUrl: formData.mediaUrl.trim() } : {}),
      // Send-time optimization
      ...(formData.sendTimeOptimization !== 'none' ? { sendTimeOptimization: formData.sendTimeOptimization } : {}),
    }
  }

  // Save as Draft — creates the campaign and navigates to campaigns list
  const handleSaveAsDraft = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a campaign name')
      return
    }
    
    try {
      setIsCreating(true)
      const campaignData = buildCampaignPayload('DRAFT')
      await campaignsApi.createCampaign(campaignData)
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success(`Draft campaign "${formData.name}" saved`)
      navigate('/campaigns')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to save draft')
    } finally {
      setIsCreating(false)
    }
  }

  const validateCampaignForm = (): Record<string, string> => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = 'Campaign name is required'
    const typeConfig = campaignTypes.find(t => t.type === selectedType)
    if (typeConfig?.comingSoon) {
      newErrors.type = `${typeConfig.title} is not yet available`
    }
    if (selectedType === 'email' && !formData.subject?.trim()) {
      newErrors.subject = 'Email subject is required'
    }
    if ((selectedType === 'email' || selectedType === 'sms') && !formData.content?.trim()) {
      newErrors.content = `${selectedType === 'email' ? 'Email body' : 'SMS message'} is required`
    }
    if (selectedType === 'sms' && formData.content.length > 294) {
      newErrors.content = 'SMS message exceeds maximum length (294 characters + TCPA footer)'
    }
    if (formData.schedule === 'scheduled' && formData.scheduleDate) {
      const scheduleDateTime = new Date(`${formData.scheduleDate}T${formData.scheduleTime || '00:00'}:00`)
      if (scheduleDateTime <= new Date()) {
        newErrors.scheduleDate = 'Schedule date must be in the future'
      }
    }
    if (formData.budget && (isNaN(Number(formData.budget)) || Number(formData.budget) <= 0)) {
      newErrors.budget = 'Budget must be a valid number greater than 0'
    }
    if (formData.budget && Number(formData.budget) > 1000000) {
      newErrors.budget = 'Budget cannot exceed $1,000,000'
    }
    if (formData.isRecurring && formData.frequency === 'weekly' && formData.daysOfWeek.length === 0) {
      newErrors.daysOfWeek = 'Select at least one day for weekly recurring campaigns'
    }
    if (formData.isRecurring && formData.recurringEndType === 'date' && formData.recurringEndDate && formData.scheduleDate) {
      if (new Date(formData.recurringEndDate) <= new Date(formData.scheduleDate)) {
        newErrors.recurringEndDate = 'End date must be after the start date'
      }
    }
    if (formData.enableABTest && !formData.abTestVariant?.trim()) {
      newErrors.abTestVariant = 'A/B test variant subject is required'
    }
    return newErrors
  }

  /** Validate only the fields relevant to the current step. Returns true if ok. */
  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {}
    if (currentStep === 2) {
      if (!formData.name.trim()) newErrors.name = 'Campaign name is required'
      if (selectedType === 'email' && !formData.subject?.trim()) newErrors.subject = 'Email subject is required'
    }
    if (currentStep === 3) {
      if ((selectedType === 'email' || selectedType === 'sms') && !formData.content?.trim()) {
        newErrors.content = `${selectedType === 'email' ? 'Email body' : 'SMS message'} is required`
      }
      if (selectedType === 'sms' && formData.content.length > 294) {
        newErrors.content = 'SMS message exceeds maximum length (294 characters + TCPA footer)'
      }
      if (formData.enableABTest && !formData.abTestVariant?.trim()) {
        newErrors.abTestVariant = 'A/B test variant subject is required'
      }
    }
    if (currentStep === 5) {
      if (formData.schedule === 'scheduled' && formData.scheduleDate) {
        const scheduleDateTime = new Date(`${formData.scheduleDate}T${formData.scheduleTime || '00:00'}:00`)
        if (scheduleDateTime <= new Date()) newErrors.scheduleDate = 'Schedule date must be in the future'
      }
      if (formData.budget && (isNaN(Number(formData.budget)) || Number(formData.budget) <= 0)) {
        newErrors.budget = 'Budget must be a valid number greater than 0'
      }
      if (formData.isRecurring && formData.frequency === 'weekly' && formData.daysOfWeek.length === 0) {
        newErrors.daysOfWeek = 'Select at least one day for weekly recurring campaigns'
      }
    }

    setCampaignErrors(prev => {
      // Merge: keep errors from other steps, replace errors for this step
      const merged = { ...prev, ...newErrors }
      // Remove keys that were valid this pass
      Object.keys(prev).forEach(k => { if (!(k in newErrors)) delete merged[k] })
      return merged
    })

    if (Object.keys(newErrors).length > 0) {
      toast.error('Please fix the errors before continuing')
      return false
    }
    return true
  }

  const handleCreate = async () => {
    const newErrors = validateCampaignForm()
    setCampaignErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      toast.error('Please fix the validation errors')
      return
    }
    
    if (step < 6) {
      setStep(6)
      return
    }
    
    try {
      setIsCreating(true)
      const campaignData = buildCampaignPayload('DRAFT')
      
      // Create campaign as DRAFT
      const response = await campaignsApi.createCampaign(campaignData)
      const campaignId = response.data?.campaign?.id
      
      if (!campaignId) {
        throw new Error('Failed to create campaign')
      }
      
      setCreatedCampaignId(campaignId)
      
      // Fetch preview data
      const previewResponse = await campaignsApi.previewCampaign(campaignId)
      setPreviewData(previewResponse.data)
      
      // Show preview modal
      setShowPreview(true)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to create campaign preview')
    } finally {
      setIsCreating(false)
    }
  }
  
  const handleConfirmSend = async () => {
    if (!createdCampaignId) return
    
    try {
      setIsSending(true)
      
      // Update campaign status to SCHEDULED or ACTIVE
      const finalStatus = formData.schedule === 'scheduled' ? 'SCHEDULED' : 'ACTIVE'
      await campaignsApi.updateCampaign(createdCampaignId, {
        status: finalStatus
      })
      
      // If immediate send, trigger the send
      if (formData.schedule === 'immediate') {
        const sendResult = await campaignsApi.sendCampaign(createdCampaignId)
        // Handle large campaign confirmation
        if (sendResult?.requiresConfirmation) {
          const confirmed = window.confirm(sendResult.message)
          if (confirmed) {
            await campaignsApi.sendCampaign(createdCampaignId, { confirmLargeSend: true })
          } else {
            toast.info('Campaign saved as draft. You can send it later.')
            navigate('/campaigns')
            return
          }
        }
      }
      
      // Success!
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success(`Campaign "${formData.name}" ${formData.schedule === 'immediate' ? 'sent' : 'scheduled'} successfully!`)
      navigate('/campaigns')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to send campaign')
    } finally {
      setIsSending(false)
      setShowPreview(false)
    }
  }
  
  const handleCancelPreview = async () => {
    // Delete the draft campaign
    if (createdCampaignId) {
      try {
        await campaignsApi.deleteCampaign(createdCampaignId)
      } catch (error) {
        logger.error('Failed to delete draft campaign:', error)
      }
    }
    
    setShowPreview(false)
    setCreatedCampaignId(null)
    setPreviewData(null)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create New Campaign</h1>
          <p className="mt-2 text-muted-foreground">
            {selectedType 
              ? `Creating ${campaignTypes.find(t => t.type === selectedType)?.title || 'campaign'}`
              : 'Choose a campaign type to get started'}
          </p>
        </div>
        {step >= 2 && (
          <Button variant="outline" onClick={handleSaveAsDraft} disabled={isCreating || !formData.name.trim()}>
            <Save className="mr-2 h-4 w-4" />
            Save as Draft
          </Button>
        )}
      </div>

      {/* Progress Steps — clickable, responsive */}
      <div className="flex items-center justify-between">
        {wizardSteps.map((ws, idx) => {
          const canNavigate = ws.num === 1 
            || (ws.num === 2 && !!selectedType)
            || (ws.num >= 3 && !!selectedType && !!formData.name && !(selectedType === 'email' && !formData.subject))
          return (
            <div key={ws.num} className="flex items-center flex-1 last:flex-none">
              <button
                className={`flex flex-col items-center gap-1 min-w-0 ${canNavigate ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
                onClick={() => canNavigate && setStep(ws.num)}
                disabled={!canNavigate}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors text-sm font-medium ${
                  step > ws.num 
                    ? 'bg-primary text-primary-foreground' 
                    : step === ws.num 
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {step > ws.num ? <Check className="h-4 w-4" /> : ws.num}
                </div>
                <span className={`text-xs truncate max-w-[60px] ${step >= ws.num ? 'font-medium' : 'text-muted-foreground'}`}>
                  {ws.label}
                </span>
              </button>
              {idx < wizardSteps.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 mt-[-18px] transition-colors ${step > ws.num ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step 1: Choose Type */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {campaignTypes.map((type) => (
              <Card
                key={type.type}
                className={`transition-shadow ${
                  type.comingSoon 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'cursor-pointer hover:shadow-lg'
                }`}
                onClick={() => !type.comingSoon && handleTypeSelect(type.type)}
                title={type.comingSoon ? `${type.title} is coming soon` : undefined}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                      type.comingSoon ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                    }`}>
                      <type.icon className="h-6 w-6" />
                    </div>
                    {type.comingSoon && (
                      <Badge variant="warning">Coming Soon</Badge>
                    )}
                  </div>
                  <CardTitle className="mt-4">{type.title}</CardTitle>
                  <CardDescription>{type.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Quick-Start Templates */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Quick Start with a Template</CardTitle>
              </div>
              <CardDescription>
                Choose a pre-built template to get started faster
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Email Templates */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Email Templates</span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {quickStartTemplates.email.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => handleQuickStart('email', tpl)}
                        className="flex items-start gap-3 rounded-lg border p-3 text-left hover:bg-muted/50 hover:border-primary/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{tpl.name}</div>
                          <div className="text-xs text-muted-foreground">{tpl.description}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
                {/* SMS Templates */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">SMS Templates</span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {quickStartTemplates.sms.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => handleQuickStart('sms', tpl)}
                        className="flex items-start gap-3 rounded-lg border p-3 text-left hover:bg-muted/50 hover:border-primary/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{tpl.name}</div>
                          <div className="text-xs text-muted-foreground">{tpl.description}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Basic Details */}
      {step === 2 && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
            <CardDescription>
              Enter the basic information for your campaign
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Campaign Name
              </label>
              <Input
                id="name"
                placeholder="e.g., Summer Product Launch"
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
                required
                aria-required="true"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="description"
                className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Describe your campaign..."
                value={formData.description}
                onChange={(e) => updateFormData({ description: e.target.value })}
              />
            </div>

            {selectedType === 'email' && (
              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium">
                  Email Subject *
                </label>
                <Input
                  id="subject"
                  placeholder="e.g., Exclusive Summer Offer - 50% Off!"
                  value={formData.subject}
                  onChange={(e) => { updateFormData({ subject: e.target.value }); if (campaignErrors.subject) setCampaignErrors(prev => { const next = {...prev}; delete next.subject; return next }) }}
                />
                {campaignErrors.subject && <p className="text-sm text-destructive mt-1" role="alert">⚠ {campaignErrors.subject}</p>}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => validateStep(2) && setStep(3)} disabled={!formData.name}>
                Next: Content
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Campaign Content */}
      {step === 3 && (
        <div className="space-y-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <CardTitle>Campaign Content</CardTitle>
              </div>
              <CardDescription>
                Create the message for your {selectedType} campaign
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedType === 'email' && (
                <>
                  {/* Subject line editable in step 3 too */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Email Subject *</label>
                      <div className="relative">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowSubjectTokens(!showSubjectTokens)}
                          className="gap-1 text-xs h-7"
                        >
                          <AtSign className="h-3 w-3" />
                          Personalize
                        </Button>
                        {showSubjectTokens && (
                          <div className="absolute right-0 top-full mt-1 z-10 w-52 rounded-md border bg-popover p-1 shadow-md">
                            {personalizationTokens.map((t) => (
                              <button
                                key={t.token}
                                onClick={() => insertTokenIntoField(t.token, 'subject')}
                                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted transition-colors"
                              >
                                <code className="text-primary">{t.token}</code>
                                <span className="text-muted-foreground">{t.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <Input
                      placeholder="e.g., Exclusive Summer Offer - 50% Off!"
                      value={formData.subject}
                      onChange={(e) => { updateFormData({ subject: e.target.value }); if (campaignErrors.subject) setCampaignErrors(prev => { const next = {...prev}; delete next.subject; return next }) }}
                      required
                      aria-required="true"
                    />
                    <div className="flex items-center justify-between">
                      {campaignErrors.subject && <p className="text-sm text-destructive" role="alert">⚠ {campaignErrors.subject}</p>}
                      <p className={`text-xs ml-auto ${formData.subject.length > 60 ? 'text-warning' : 'text-muted-foreground'}`}>
                        {formData.subject.length}/60 chars {formData.subject.length > 60 && '— shorter subjects get higher open rates'}
                      </p>
                    </div>
                  </div>

                  {/* Preview Text — the snippet shown in inbox */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Preview Text <span className="text-muted-foreground font-normal">(the snippet shown next to the subject in inboxes)</span></label>
                    <Input
                      placeholder="e.g., Check out our latest properties in your area..."
                      value={formData.previewText}
                      onChange={(e) => updateFormData({ previewText: e.target.value })}
                      maxLength={150}
                    />
                    <p className="text-xs text-muted-foreground">{formData.previewText.length}/150 — appears after the subject line in most email clients</p>
                  </div>

                  {/* Inbox Preview */}
                  {(formData.subject || formData.previewText) && (
                    <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Eye className="h-3 w-3" />
                        Inbox Preview
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {formData.name?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm truncate">{formData.subject || 'No subject'}</div>
                          <div className="text-xs text-muted-foreground truncate">{formData.previewText || formData.description || 'No preview text'}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Email Body</label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowContentGenerator(true)}
                          className="gap-2"
                        >
                          <Sparkles className="h-4 w-4" />
                          Generate with AI
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowEnhancer(true)}
                          disabled={!formData.content.trim()}
                          className="gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Enhance
                        </Button>
                      </div>
                    </div>
                    <EmailBlockEditor
                      value={formData.content}
                      onChange={(value) => updateFormData({ content: value })}
                      placeholder="Click a block type to start building your email"
                      minHeight="350px"
                      showTemplates={true}
                    />
                    {campaignErrors.content && <p className="text-sm text-destructive" role="alert">⚠ {campaignErrors.content}</p>}
                  </div>
                  {/* Attachments */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Attachments <span className="text-muted-foreground font-normal">(optional, max 5 files, 10MB each)</span></label>
                    <div className="flex flex-wrap gap-2">
                      {formData.attachments.map((att, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-1.5 text-sm">
                          <span className="truncate max-w-[200px]">{att.filename}</span>
                          <span className="text-xs text-muted-foreground">({(att.size / 1024).toFixed(0)} KB)</span>
                          <button
                            type="button"
                            onClick={() => updateFormData({ attachments: formData.attachments.filter((_, i) => i !== idx) })}
                            className="text-destructive hover:text-destructive/80"
                          >×</button>
                        </div>
                      ))}
                    </div>
                    {formData.attachments.length < 5 && (
                      <label className="inline-flex items-center gap-2 px-3 py-1.5 border border-dashed rounded-md text-sm text-muted-foreground hover:border-primary hover:text-primary cursor-pointer transition-colors">
                        <span>+ Add file</span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.webp,.gif"
                          multiple
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || [])
                            if (files.length === 0) return
                            const maxAllowed = 5 - formData.attachments.length
                            const toUpload = files.slice(0, maxAllowed)
                            try {
                              const result = await campaignsApi.uploadAttachments(toUpload)
                              updateFormData({ attachments: [...formData.attachments, ...result.attachments] })
                            } catch (err) {
                              toast.error('Could not upload attachments')
                            }
                            e.target.value = ''
                          }}
                        />
                      </label>
                    )}
                  </div>
                </>
              )}
              
              {selectedType === 'sms' && (
                <div className="space-y-4">
                  {/* SMS Message Editor + Phone Preview side by side */}
                  <div className="grid gap-4 lg:grid-cols-2">
                    {/* Left: Editor */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">SMS Message *</label>
                        <div className="flex gap-2">
                          <div className="relative">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowSmsTokens(!showSmsTokens)}
                              className="gap-1 text-xs h-7"
                            >
                              <AtSign className="h-3 w-3" />
                              Personalize
                            </Button>
                            {showSmsTokens && (
                              <div className="absolute right-0 top-full mt-1 z-10 w-52 rounded-md border bg-popover p-1 shadow-md">
                                {personalizationTokens.map((t) => (
                                  <button
                                    key={t.token}
                                    onClick={() => insertTokenIntoField(t.token, 'content')}
                                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted transition-colors"
                                  >
                                    <code className="text-primary">{t.token}</code>
                                    <span className="text-muted-foreground">{t.label}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowContentGenerator(true)}
                            className="gap-2"
                          >
                            <Sparkles className="h-4 w-4" />
                            Generate with AI
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowEnhancer(true)}
                            disabled={!formData.content.trim()}
                            className="gap-2"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Enhance
                          </Button>
                        </div>
                      </div>
                      <textarea
                        className="min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="Enter your SMS message... Use the Personalize button to add recipient names, property details, etc."
                        maxLength={294}
                        value={formData.content}
                        onChange={(e) => { updateFormData({ content: e.target.value }); if (campaignErrors.content) setCampaignErrors(prev => { const next = {...prev}; delete next.content; return next }) }}
                      />
                      {campaignErrors.content && <p className="text-sm text-destructive" role="alert">⚠ {campaignErrors.content}</p>}
                      
                      {/* Character count + segment info */}
                      <div className="flex justify-between text-xs" aria-live="polite">
                        <span className={`${formData.content.length > 250 ? 'text-warning font-medium' : 'text-muted-foreground'}`}>
                          {formData.content.length}/294 characters (26 reserved for TCPA footer)
                        </span>
                        <span className="text-muted-foreground">
                          {(() => { const totalLen = formData.content.length + 26; return totalLen <= 160 ? 1 : Math.ceil(totalLen / 153); })()} segment{(() => { const totalLen = formData.content.length + 26; return (totalLen <= 160 ? 1 : Math.ceil(totalLen / 153)) !== 1 ? 's' : ''; })()}
                        </span>
                      </div>

                      {/* Estimated cost */}
                      <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <DollarSign className="h-3 w-3" />
                          Estimated Cost
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div>
                            <div className="text-muted-foreground">Per message</div>
                            <div className="font-medium">
                              ~${(((() => { const totalLen = formData.content.length + 26; return totalLen <= 160 ? 1 : Math.ceil(totalLen / 153); })()) * (formData.mediaUrl ? 0.02 : 0.0079)).toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Recipients</div>
                            <div className="font-medium">{filteredLeadCount.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Total est.</div>
                            <div className="font-semibold text-primary">
                              ~${(filteredLeadCount * ((() => { const totalLen = formData.content.length + 26; return totalLen <= 160 ? 1 : Math.ceil(totalLen / 153); })()) * (formData.mediaUrl ? 0.02 : 0.0079)).toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Carrier rates may vary. MMS messages cost more than SMS.</p>
                      </div>
                    </div>

                    {/* Right: Phone Preview */}
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-2 mb-2">
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Message Preview</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowSmsPreview(!showSmsPreview)}
                          className="gap-1 text-xs h-6"
                        >
                          <Eye className="h-3 w-3" />
                          {showSmsPreview ? 'Hide' : 'Show'}
                        </Button>
                      </div>
                      {showSmsPreview && (
                        <div className="w-[280px] rounded-[2rem] border-4 border-gray-800 dark:border-gray-300 bg-gray-100 dark:bg-gray-900 p-1 shadow-lg">
                          {/* Phone status bar */}
                          <div className="flex items-center justify-between px-4 py-1 text-[10px] font-medium text-muted-foreground">
                            <span>9:41</span>
                            <div className="w-20 h-5 bg-gray-800 dark:bg-gray-300 rounded-full" />
                            <span>5G</span>
                          </div>
                          {/* Chat header */}
                          <div className="bg-muted px-3 py-2 text-center">
                            <div className="text-xs font-semibold">Your Business</div>
                            <div className="text-[10px] text-muted-foreground">SMS</div>
                          </div>
                          {/* Message area */}
                          <div className="bg-card min-h-[260px] p-3 space-y-2">
                            {formData.content ? (
                              <>
                                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-xs leading-relaxed">
                                  {formData.content.replace(/\{\{(\w+)\}\}/g, (_, key) => {
                                    const samples: Record<string, string> = { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah@email.com', phone: '(555) 123-4567', propertyAddress: '123 Oak St', propertyType: 'Single Family', agentName: 'Mike', companyName: 'RE/MAX' }
                                    return samples[key] || `{{${key}}}`
                                  })}
                                </div>
                                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-3 py-1.5 text-[10px] text-muted-foreground italic">
                                  Reply STOP to opt out.
                                </div>
                                {formData.mediaUrl && /^https?:\/\/.+/.test(formData.mediaUrl) && (
                                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm overflow-hidden border">
                                    <img
                                      src={formData.mediaUrl}
                                      alt="MMS attachment"
                                      className="max-w-full h-auto"
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                    />
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="flex items-center justify-center h-full text-xs text-muted-foreground pt-20">
                                Type a message to see the preview
                              </div>
                            )}
                          </div>
                          {/* Input bar */}
                          <div className="bg-muted px-3 py-2 rounded-b-[1.5rem]">
                            <div className="bg-card rounded-full px-3 py-1.5 text-[10px] text-muted-foreground">
                              iMessage
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* TCPA Compliance */}
                  <div className="rounded-md bg-warning/10 dark:bg-warning/10 border border-warning/30 dark:border-warning/30 p-3 text-xs text-foreground dark:text-foreground">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium mb-1">TCPA Compliance</p>
                        <p>&quot;Reply STOP to opt out.&quot; will be automatically appended to every SMS sent. Recipients who reply STOP will be automatically unsubscribed.</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* MMS Media URL */}
                  <div className="space-y-1 pt-2">
                    <label className="text-sm font-medium">MMS Media URL <span className="text-muted-foreground font-normal">(optional — converts to MMS)</span></label>
                    <input
                      type="url"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="https://example.com/image.jpg"
                      value={formData.mediaUrl}
                      onChange={(e) => updateFormData({ mediaUrl: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Add an image, GIF, or video URL to send as MMS. Supported: JPEG, PNG, GIF (up to 5MB). Must be publicly accessible.
                    </p>
                  </div>
                </div>
              )}

              {selectedType === 'phone' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Call Script <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowContentGenerator(true)}
                        className="gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        Generate with AI
                      </Button>
                    </div>
                  </div>
                  <textarea
                    className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Enter your call script — or leave blank and configure later..."
                    value={formData.content}
                    onChange={(e) => updateFormData({ content: e.target.value })}
                  />
                </div>
              )}

              {selectedType === 'social' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Post Content <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowContentGenerator(true)}
                        className="gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        Generate with AI
                      </Button>
                    </div>
                  </div>
                  <textarea
                    className="min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Enter your social media post..."
                    maxLength={280}
                    value={formData.content}
                    onChange={(e) => updateFormData({ content: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.content.length}/280 characters
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 3 Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back: Details
            </Button>
            <Button onClick={() => validateStep(3) && setStep(4)}>
              Next: Audience
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Target Audience */}
      {step === 4 && (
        <div className="space-y-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle>Target Audience</CardTitle>
              </div>
              <CardDescription>
                Select who will receive this campaign
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <label className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="audience"
                    value="all"
                    checked={formData.audience === 'all'}
                    onChange={(e) => updateFormData({ audience: e.target.value as 'all' | 'new' | 'warm' | 'hot' | 'custom' })}
                    className="h-4 w-4"
                  />
                  <div className="flex-1">
                    <div className="font-medium">All Leads</div>
                    <div className="text-sm text-muted-foreground">
                      Send to all {totalLeads} leads in your database
                    </div>
                  </div>
                  <Badge>{totalLeads} leads</Badge>
                </label>

                <label className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="audience"
                    value="new"
                    checked={formData.audience === 'new'}
                    onChange={(e) => updateFormData({ audience: e.target.value as 'all' | 'new' | 'warm' | 'hot' | 'custom' })}
                    className="h-4 w-4"
                  />
                  <div className="flex-1">
                    <div className="font-medium">New Leads</div>
                    <div className="text-sm text-muted-foreground">
                      Target only new, uncontacted leads
                    </div>
                  </div>
                  <Badge>{newLeads} leads</Badge>
                </label>

                <label className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="audience"
                    value="warm"
                    checked={formData.audience === 'warm'}
                    onChange={(e) => updateFormData({ audience: e.target.value as 'all' | 'new' | 'warm' | 'hot' | 'custom' })}
                    className="h-4 w-4"
                  />
                  <div className="flex-1">
                    <div className="font-medium">Warm Leads</div>
                    <div className="text-sm text-muted-foreground">
                      Contacted and qualified leads
                    </div>
                  </div>
                  <Badge>{warmLeads} leads</Badge>
                </label>

                <label className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="audience"
                    value="hot"
                    checked={formData.audience === 'hot'}
                    onChange={(e) => updateFormData({ audience: e.target.value as 'all' | 'new' | 'warm' | 'hot' | 'custom' })}
                    className="h-4 w-4"
                  />
                  <div className="flex-1">
                    <div className="font-medium">Hot Leads</div>
                    <div className="text-sm text-muted-foreground">
                      Highly qualified, ready to convert
                    </div>
                  </div>
                  <Badge>{hotLeads} leads</Badge>
                </label>

                <label className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="audience"
                    value="custom"
                    checked={formData.audience === 'custom'}
                    onChange={(e) => updateFormData({ audience: e.target.value as 'all' | 'new' | 'warm' | 'hot' | 'custom' })}
                    className="h-4 w-4"
                  />
                  <div className="flex-1">
                    <div className="font-medium">Custom Audience</div>
                    <div className="text-sm text-muted-foreground">
                      Use advanced filters to target specific leads
                    </div>
                  </div>
                  <Badge variant="outline">
                    {formData.audienceFilters.length > 0 ? `${formData.audienceFilters.length} filters` : 'No filters'}
                  </Badge>
                </label>
              </div>

              {/* Advanced Filters */}
              {formData.audience === 'custom' && (
                <div className="pt-4 border-t">
                  <div className="mb-3">
                    <div className="font-medium mb-1">Advanced Filters</div>
                    <div className="text-sm text-muted-foreground">
                      Combine multiple criteria to precisely target your audience
                    </div>
                  </div>
                  <AdvancedAudienceFilters
                    filters={formData.audienceFilters}
                    onChange={(filters) => updateFormData({ audienceFilters: filters })}
                    leadCount={filteredLeadCount}
                    savedSegments={savedSegments}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 4 Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(3)}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back: Content
            </Button>
            <Button onClick={() => setStep(5)}>
              Next: Schedule
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Schedule & Budget */}
      {step === 5 && (
        <div className="space-y-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle>Schedule & Budget</CardTitle>
              </div>
              <CardDescription>
                When to send and how much to spend
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="schedule"
                    value="immediate"
                    checked={formData.schedule === 'immediate'}
                    onChange={(e) => updateFormData({ schedule: e.target.value as 'immediate' | 'scheduled' })}
                    className="h-4 w-4"
                  />
                  <div>
                    <div className="font-medium">Send Immediately</div>
                    <div className="text-sm text-muted-foreground">
                      Campaign will start as soon as it's created
                    </div>
                  </div>
                </label>

                <label className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="schedule"
                    value="scheduled"
                    checked={formData.schedule === 'scheduled'}
                    onChange={(e) => updateFormData({ schedule: e.target.value as 'immediate' | 'scheduled' })}
                    className="h-4 w-4"
                  />
                  <div className="flex-1">
                    <div className="font-medium">Schedule for Later</div>
                    <div className="text-sm text-muted-foreground">
                      Choose a specific date and time
                    </div>
                  </div>
                </label>
              </div>

              {formData.schedule === 'scheduled' && (
                <div className="ml-10 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Date</label>
                      <Input
                        type="date"
                        value={formData.scheduleDate}
                        onChange={(e) => { updateFormData({ scheduleDate: e.target.value }); if (campaignErrors.scheduleDate) setCampaignErrors(prev => { const next = {...prev}; delete next.scheduleDate; return next }) }}
                        min={new Date().toISOString().split('T')[0]}
                      />
                      {campaignErrors.scheduleDate && <p className="text-sm text-destructive mt-1" role="alert">⚠ {campaignErrors.scheduleDate}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Time</label>
                      <Input
                        type="time"
                        value={formData.scheduleTime}
                        onChange={(e) => updateFormData({ scheduleTime: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Send-Time Optimization */}
                  {(selectedType === 'email' || selectedType === 'sms') && (
                    <div className="space-y-3 pt-3 border-t">
                      <label className="text-sm font-medium">Send-Time Optimization</label>
                      <p className="text-xs text-muted-foreground">
                        Optimize send times per recipient for better engagement. Messages will be staggered to reach each lead at their optimal time.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 'none', label: 'None', desc: 'Send all at once' },
                          { value: 'timezone', label: 'Timezone', desc: 'Send at 10 AM in each recipient\'s timezone' },
                          { value: 'engagement', label: 'Engagement', desc: 'Send when each recipient typically opens' },
                          { value: 'both', label: 'Combined', desc: 'Best of timezone + engagement data' },
                        ].map(opt => (
                          <label
                            key={opt.value}
                            className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-colors ${
                              formData.sendTimeOptimization === opt.value
                                ? 'border-primary bg-primary/5'
                                : 'border-input hover:border-primary/50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="sendTimeOpt"
                              value={opt.value}
                              checked={formData.sendTimeOptimization === opt.value}
                              onChange={() => updateFormData({ sendTimeOptimization: opt.value as typeof formData.sendTimeOptimization })}
                              className="sr-only"
                            />
                            <span className="text-sm font-medium">{opt.label}</span>
                            <span className="text-xs text-muted-foreground">{opt.desc}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recurring Campaign Options */}
                  <div className="space-y-3 pt-3 border-t">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isRecurring}
                        onChange={(e) => updateFormData({ 
                          isRecurring: e.target.checked,
                          frequency: e.target.checked ? 'weekly' : undefined
                        })}
                        className="h-4 w-4"
                      />
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        <span className="font-medium">Make this a recurring campaign</span>
                      </div>
                    </label>

                    {formData.isRecurring && (
                      <div className="ml-6 space-y-4">
                        {/* Frequency Selection */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Repeat Frequency</label>
                          <select
                            value={formData.frequency}
                            onChange={(e) => updateFormData({ 
                              frequency: e.target.value as 'daily' | 'weekly' | 'monthly',
                              daysOfWeek: e.target.value === 'weekly' ? [1] : [],
                              dayOfMonth: e.target.value === 'monthly' ? 1 : undefined
                            })}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>

                        {/* Days of Week for Weekly */}
                        {formData.frequency === 'weekly' && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Select Days</label>
                            <DaysOfWeekPicker
                              value={formData.daysOfWeek}
                              onChange={(days) => updateFormData({ daysOfWeek: days })}
                            />
                          </div>
                        )}

                        {/* Day of Month for Monthly */}
                        {formData.frequency === 'monthly' && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Day of Month</label>
                            <select
                              value={formData.dayOfMonth}
                              onChange={(e) => updateFormData({ dayOfMonth: parseInt(e.target.value) })}
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                <option key={day} value={day}>
                                  {day === 1 ? '1st' : day === 2 ? '2nd' : day === 3 ? '3rd' : `${day}th`} of every month
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* End Condition */}
                        <div className="space-y-3">
                          <label className="text-sm font-medium">End Condition</label>
                          <div className="space-y-2">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="radio"
                                name="recurringEnd"
                                value="never"
                                checked={formData.recurringEndType === 'never'}
                                onChange={() => updateFormData({ recurringEndType: 'never' })}
                                className="h-4 w-4"
                              />
                              <span className="text-sm">Never end</span>
                            </label>

                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="radio"
                                name="recurringEnd"
                                value="date"
                                checked={formData.recurringEndType === 'date'}
                                onChange={() => updateFormData({ recurringEndType: 'date' })}
                                className="h-4 w-4"
                              />
                              <span className="text-sm">End on date</span>
                            </label>

                            {formData.recurringEndType === 'date' && (
                              <Input
                                type="date"
                                value={formData.recurringEndDate}
                                onChange={(e) => updateFormData({ recurringEndDate: e.target.value })}
                                min={formData.scheduleDate || new Date().toISOString().split('T')[0]}
                                className="ml-6 max-w-xs"
                              />
                            )}

                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="radio"
                                name="recurringEnd"
                                value="count"
                                checked={formData.recurringEndType === 'count'}
                                onChange={() => updateFormData({ recurringEndType: 'count' })}
                                className="h-4 w-4"
                              />
                              <span className="text-sm">After number of occurrences</span>
                            </label>

                            {formData.recurringEndType === 'count' && (
                              <Input
                                type="number"
                                min="1"
                                value={formData.maxOccurrences}
                                onChange={(e) => updateFormData({ maxOccurrences: parseInt(e.target.value) })}
                                placeholder="Number of times to repeat"
                                className="ml-6 max-w-xs"
                              />
                            )}
                          </div>
                        </div>

                        {/* Recurring Summary */}
                        <div className="rounded-lg bg-muted p-3 text-sm">
                          <div className="font-medium mb-1">Recurring Schedule Preview:</div>
                          <div className="text-muted-foreground">
                            {formData.frequency === 'daily' && 'Sends every day'}
                            {formData.frequency === 'weekly' && formData.daysOfWeek.length > 0 && (
                              <>Sends every {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
                                .filter((_, i) => formData.daysOfWeek.includes(i))
                                .join(', ')}</>
                            )}
                            {formData.frequency === 'monthly' && `Sends on day ${formData.dayOfMonth} of every month`}
                            {' at '}{formData.scheduleTime || '9:00 AM'}
                            {formData.recurringEndType === 'never' && ', continues indefinitely'}
                            {formData.recurringEndType === 'date' && ` until ${formData.recurringEndDate}`}
                            {formData.recurringEndType === 'count' && ` for ${formData.maxOccurrences} occurrences`}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-4 border-t">
                <label className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Campaign Budget (Optional)
                </label>
                <Input
                  type="number"
                  placeholder="Enter budget amount"
                  value={formData.budget}
                  onChange={(e) => { updateFormData({ budget: e.target.value }); if (campaignErrors.budget) setCampaignErrors(prev => { const next = {...prev}; delete next.budget; return next }) }}
                />
                {campaignErrors.budget && <p className="text-sm text-destructive mt-1" role="alert">⚠ {campaignErrors.budget}</p>}
                <p className="text-xs text-muted-foreground">
                  Set a budget limit for this campaign
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Step 5 Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(4)}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back: Audience
            </Button>
            <Button onClick={() => validateStep(5) && setStep(6)}>
              Next: Review
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 6: Review & Send */}
      {step === 6 && (
        <div className="space-y-6">
          {/* Campaign Summary */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <CardTitle>Campaign Summary</CardTitle>
              </div>
              <CardDescription>
                Review your campaign settings before sending
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Campaign</div>
                  <div className="font-medium">{formData.name || '—'}</div>
                  <div className="text-sm text-muted-foreground">{campaignTypes.find(t => t.type === selectedType)?.title}</div>
                </div>
                {selectedType === 'email' && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Subject</div>
                    <div className="font-medium">{formData.subject || '—'}</div>
                    {formData.previewText && <div className="text-sm text-muted-foreground">{formData.previewText}</div>}
                  </div>
                )}
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Content</div>
                  <div className="text-sm">
                    {formData.content 
                      ? <span className="text-success dark:text-success flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Content ready ({selectedType === 'sms' ? `${formData.content.length} chars` : 'email body set'})</span>
                      : <span className="text-warning flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> No content added</span>
                    }
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Audience</div>
                  <div className="font-medium capitalize">{formData.audience === 'custom' ? 'Custom Filters' : `${formData.audience} Leads`}</div>
                  <div className="text-sm text-muted-foreground">{filteredLeadCount.toLocaleString()} recipients</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Schedule</div>
                  <div className="font-medium">
                    {formData.schedule === 'immediate' ? 'Send Immediately' : `Scheduled: ${formData.scheduleDate} at ${formData.scheduleTime || '00:00'}`}
                  </div>
                  {formData.isRecurring && <div className="text-sm text-muted-foreground">Recurring: {formData.frequency}</div>}
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Budget</div>
                  <div className="font-medium">{formData.budget ? fmtMoney(Number(formData.budget)) : 'No budget set'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* A/B Testing */}
          {selectedType === 'email' && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle>A/B Testing</CardTitle>
                </div>
                <CardDescription>
                  Test different versions to optimize performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.enableABTest}
                    onChange={(e) => updateFormData({ enableABTest: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                  <div>
                    <div className="font-medium">Enable A/B Testing</div>
                    <div className="text-sm text-muted-foreground">
                      Create a variant to test against the original
                    </div>
                  </div>
                </label>

                {formData.enableABTest && (
                  <div className="ml-7 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Variant Subject Line</label>
                      <Input
                        placeholder="Enter alternative subject line"
                        value={formData.abTestVariant}
                        onChange={(e) => updateFormData({ abTestVariant: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        50% of your audience will receive this variant
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Winner Metric</label>
                      <div className="flex gap-3">
                        {(['open_rate', 'click_rate'] as const).map((metric) => (
                          <label
                            key={metric}
                            className={`flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                              formData.abTestWinnerMetric === metric
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="abTestWinnerMetric"
                              value={metric}
                              checked={formData.abTestWinnerMetric === metric}
                              onChange={() => updateFormData({ abTestWinnerMetric: metric })}
                              className="sr-only"
                            />
                            <div>
                              <div className="font-medium text-sm">
                                {metric === 'open_rate' ? 'Open Rate' : 'Click Rate'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {metric === 'open_rate'
                                  ? 'Best for subject line tests'
                                  : 'Best for content tests'}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Evaluation Period</label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max="168"
                          value={formData.abTestEvalHours}
                          onChange={(e) => updateFormData({ abTestEvalHours: Math.max(1, Math.min(168, parseInt(e.target.value) || 24)) })}
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">hours after send</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        The winning variant will be automatically selected after this period (1-168 hours)
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(5)}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back: Schedule
            </Button>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleSaveAsDraft} 
                disabled={isCreating || !formData.name.trim()}
              >
                <Save className="mr-2 h-4 w-4" />
                Save Draft
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={
                  isCreating || 
                  ((selectedType === 'email' || selectedType === 'sms') && !formData.content)
                }
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <ChevronRight className="mr-2 h-4 w-4" />
                    Preview & Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Campaign Preview Modal */}
      {showPreview && previewData && (
        <CampaignPreviewModal
          isOpen={showPreview}
          onClose={handleCancelPreview}
          onConfirm={handleConfirmSend}
          preview={previewData}
          isLoading={isSending}
        />
      )}
      
      {/* AI Message Enhancer Modal */}
      <MessageEnhancerModal
        isOpen={showEnhancer}
        onClose={() => setShowEnhancer(false)}
        originalText={formData.content}
        onApply={(enhancedText) => updateFormData({ content: enhancedText })}
      />
      
      {/* AI Content Generator Modal */}
      <ContentGeneratorWizard
        isOpen={showContentGenerator}
        onClose={() => setShowContentGenerator(false)}
        onApply={(generatedContent) => {
          // Handle different content types
          if (generatedContent.emails && generatedContent.emails.length > 0) {
            // For email sequences, use the first email
            const firstEmail = generatedContent.emails[0];
            updateFormData({ 
              subject: firstEmail.subject || formData.subject,
              content: firstEmail.body || formData.content
            });
          } else if (generatedContent.message) {
            // For SMS
            updateFormData({ content: generatedContent.message });
          } else if (generatedContent.description) {
            // For property descriptions
            updateFormData({ content: generatedContent.description });
          }
          setShowContentGenerator(false);
        }}
      />
    </div>
  )
}

export default CampaignCreate
