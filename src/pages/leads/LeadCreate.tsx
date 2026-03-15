import { logger } from '@/lib/logger'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, User, Mail, Phone, MapPin, DollarSign, Tag, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { leadsApi, usersApi, CreateLeadData } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'
import { LeadsSubNav } from '@/components/leads/LeadsSubNav'

export default function LeadCreate() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const showConfirm = useConfirm()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    jobTitle: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    dealValue: '',
    source: 'website',
    status: 'new',
    assignedTo: '',
    tags: [] as string[],
    notes: '',
    // Real-estate specific
    propertyType: '',
    transactionType: '',
    budgetMin: '',
    budgetMax: '',
    preApprovalStatus: '',
    moveInTimeline: '',
    desiredLocation: '',
    bedsMin: '',
    bathsMin: '',
  })
  const [newTagInput, setNewTagInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showRealEstate, setShowRealEstate] = useState(false)
  const [showAddress, setShowAddress] = useState(false)
  // Fetch team members for assigned-to dropdown
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      try {
        const members = await usersApi.getTeamMembers()
        return Array.isArray(members) ? members : []
      } catch (error) {
        logger.error('Team members endpoint unavailable, trying fallback:', error)
        // Fallback to users list if team-members endpoint unavailable
        const response = await usersApi.getUsers({ limit: 50 })
        return response.data?.users || response.data || []
      }
    },
  })

  const createMutation = useMutation({
    mutationFn: leadsApi.createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead created successfully')
      navigate('/leads')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create lead')
    }
  })

  const validateForm = (): Record<string, string> => {
    const newErrors: Record<string, string> = {}
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (formData.phone && !/^[+]?[\d\s()-]{7,}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number (digits, +, -, (, ), spaces)'
    }
    if (formData.budgetMin && formData.budgetMax && parseFloat(formData.budgetMin) > parseFloat(formData.budgetMax)) {
      newErrors.budgetMin = 'Budget minimum cannot exceed budget maximum'
    }
    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const newErrors = validateForm()
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      toast.error('Please fix the validation errors')
      return
    }

    // Check for duplicate email before creating (5.1)
    if (formData.email) {
      try {
        const existing = await leadsApi.getLeads({ search: formData.email, limit: 5 })
        const duplicates = (existing.data?.leads || existing.data || []).filter(
          (l: { email?: string }) => l.email?.toLowerCase() === formData.email.toLowerCase()
        )
        if (duplicates.length > 0) {
          const confirmed = await showConfirm({
            title: 'Possible Duplicate',
            message: `A lead with email "${formData.email}" already exists. Do you want to create this lead anyway?`,
          })
          if (!confirmed) return
        }
      } catch {
        // If check fails, allow creation to proceed
      }
    }
    
    // Transform formData to match backend expectations
    const leadData: CreateLeadData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone || undefined,
      company: formData.company || undefined,
      position: formData.jobTitle || undefined,
      status: formData.status.toUpperCase(), // Backend expects UPPERCASE
      source: formData.source || 'website',
      assignedToId: formData.assignedTo || undefined, // Backend expects assignedToId
      value: formData.dealValue ? parseInt(formData.dealValue) : undefined,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      notes: formData.notes || undefined,
      customFields: {
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zipCode: formData.zipCode || undefined,
        country: formData.country || undefined,
      },
      // Real-estate specific fields
      propertyType: formData.propertyType || undefined,
      transactionType: formData.transactionType || undefined,
      budgetMin: formData.budgetMin ? parseFloat(formData.budgetMin) : undefined,
      budgetMax: formData.budgetMax ? parseFloat(formData.budgetMax) : undefined,
      preApprovalStatus: formData.preApprovalStatus || undefined,
      moveInTimeline: formData.moveInTimeline || undefined,
      desiredLocation: formData.desiredLocation || undefined,
      bedsMin: formData.bedsMin ? parseInt(formData.bedsMin) : undefined,
      bathsMin: formData.bathsMin ? parseInt(formData.bathsMin) : undefined,
    }
    
    createMutation.mutate(leadData)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => { const next = { ...prev }; delete next[name]; return next })
    }
  }

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <LeadsSubNav hideAddButton />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/leads')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create New Lead</h1>
            <p className="text-muted-foreground">Add a new lead to your pipeline</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card 1: Contact Info (merged Personal + Company) */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Contact Information</h2>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="lead-firstName" className="text-sm font-medium">First Name *</label>
                  <Input
                    id="lead-firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="John"
                    required
                    className="mt-1"
                  />
                  {errors.firstName && <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>}
                </div>
                
                <div>
                  <label htmlFor="lead-lastName" className="text-sm font-medium">Last Name *</label>
                  <Input
                    id="lead-lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Doe"
                    required
                    className="mt-1"
                  />
                  {errors.lastName && <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>}
                </div>
                
                <div>
                  <label htmlFor="lead-email" className="text-sm font-medium">Email *</label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="lead-email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john.doe@example.com"
                      required
                      className="pl-10"
                    />
                  </div>
                  {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
                </div>
                
                <div>
                  <label htmlFor="lead-phone" className="text-sm font-medium">Phone</label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="lead-phone"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                      className="pl-10"
                    />
                  </div>
                  {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label htmlFor="lead-company" className="text-sm font-medium">Company</label>
                  <Input
                    id="lead-company"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    placeholder="Acme Corporation"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label htmlFor="lead-jobTitle" className="text-sm font-medium">Job Title</label>
                  <Input
                    id="lead-jobTitle"
                    name="jobTitle"
                    value={formData.jobTitle}
                    onChange={handleInputChange}
                    placeholder="CEO"
                    className="mt-1"
                  />
                </div>
              </div>
            </Card>

            {/* Card 2: Real Estate Details — collapsible, starts collapsed */}
            <Card className="p-6">
              <button
                type="button"
                className="flex items-center justify-between w-full"
                onClick={() => setShowRealEstate(!showRealEstate)}
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Real Estate Details</h2>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${showRealEstate ? 'rotate-180' : ''}`} />
              </button>
              
              {showRealEstate && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label htmlFor="lead-propertyType" className="text-sm font-medium">Property Type</label>
                    <select
                      id="lead-propertyType"
                      name="propertyType"
                      value={formData.propertyType}
                      onChange={handleInputChange}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                    <label htmlFor="lead-transactionType" className="text-sm font-medium">Transaction Type</label>
                    <select
                      id="lead-transactionType"
                      name="transactionType"
                      value={formData.transactionType}
                      onChange={handleInputChange}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                    <label htmlFor="lead-budgetMin" className="text-sm font-medium">Budget Min ($)</label>
                    <input
                      id="lead-budgetMin"
                      type="number"
                      name="budgetMin"
                      min="0"
                      value={formData.budgetMin}
                      onChange={handleInputChange}
                      onKeyDown={(e) => ['e', 'E', '-', '+'].includes(e.key) && e.preventDefault()}
                      placeholder="e.g. 200000"
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    {errors.budgetMin && <p className="text-sm text-red-500 mt-1">{errors.budgetMin}</p>}
                  </div>
                  <div>
                    <label htmlFor="lead-budgetMax" className="text-sm font-medium">Budget Max ($)</label>
                    <input
                      id="lead-budgetMax"
                      type="number"
                      name="budgetMax"
                      min="0"
                      value={formData.budgetMax}
                      onChange={handleInputChange}
                      onKeyDown={(e) => ['e', 'E', '-', '+'].includes(e.key) && e.preventDefault()}
                      placeholder="e.g. 500000"
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="lead-preApprovalStatus" className="text-sm font-medium">Pre-Approval Status</label>
                    <select
                      id="lead-preApprovalStatus"
                      name="preApprovalStatus"
                      value={formData.preApprovalStatus}
                      onChange={handleInputChange}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Not specified</option>
                      <option value="Not Started">Not Started</option>
                      <option value="In-Process">In-Process</option>
                      <option value="Pre-Approved">Pre-Approved</option>
                      <option value="Cash Buyer">Cash Buyer</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="lead-moveInTimeline" className="text-sm font-medium">Move-In Timeline</label>
                    <select
                      id="lead-moveInTimeline"
                      name="moveInTimeline"
                      value={formData.moveInTimeline}
                      onChange={handleInputChange}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Not specified</option>
                      <option value="ASAP">ASAP</option>
                      <option value="1-3 Months">1-3 Months</option>
                      <option value="3-6 Months">3-6 Months</option>
                      <option value="6-12 Months">6-12 Months</option>
                      <option value="Just Browsing">Just Browsing</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="lead-desiredLocation" className="text-sm font-medium">Desired Location</label>
                    <input
                      id="lead-desiredLocation"
                      type="text"
                      name="desiredLocation"
                      value={formData.desiredLocation}
                      onChange={handleInputChange}
                      placeholder="City, neighborhood, or zip code"
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="lead-bedsMin" className="text-sm font-medium">Min Bedrooms</label>
                    <input
                      id="lead-bedsMin"
                      type="number"
                      name="bedsMin"
                      value={formData.bedsMin}
                      onChange={handleInputChange}
                      min="0"
                      placeholder="e.g. 3"
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="lead-bathsMin" className="text-sm font-medium">Min Bathrooms</label>
                    <input
                      id="lead-bathsMin"
                      type="number"
                      name="bathsMin"
                      value={formData.bathsMin}
                      onChange={handleInputChange}
                      min="0"
                      placeholder="e.g. 2"
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="lead-dealValue" className="text-sm font-medium">Deal Value</label>
                    <div className="relative mt-1">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="lead-dealValue"
                        type="number"
                        name="dealValue"
                        value={formData.dealValue}
                        onChange={handleInputChange}
                        placeholder="50000"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Card 3: Address — collapsible, starts collapsed */}
            <Card className="p-6">
              <button
                type="button"
                className="flex items-center justify-between w-full"
                onClick={() => setShowAddress(!showAddress)}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Address</h2>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${showAddress ? 'rotate-180' : ''}`} />
              </button>
              
              {showAddress && (
                <div className="grid gap-4 mt-4">
                  <div>
                    <label htmlFor="lead-address" className="text-sm font-medium">Street Address</label>
                    <Input
                      id="lead-address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="123 Main Street"
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label htmlFor="lead-city" className="text-sm font-medium">City</label>
                      <Input
                        id="lead-city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="New York"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="lead-state" className="text-sm font-medium">State</label>
                      <Input
                        id="lead-state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        placeholder="NY"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="lead-zipCode" className="text-sm font-medium">ZIP Code</label>
                      <Input
                        id="lead-zipCode"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        placeholder="10001"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="lead-country" className="text-sm font-medium">Country</label>
                    <Input
                      id="lead-country"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      placeholder="United States"
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </Card>

            {/* Card 4: Notes */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Notes</h2>
              <label htmlFor="lead-notes" className="sr-only">Notes</label>
              <textarea
                id="lead-notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Add any additional notes about this lead..."
                className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </Card>

            {/* Mobile-only Create/Cancel buttons */}
            <div className="lg:hidden space-y-3">
              <Button 
                type="submit" 
                className="w-full"
                disabled={createMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {createMutation.isPending ? 'Creating...' : 'Create Lead'}
              </Button>
              <Button 
                type="button"
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/leads')}
              >
                Cancel
              </Button>
            </div>
          </div>

          {/* Sidebar — sticky */}
          <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            {/* Lead Details */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Lead Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="lead-source" className="text-sm font-medium">Source *</label>
                  <select
                    id="lead-source"
                    name="source"
                    value={formData.source}
                    onChange={handleInputChange}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <optgroup label="Referral-based">
                      <option value="referral">Referral</option>
                      <option value="past_client">Past Client</option>
                      <option value="sphere_of_influence">Sphere of Influence</option>
                    </optgroup>
                    <optgroup label="Online / Digital">
                      <option value="website">Website</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="instagram">Instagram</option>
                      <option value="facebook_ads">Facebook Ads</option>
                      <option value="google_ads">Google Ads</option>
                      <option value="youtube">YouTube</option>
                      <option value="social_media">Social Media</option>
                    </optgroup>
                    <optgroup label="Traditional / Outbound">
                      <option value="cold_call">Cold Call</option>
                      <option value="door_knocking">Door Knocking</option>
                      <option value="open_house">Open House</option>
                      <option value="print_ad">Print Ad</option>
                      <option value="networking_event">Networking Event</option>
                    </optgroup>
                    <optgroup label="Other">
                      <option value="ai_assistant">AI Assistant</option>
                      <option value="email_campaign">Email Campaign</option>
                      <option value="event">Event</option>
                      <option value="partner">Partner</option>
                      <option value="other">Other / Custom</option>
                    </optgroup>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="lead-status" className="text-sm font-medium">Status *</label>
                  <select
                    id="lead-status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
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
                  <label htmlFor="lead-assignedTo" className="text-sm font-medium">Assigned To</label>
                  <select
                    id="lead-assignedTo"
                    name="assignedTo"
                    value={formData.assignedTo}
                    onChange={handleInputChange}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.length > 0 ? (
                      teamMembers.map((member: { id: string; firstName: string; lastName: string }) => (
                        <option key={member.id} value={member.id}>
                          {member.firstName} {member.lastName}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No team members available</option>
                    )}
                  </select>
                </div>
              </div>
            </Card>

            {/* Tags */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Tags</h3>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.tags.map((tag) => (
                  <Badge key={tag} className="cursor-pointer" onClick={() => {
                    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))
                  }}>
                    {tag}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
                {formData.tags.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tags added yet</p>
                )}
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (newTagInput.trim() && !formData.tags.includes(newTagInput.trim())) {
                        setFormData(prev => ({ ...prev, tags: [...prev.tags, newTagInput.trim()] }))
                        setNewTagInput('')
                      }
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (newTagInput.trim() && !formData.tags.includes(newTagInput.trim())) {
                      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTagInput.trim()] }))
                      setNewTagInput('')
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </Card>

            {/* Actions */}
            <Card className="p-6">
              <div className="space-y-3">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {createMutation.isPending ? 'Creating...' : 'Create Lead'}
                </Button>
                
                <Button 
                  type="button"
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate('/leads')}
                >
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
