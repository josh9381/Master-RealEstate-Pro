import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, User, Building2, Mail, Phone, MapPin, DollarSign, Tag } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { leadsApi, CreateLeadData } from '@/lib/api'
import { useToast } from '@/hooks/useToast'

export default function LeadCreate() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
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
    notes: ''
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Please fill in all required fields')
      return
    }
    
    // Transform formData to match backend expectations
    const leadData: CreateLeadData = {
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      email: formData.email,
      phone: formData.phone || undefined,
      company: formData.company || undefined,
      position: formData.jobTitle || undefined,
      status: formData.status.toUpperCase(), // Backend expects UPPERCASE
      source: formData.source || 'website',
      assignedToId: formData.assignedTo || undefined, // Backend expects assignedToId
      value: formData.dealValue ? parseInt(formData.dealValue) : undefined,
      customFields: {
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zipCode: formData.zipCode || undefined,
        country: formData.country || undefined,
      }
    }
    
    createMutation.mutate(leadData)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="space-y-6">
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
            {/* Personal Information */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Personal Information</h2>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">First Name *</label>
                  <Input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="John"
                    required
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Last Name *</label>
                  <Input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Doe"
                    required
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Email *</label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john.doe@example.com"
                      required
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Company Information */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Company Information</h2>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Company Name</label>
                  <Input
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    placeholder="Acme Corporation"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Job Title</label>
                  <Input
                    name="jobTitle"
                    value={formData.jobTitle}
                    onChange={handleInputChange}
                    placeholder="CEO"
                    className="mt-1"
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">Deal Value</label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
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
            </Card>

            {/* Address Information */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Address</h2>
              </div>
              
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium">Street Address</label>
                  <Input
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="123 Main Street"
                    className="mt-1"
                  />
                </div>
                
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium">City</label>
                    <Input
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="New York"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">State</label>
                    <Input
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="NY"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">ZIP Code</label>
                    <Input
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      placeholder="10001"
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Country</label>
                  <Input
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    placeholder="United States"
                    className="mt-1"
                  />
                </div>
              </div>
            </Card>

            {/* Additional Notes */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Additional Notes</h2>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Add any additional notes about this lead..."
                className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Lead Details */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Lead Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Source *</label>
                  <select
                    name="source"
                    value={formData.source}
                    onChange={handleInputChange}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="website">Website</option>
                    <option value="referral">Referral</option>
                    <option value="social-media">Social Media</option>
                    <option value="email-campaign">Email Campaign</option>
                    <option value="cold-call">Cold Call</option>
                    <option value="event">Event</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Status *</label>
                  <select
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
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Assigned To</label>
                  <select
                    name="assignedTo"
                    value={formData.assignedTo}
                    onChange={handleInputChange}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Unassigned</option>
                    <option value="user1">John Smith</option>
                    <option value="user2">Sarah Johnson</option>
                    <option value="user3">Mike Davis</option>
                    <option value="user4">Emily Brown</option>
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
                <Badge>Hot Lead</Badge>
                <Badge variant="secondary">Enterprise</Badge>
                <Badge variant="outline">High Value</Badge>
              </div>
              
              <Button variant="outline" size="sm" className="w-full">
                Add Tags
              </Button>
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
