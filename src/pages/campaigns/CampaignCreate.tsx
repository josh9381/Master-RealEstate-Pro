import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Mail, MessageSquare, Phone, Users } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

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
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [selectedType, setSelectedType] = useState('')
  const [campaignName, setCampaignName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleTypeSelect = (type: string) => {
    setSelectedType(type)
    setStep(2)
  }

  const handleCreate = () => {
    if (!campaignName.trim()) {
      toast.error('Campaign name required', 'Please enter a name for your campaign')
      return
    }
    
    setLoading(true)
    
    // Simulate campaign creation
    setTimeout(() => {
      setLoading(false)
      toast.success('Campaign created!', `Your ${selectedType} campaign "${campaignName}" is ready`)
      setTimeout(() => navigate('/campaigns'), 500)
    }, 1000)
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
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
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
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleCreate} disabled={!campaignName} loading={loading}>
                {loading ? 'Creating...' : 'Create Campaign'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default CampaignCreate
