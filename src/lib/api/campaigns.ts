import api from './client'

export interface CampaignsQuery {
  page?: number
  limit?: number
  search?: string
  type?: 'EMAIL' | 'SMS' | 'PHONE' | 'SOCIAL'
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface CreateCampaignData {
  name: string
  type: 'EMAIL' | 'SMS' | 'PHONE' | 'SOCIAL'
  status?: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  subject?: string
  body?: string
  previewText?: string
  startDate?: string
  endDate?: string
  budget?: number
  audience?: number
  isABTest?: boolean
  abTestData?: Record<string, unknown>
  tagIds?: string[]
  // Recurring campaign fields
  isRecurring?: boolean
  frequency?: 'daily' | 'weekly' | 'monthly'
  recurringPattern?: {
    daysOfWeek?: number[]
    dayOfMonth?: number
    time?: string
  }
  maxOccurrences?: number
  attachments?: Array<{ filename: string; path: string; size: number; type: string }>
  mediaUrl?: string // MMS media URL for SMS campaigns
  sendTimeOptimization?: 'none' | 'timezone' | 'engagement' | 'both'
  abTestWinnerMetric?: 'open_rate' | 'click_rate'
  abTestEvalHours?: number
}

export const campaignsApi = {
  getCampaigns: async (params?: CampaignsQuery) => {
    const response = await api.get('/campaigns', { params })
    return response.data
  },

  getCampaign: async (id: string) => {
    const response = await api.get(`/campaigns/${id}`)
    return response.data
  },

  /** Compile email blocks JSON to final HTML via MJML (for preview) */
  compileEmail: async (content: string, subject?: string, previewText?: string) => {
    const response = await api.post('/campaigns/compile-email', { content, subject, previewText })
    return response.data as { html: string; errors: { message: string; line: number }[]; subject: string; previewText: string }
  },

  /** Upload email attachments (returns file metadata) */
  uploadAttachments: async (files: File[]) => {
    const formData = new FormData()
    files.forEach(f => formData.append('attachments', f))
    const response = await api.post('/campaigns/upload-attachments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data as { attachments: Array<{ filename: string; path: string; url: string; size: number; type: string }> }
  },

  createCampaign: async (data: CreateCampaignData) => {
    const response = await api.post('/campaigns', data)
    return response.data
  },

  updateCampaign: async (id: string, data: Partial<CreateCampaignData>) => {
    const response = await api.patch(`/campaigns/${id}`, data)
    return response.data
  },

  deleteCampaign: async (id: string) => {
    const response = await api.delete(`/campaigns/${id}`)
    return response.data
  },

  getCampaignStats: async (id: string) => {
    const response = await api.get(`/campaigns/${id}/stats`)
    return response.data
  },

  addRecipients: async (id: string, leadIds: string[]) => {
    const response = await api.post(`/campaigns/${id}/recipients`, { leadIds })
    return response.data
  },

  sendCampaign: async (id: string, options?: { leadIds?: string[], filters?: Record<string, unknown>, confirmLargeSend?: boolean }) => {
    const response = await api.post(`/campaigns/${id}/send`, options || {})
    return response.data
  },

  previewCampaign: async (id: string, leadIds?: string[]) => {
    const response = await api.get(`/campaigns/${id}/preview`, {
      params: leadIds ? { leadIds: leadIds.join(',') } : {}
    })
    return response.data
  },

  pauseCampaign: async (id: string) => {
    const response = await api.post(`/campaigns/${id}/pause`)
    return response.data
  },

  sendCampaignNow: async (id: string) => {
    const response = await api.post(`/campaigns/${id}/send-now`)
    return response.data
  },

  rescheduleCampaign: async (id: string, startDate: string, timezone?: string) => {
    const response = await api.patch(`/campaigns/${id}/reschedule`, { startDate, timezone })
    return response.data
  },

  // Template endpoints
  getTemplates: async (params?: { category?: string; type?: string; recurring?: boolean }) => {
    const response = await api.get('/campaigns/templates', { params })
    return response.data
  },

  getTemplate: async (templateId: string) => {
    const response = await api.get(`/campaigns/templates/${templateId}`)
    return response.data
  },

  createFromTemplate: async (templateId: string, data: { name: string; startDate?: string; tagIds?: string[] }) => {
    const response = await api.post(`/campaigns/from-template/${templateId}`, data)
    return response.data
  },

  duplicateCampaign: async (id: string, name?: string) => {
    const response = await api.post(`/campaigns/${id}/duplicate`, { name })
    return response.data
  },

  archiveCampaign: async (id: string) => {
    const response = await api.post(`/campaigns/${id}/archive`)
    return response.data
  },

  unarchiveCampaign: async (id: string) => {
    const response = await api.post(`/campaigns/${id}/unarchive`)
    return response.data
  },

  // Campaign analytics endpoints
  getCampaignAnalytics: async (id: string) => {
    const response = await api.get(`/campaigns/${id}/analytics`)
    return response.data
  },

  getCampaignTimeline: async (id: string, params?: { days?: number }) => {
    const response = await api.get(`/campaigns/${id}/analytics/timeline`, { params })
    return response.data
  },

  getCampaignLinkStats: async (id: string) => {
    const response = await api.get(`/campaigns/${id}/analytics/links`)
    return response.data
  },

  getCampaignRecipients: async (id: string, params?: { page?: number; limit?: number; status?: string }) => {
    const response = await api.get(`/campaigns/${id}/recipients`, { params })
    return response.data
  },

  getABTestResults: async (id: string) => {
    const response = await api.get(`/campaigns/${id}/abtest-results`)
    return response.data
  },
}

export interface DeliverabilityStats {
  sent: number
  delivered: number
  bounced: number
  hardBounces: number
  softBounces: number
  spamComplaints: number
  deliveryRate: number
  bounceRate: number
  complaintRate: number
}

export interface SuppressedContact {
  id: string
  email: string
  suppressedAt: string
  reason: string
}

export const deliverabilityApi = {
  getStats: async (params?: { startDate?: string; endDate?: string }) => {
    const response = await api.get('/deliverability/stats', { params })
    return response.data
  },

  getCampaignStats: async (campaignId: string) => {
    const response = await api.get(`/deliverability/campaign/${campaignId}`)
    return response.data
  },

  getSuppressedContacts: async () => {
    const response = await api.get('/deliverability/suppressed')
    return response.data
  },

  getRetryable: async () => {
    const response = await api.get('/deliverability/retryable')
    return response.data
  },

  retryMessage: async (messageId: string) => {
    const response = await api.post(`/deliverability/retry/${messageId}`)
    return response.data
  },
}
