import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Mail, MessageSquare, Phone, Users, Calendar, DollarSign, Target, Sparkles, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { campaignsApi, leadsApi, CreateCampaignData } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { Lead } from '@/types'
import { CampaignPreviewModal } from '@/components/campaigns/CampaignPreviewModal'
import { MessageEnhancerModal } from '@/components/ai/MessageEnhancerModal'
import { ContentGeneratorWizard } from '@/components/ai/ContentGeneratorWizard'
import { DaysOfWeekPicker } from '@/components/ui/DaysOfWeekPicker'
import { AdvancedAudienceFilters, AudienceFilter } from '@/components/campaigns/AdvancedAudienceFilters'

const campaignTypes = [
  {
    type: 'email',
    title: 'Email Campaign',
    description: 'Send targeted emails to your leads',
    icon: Mail,
  },
  {
    type: 'sms',
    title: 'SMS Campaign',
    description: 'Send text messages to your contacts',
    icon: MessageSquare,
  },
  {
    type: 'phone',
    title: 'Phone Campaign',
    description: 'Automated or manual calling campaign',
    icon: Phone,
  },
  {
    type: 'social',
    title: 'Social Media',
    description: 'Post to your social media channels',
    icon: Users,
  },
]

function CampaignCreate() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [selectedType, setSelectedType] = useState('')
  
  // Preview modal state
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  
  // AI Message Enhancer state
  const [showEnhancer, setShowEnhancer] = useState(false)
  
  // AI Content Generator state
  const [showContentGenerator, setShowContentGenerator] = useState(false)
  
  // Fetch leads count for audience selection
  const { data: leadsData } = useQuery({
    queryKey: ['leads-count'],
    queryFn: async () => {
      const response = await leadsApi.getLeads({ page: 1, limit: 1 })
      return response.data
    },
  })

  const totalLeads = leadsData?.pagination?.total || 0
  const newLeads = leadsData?.leads?.filter((l: Lead) => l.status === 'new').length || 0
  const warmLeads = leadsData?.leads?.filter((l: Lead) => l.status === 'contacted' || l.status === 'qualified').length || 0
  const hotLeads = leadsData?.leads?.filter((l: Lead) => l.status === 'qualified').length || 0
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: '',
    content: '',
    audience: 'all' as 'all' | 'new' | 'warm' | 'hot' | 'custom',
    customAudience: [] as string[],
    schedule: 'immediate' as 'immediate' | 'scheduled',
    scheduleDate: '',
    scheduleTime: '',
    budget: '',
    enableABTest: false,
    abTestVariant: '',
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
  })
  
  // Track filtered lead count
  const [filteredLeadCount, setFilteredLeadCount] = useState(totalLeads)

  // Fetch filtered lead count when filters change (Todo #18: Dynamic Audience Size Calculation)
  useEffect(() => {
    const fetchFilteredCount = async () => {
      if (formData.audience === 'custom' && formData.audienceFilters.length > 0) {
        try {
          const response = await leadsApi.countFiltered(formData.audienceFilters)
          setFilteredLeadCount(response.data.count)
        } catch (error) {
          console.error('Failed to fetch filtered lead count:', error)
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

  const createMutation = useMutation({
    mutationFn: campaignsApi.createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success(`Your ${selectedType} campaign "${formData.name}" has been created`)
      navigate('/campaigns')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create campaign')
    }
  })

  const handleTypeSelect = (type: string) => {
    setSelectedType(type)
    setStep(2)
  }

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a campaign name')
      return
    }
    
    if (step < 3) {
      setStep(3)
      return
    }
    
    try {
      // Transform formData to match backend expectations
      const campaignData: CreateCampaignData = {
        name: formData.name,
        type: selectedType.toUpperCase() as 'EMAIL' | 'SMS' | 'PHONE' | 'SOCIAL',
        status: 'DRAFT', // Create as DRAFT first
        subject: formData.subject || undefined,
        body: formData.content || undefined,
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
      }
      
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to create campaign preview')
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
        await campaignsApi.sendCampaign(createdCampaignId)
      }
      
      // Success!
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success(`Campaign "${formData.name}" ${formData.schedule === 'immediate' ? 'sent' : 'scheduled'} successfully!`)
      navigate('/campaigns')
    } catch (error: any) {
      toast.error(error.message || 'Failed to send campaign')
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
        console.error('Failed to delete draft campaign:', error)
      }
    }
    
    setShowPreview(false)
    setCreatedCampaignId(null)
    setPreviewData(null)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Create New Campaign</h1>
        <p className="mt-2 text-muted-foreground">
          Choose a campaign type to get started
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            1
          </div>
          <span className={step >= 1 ? 'font-medium' : 'text-muted-foreground'}>
            Choose Type
          </span>
        </div>
        <div className={`h-0.5 w-16 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        <div className="flex items-center space-x-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            2
          </div>
          <span className={step >= 2 ? 'font-medium' : 'text-muted-foreground'}>
            Basic Details
          </span>
        </div>
        <div className={`h-0.5 w-16 ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
        <div className="flex items-center space-x-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            3
          </div>
          <span className={step >= 3 ? 'font-medium' : 'text-muted-foreground'}>
            Configure
          </span>
        </div>
      </div>

      {/* Step 1: Choose Type */}
      {step === 1 && (
        <div className="grid gap-4 md:grid-cols-2">
          {campaignTypes.map((type) => (
            <Card
              key={type.type}
              className="cursor-pointer transition-shadow hover:shadow-lg"
              onClick={() => handleTypeSelect(type.type)}
            >
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <type.icon className="h-6 w-6" />
                </div>
                <CardTitle className="mt-4">{type.title}</CardTitle>
                <CardDescription>{type.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Step 2: Basic Details */}
      {step === 2 && (
        <Card>
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
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="description"
                className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Describe your campaign..."
                value={formData.description}
                onChange={(e) => updateFormData({ description: e.target.value })}
              />
            </div>

            {selectedType === 'email' && (
              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium">
                  Email Subject
                </label>
                <Input
                  id="subject"
                  placeholder="e.g., Exclusive Summer Offer - 50% Off!"
                  value={formData.subject}
                  onChange={(e) => updateFormData({ subject: e.target.value })}
                />
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!formData.name}>
                Next: Configure
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Configure Campaign */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Content */}
          <Card>
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
                    <textarea
                      className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="Enter your email content here..."
                      value={formData.content}
                      onChange={(e) => updateFormData({ content: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Tip: Use {`{firstName}`} to personalize with lead's first name
                    </p>
                  </div>
                </>
              )}
              
              {selectedType === 'sms' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">SMS Message</label>
                  <textarea
                    className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Enter your SMS message..."
                    maxLength={160}
                    value={formData.content}
                    onChange={(e) => updateFormData({ content: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.content.length}/160 characters
                  </p>
                </div>
              )}

              {selectedType === 'phone' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Call Script</label>
                  <textarea
                    className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Enter your call script..."
                    value={formData.content}
                    onChange={(e) => updateFormData({ content: e.target.value })}
                  />
                </div>
              )}

              {selectedType === 'social' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Post Content</label>
                  <textarea
                    className="min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

          {/* Audience */}
          <Card>
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
                <label className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
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

                <label className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
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

                <label className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
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

                <label className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
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

                <label className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
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
                    savedSegments={[]}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schedule & Budget */}
          <Card>
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
                <label className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
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

                <label className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
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
                        onChange={(e) => updateFormData({ scheduleDate: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                      />
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
                  onChange={(e) => updateFormData({ budget: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Set a budget limit for this campaign
                </p>
              </div>
            </CardContent>
          </Card>

          {/* A/B Testing */}
          {selectedType === 'email' && (
            <Card>
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
                  <div className="ml-7 space-y-2">
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
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button onClick={handleCreate} disabled={!formData.content || createMutation.isPending}>
              {createMutation.isPending ? 'Creating Campaign...' : 'Preview Campaign'}
            </Button>
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
