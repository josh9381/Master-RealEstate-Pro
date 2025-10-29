import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Mail, MessageSquare, Phone, Users, Calendar, DollarSign, Target, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { campaignsApi } from '@/lib/api'
import { mockLeads } from '@/data/mockData'

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
  })

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

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a campaign name')
      return
    }
    
    if (step < 3) {
      setStep(3)
      return
    }
    
    // Transform formData to match CreateCampaignData interface
    const campaignData = {
      name: formData.name,
      type: selectedType as 'email' | 'sms' | 'phone',
      status: 'draft' as const,
      subject: formData.subject || undefined,
      content: formData.content || undefined,
      scheduledAt: formData.schedule === 'scheduled' && formData.scheduleDate 
        ? `${formData.scheduleDate}T${formData.scheduleTime || '00:00'}:00Z` 
        : undefined,
      targetAudience: formData.audience === 'custom' ? formData.customAudience : undefined
    }
    
    createMutation.mutate(campaignData)
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
                    <label className="text-sm font-medium">Email Body</label>
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
                      Send to all {mockLeads.length} leads in your database
                    </div>
                  </div>
                  <Badge>{mockLeads.length} leads</Badge>
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
                  <Badge>{mockLeads.filter(l => l.status === 'new').length} leads</Badge>
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
                  <Badge>{mockLeads.filter(l => l.status === 'contacted' || l.status === 'qualified').length} leads</Badge>
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
                  <Badge>{mockLeads.filter(l => l.status === 'qualified').length} leads</Badge>
                </label>
              </div>
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
                <div className="ml-10 grid grid-cols-2 gap-4">
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
              {createMutation.isPending ? 'Creating Campaign...' : 'Create Campaign'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CampaignCreate
