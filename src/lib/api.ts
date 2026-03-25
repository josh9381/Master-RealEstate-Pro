import axios, { AxiosError } from 'axios'
import type { User } from '@/types'
import { devApiSuccessInterceptor, devApiErrorInterceptor } from './devErrorMonitor'

// Determine the API base URL
export const getApiBaseUrl = () => {
  // Check if we have an environment variable for the API URL
  const envApiUrl = import.meta.env.VITE_API_URL
  if (envApiUrl) {
    return envApiUrl
  }

  // In GitHub Codespaces, detect the backend URL
  if (window.location.hostname.includes('app.github.dev')) {
    // Replace the port 3000 with 8000 for backend
    const backendUrl = window.location.origin.replace('-3000.', '-8000.')
    const apiUrl = `${backendUrl}/api`
    return apiUrl
  }

  // Default to relative path (works with Vite proxy in local development)
  return '/api'
}

// Create axios instance
const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - attach access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle token refresh
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}> = []

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => devApiSuccessInterceptor(response),
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            return api(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refreshToken')

      if (!refreshToken) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('auth-storage')
        window.location.href = '/auth/login'
        return Promise.reject(error)
      }

      try {
        const response = await axios.post(`${getApiBaseUrl()}/auth/refresh`, { refreshToken })
        // Handle both token structures: {data: {accessToken}} and {data: {tokens: {accessToken}}}
        const data = response.data.data || response.data
        const newAccessToken = data.tokens?.accessToken || data.accessToken
        // Token rotation (#87): backend now returns a new refresh token
        const newRefreshToken = data.tokens?.refreshToken || data.refreshToken

        if (!newAccessToken) {
          throw new Error('No access token in refresh response')
        }

        localStorage.setItem('accessToken', newAccessToken)
        // Store rotated refresh token if provided
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken)
        }
        processQueue(null, newAccessToken)

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        }
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError as Error, null)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('auth-storage')
        window.location.href = '/auth/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // Surface API error messages so .message contains the server's message
    const serverMessage = (error as { response?: { data?: { message?: string } } }).response?.data?.message
    if (serverMessage && typeof serverMessage === 'string') {
      error.message = serverMessage
    }

    return devApiErrorInterceptor(error)
  }
)

// ============================================================================
// AUTH API
// ============================================================================

export interface RegisterData {
  firstName: string
  lastName: string
  email: string
  password: string
  tosAccepted: boolean
}

export interface LoginData {
  email: string
  password: string
  rememberMe?: boolean
  twoFactorCode?: string
}

export interface AuthResponse {
  success: boolean
  message: string
  data: {
    user: User
    tokens: {
      accessToken: string
      refreshToken: string
    }
  }
  // 2FA challenge fields (returned when user has 2FA enabled)
  requires2FA?: boolean
  pendingToken?: string
}

export const authApi = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data)
    return response.data
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data)
    return response.data
  },

  verify2FALogin: async (pendingToken: string, twoFactorCode: string, rememberMe?: boolean): Promise<AuthResponse> => {
    const response = await api.post('/auth/login/2fa-verify', { pendingToken, twoFactorCode, rememberMe })
    return response.data
  },

  logout: async (): Promise<void> => {
    const refreshToken = localStorage.getItem('refreshToken')
    try {
      await api.post('/auth/logout', { refreshToken })
    } catch {
      // Logout should succeed even if the API call fails
    }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  },

  refreshToken: async (refreshToken: string): Promise<{ accessToken: string }> => {
    const response = await api.post('/auth/refresh', { refreshToken })
    return response.data
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me')
    // Backend returns { success: true, data: { user: { ... } } }
    const data = response.data
    if (data?.data?.user) {
      return data.data.user
    }
    // Fallback: maybe it's already the user object
    if (data?.user) {
      return data.user
    }
    return data
  },

  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }).then(r => r.data),

  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }).then(r => r.data),

  verifyEmail: (token: string) => api.post('/auth/verify-email', { token }).then(r => r.data),

  resendVerification: () => api.post('/auth/resend-verification').then(r => r.data),

  getSessions: () => api.get('/auth/sessions').then(r => r.data?.data || r.data),

  terminateSession: (sessionId: string) => api.delete(`/auth/sessions/${sessionId}`).then(r => r.data),

  terminateAllSessions: () => api.post('/auth/sessions/terminate-all').then(r => r.data),

  deleteAccount: (password: string) => api.post('/auth/delete-account', { password }).then(r => r.data),
}

// ============================================================================
// LEADS API
// ============================================================================

export interface LeadsQuery {
  page?: number
  limit?: number
  search?: string
  status?: string
  source?: string
  minScore?: number
  maxScore?: number
  assignedTo?: string
  tags?: string[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface CreateLeadData {
  firstName: string
  lastName: string
  email: string
  phone?: string
  company?: string
  position?: string
  status?: string
  source?: string
  value?: number
  stage?: string
  assignedToId?: string
  notes?: string
  customFields?: Record<string, unknown>
  tags?: string[]
  // Real-estate specific fields
  propertyType?: string
  transactionType?: string
  budgetMin?: number
  budgetMax?: number
  preApprovalStatus?: string
  moveInTimeline?: string
  desiredLocation?: string
  bedsMin?: number
  bathsMin?: number
}

export interface UpdateLeadData extends Partial<CreateLeadData> {
  score?: number
  pipelineId?: string
  pipelineStageId?: string
}

export interface BulkUpdateData {
  leadIds: string[]
  updates: Partial<UpdateLeadData>
}

export const leadsApi = {
  getLeads: async (params?: LeadsQuery) => {
    const response = await api.get('/leads', { params })
    return response.data
  },

  getLead: async (id: string) => {
    const response = await api.get(`/leads/${id}`)
    return response.data
  },

  createLead: async (data: CreateLeadData) => {
    const response = await api.post('/leads', data)
    return response.data
  },

  updateLead: async (id: string, data: UpdateLeadData) => {
    const response = await api.patch(`/leads/${id}`, data)
    return response.data
  },

  deleteLead: async (id: string) => {
    const response = await api.delete(`/leads/${id}`)
    return response.data
  },

  bulkUpdate: async (data: BulkUpdateData) => {
    const response = await api.post('/leads/bulk-update', data)
    return response.data
  },

  bulkDelete: async (leadIds: string[]) => {
    const response = await api.post('/leads/bulk-delete', { leadIds })
    return response.data
  },

  countFiltered: async (filters: Array<{ field: string; operator: string; value: string | number | string[] }>) => {
    const response = await api.post('/leads/count-filtered', { filters })
    return response.data
  },

  mergeLeads: async (data: { primaryLeadId: string; secondaryLeadId: string; fieldSelections?: Record<string, 'primary' | 'secondary'> }) => {
    const response = await api.post('/leads/merge', {
      primaryLeadId: data.primaryLeadId,
      secondaryLeadIds: [data.secondaryLeadId],
      fieldSelections: data.fieldSelections,
    })
    return response.data
  },

  importLeads: (formData: FormData) => api.post('/leads/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data),

  previewImport: (formData: FormData) => api.post('/leads/import/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data),

  checkImportDuplicates: (formData: FormData) => api.post('/leads/import/duplicates', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data),

  scanDuplicates: async (config: { matchEmail?: boolean; matchPhone?: boolean; matchName?: boolean }) => {
    const response = await api.post('/leads/duplicates/scan', config)
    return response.data
  },

  getStats: async () => {
    const response = await api.get('/leads/stats')
    return response.data
  },
}

// ============================================================================
// TAGS API
// ============================================================================

export interface CreateTagData {
  name: string
  color?: string
}

export const tagsApi = {
  getTags: async () => {
    const response = await api.get('/tags')
    return response.data
  },

  createTag: async (data: CreateTagData) => {
    const response = await api.post('/tags', data)
    return response.data
  },

  updateTag: async (id: string, data: Partial<CreateTagData>) => {
    const response = await api.put(`/tags/${id}`, data)
    return response.data
  },

  deleteTag: async (id: string) => {
    const response = await api.delete(`/tags/${id}`)
    return response.data
  },

  addTagsToLead: async (leadId: string, tagIds: string[]) => {
    const response = await api.post(`/leads/${leadId}/tags`, { tagIds })
    return response.data
  },

  removeTagFromLead: async (leadId: string, tagId: string) => {
    const response = await api.delete(`/leads/${leadId}/tags/${tagId}`)
    return response.data
  },
}

// ============================================================================
// CUSTOM FIELDS API
// ============================================================================

export interface CreateCustomFieldData {
  name: string
  fieldKey?: string
  type: 'text' | 'number' | 'date' | 'dropdown' | 'boolean' | 'textarea'
  required?: boolean
  options?: string[]
  order?: number
  defaultValue?: string
  placeholder?: string
  validation?: string
}

export const customFieldsApi = {
  getCustomFields: async () => {
    const response = await api.get('/custom-fields')
    return response.data
  },

  getCustomField: async (id: string) => {
    const response = await api.get(`/custom-fields/${id}`)
    return response.data
  },

  createCustomField: async (data: CreateCustomFieldData) => {
    const response = await api.post('/custom-fields', data)
    return response.data
  },

  updateCustomField: async (id: string, data: Partial<CreateCustomFieldData>) => {
    const response = await api.put(`/custom-fields/${id}`, data)
    return response.data
  },

  deleteCustomField: async (id: string) => {
    const response = await api.delete(`/custom-fields/${id}`)
    return response.data
  },

  reorderCustomFields: async (fieldIds: string[]) => {
    const response = await api.put('/custom-fields/reorder', { fieldIds })
    return response.data
  },
}

// ============================================================================
// LEAD DOCUMENTS API
// ============================================================================

export const documentsApi = {
  getDocuments: async (leadId: string) => {
    const response = await api.get(`/leads/${leadId}/documents`)
    return response.data
  },

  uploadDocuments: async (leadId: string, files: File[]) => {
    const formData = new FormData()
    files.forEach((file) => formData.append('documents', file))
    const response = await api.post(`/leads/${leadId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  deleteDocument: async (leadId: string, documentId: string) => {
    const response = await api.delete(`/leads/${leadId}/documents/${documentId}`)
    return response.data
  },
}

// ============================================================================
// NOTES API
// ============================================================================

export interface CreateNoteData {
  leadId: string
  content: string
}

export const notesApi = {
  // Lead-specific notes (nested route)
  getLeadNotes: async (leadId: string) => {
    const response = await api.get(`/leads/${leadId}/notes`)
    return response.data
  },

  createNote: async (data: CreateNoteData) => {
    const response = await api.post('/notes', data)
    return response.data
  },

  // Standalone note operations
  getNote: async (id: string) => {
    const response = await api.get(`/notes/${id}`)
    return response.data
  },

  updateNote: async (id: string, content: string) => {
    const response = await api.put(`/notes/${id}`, { content })
    return response.data
  },

  deleteNote: async (id: string) => {
    const response = await api.delete(`/notes/${id}`)
    return response.data
  },
}

// ============================================================================
// CAMPAIGNS API
// ============================================================================

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

  rescheduleCampaign: async (id: string, startDate: string) => {
    const response = await api.patch(`/campaigns/${id}/reschedule`, { startDate })
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

// ============================================================================
// DELIVERABILITY API
// ============================================================================

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

// ============================================================================
// ACTIVITIES API
// ============================================================================

export interface ActivitiesQuery {
  page?: number
  limit?: number
  leadId?: string
  type?: string
  userId?: string
  startDate?: string
  endDate?: string
}

export interface CreateActivityData {
  type: 'email' | 'call' | 'meeting' | 'note' | 'status_change' | 'task'
  leadId: string
  description: string
  metadata?: Record<string, unknown>
  scheduledAt?: string
  status?: string
}

export const activitiesApi = {
  getActivities: async (params?: ActivitiesQuery) => {
    const response = await api.get('/activities', { params })
    return response.data
  },

  getActivity: async (id: string) => {
    const response = await api.get(`/activities/${id}`)
    return response.data
  },

  createActivity: async (data: CreateActivityData) => {
    const response = await api.post('/activities', data)
    return response.data
  },

  updateActivity: async (id: string, data: Partial<CreateActivityData>) => {
    const response = await api.put(`/activities/${id}`, data)
    return response.data
  },

  deleteActivity: async (id: string) => {
    const response = await api.delete(`/activities/${id}`)
    return response.data
  },

  getLeadActivities: async (leadId: string, params?: { page?: number; limit?: number }) => {
    const response = await api.get(`/activities/lead/${leadId}`, { params })
    return response.data
  },

  getUserActivities: async (params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) => {
    const response = await api.get('/activities/user', { params })
    return response.data
  },

  getActivityStats: async (params?: { startDate?: string; endDate?: string }) => {
    const response = await api.get('/activities/stats', { params })
    return response.data
  },
}

// ============================================================================
// TASKS API
// ============================================================================

export interface TasksQuery {
  page?: number
  limit?: number
  leadId?: string
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  priority?: 'low' | 'medium' | 'high'
  assignedToId?: string
  dueDate?: string
}

export interface CreateTaskData {
  title: string
  description?: string
  leadId?: string
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  priority?: 'low' | 'medium' | 'high'
  dueDate?: string
  assignedToId?: string
}

export const tasksApi = {
  getTasks: async (params?: TasksQuery) => {
    const response = await api.get('/tasks', { params })
    return response.data
  },

  getTaskStats: async () => {
    const response = await api.get('/tasks/stats')
    return response.data
  },

  getTask: async (id: string) => {
    const response = await api.get(`/tasks/${id}`)
    return response.data
  },

  createTask: async (data: CreateTaskData) => {
    const response = await api.post('/tasks', data)
    return response.data
  },

  updateTask: async (id: string, data: Partial<CreateTaskData>) => {
    const response = await api.put(`/tasks/${id}`, data)
    return response.data
  },

  deleteTask: async (id: string) => {
    const response = await api.delete(`/tasks/${id}`)
    return response.data
  },

  completeTask: async (id: string) => {
    const response = await api.post(`/tasks/${id}/complete`)
    return response.data
  },

  getLeadTasks: async (leadId: string, params?: { page?: number; limit?: number }) => {
    const response = await api.get(`/leads/${leadId}/tasks`, { params })
    return response.data
  },

  getUserTasks: async (params?: TasksQuery) => {
    const response = await api.get('/tasks/user', { params })
    return response.data
  },
}

// ============================================================================
// ANALYTICS API
// ============================================================================

export interface AnalyticsQuery {
  startDate?: string
  endDate?: string
}

export const analyticsApi = {
  getDashboardStats: async (params?: AnalyticsQuery) => {
    const response = await api.get('/analytics/dashboard', { params })
    return response.data
  },

  getLeadAnalytics: async (params?: AnalyticsQuery) => {
    const response = await api.get('/analytics/leads', { params })
    return response.data
  },

  getCampaignAnalytics: async (params?: AnalyticsQuery) => {
    const response = await api.get('/analytics/campaigns', { params })
    return response.data
  },

  getActivityFeed: async (params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) => {
    const response = await api.get('/analytics/activity-feed', { params })
    return response.data
  },

  getConversionFunnel: async (params?: AnalyticsQuery) => {
    const response = await api.get('/analytics/conversion-funnel', { params })
    return response.data
  },

  getMonthlyPerformance: async (params?: { months?: number }) => {
    const response = await api.get('/analytics/monthly-performance', { params })
    return response.data
  },

  getHourlyEngagement: async (params?: { days?: number }) => {
    const response = await api.get('/analytics/hourly-engagement', { params })
    return response.data
  },

  getTeamPerformance: async (params?: AnalyticsQuery) => {
    const response = await api.get('/analytics/team-performance', { params })
    return response.data
  },

  getRevenueTimeline: async (params?: { months?: number }) => {
    const response = await api.get('/analytics/revenue-timeline', { params })
    return response.data
  },

  getDashboardAlerts: async () => {
    const response = await api.get('/analytics/dashboard-alerts')
    return response.data
  },

  getTaskAnalytics: async (params?: AnalyticsQuery) => {
    const response = await api.get('/analytics/tasks', { params })
    return response.data
  },

  getPipelineMetrics: async () => {
    const response = await api.get('/analytics/pipeline-metrics')
    return response.data
  },

  getDeviceBreakdown: async (params?: { campaignId?: string }) => {
    const response = await api.get('/analytics/device-breakdown', { params })
    return response.data
  },

  getGeographicBreakdown: async (params?: { campaignId?: string }) => {
    const response = await api.get('/analytics/geographic', { params })
    return response.data
  },

  // Phase 5: Attribution, comparison, velocity, ROI, follow-up analytics
  getAttributionReport: async (params?: { model?: string; startDate?: string; endDate?: string }) => {
    const response = await api.get('/analytics/attribution', { params })
    return response.data
  },

  getLeadTouchpoints: async (leadId: string, params?: { model?: string }) => {
    const response = await api.get(`/analytics/attribution/touchpoints/${leadId}`, { params })
    return response.data
  },

  getPeriodComparison: async (params?: { startDate?: string; endDate?: string }) => {
    const response = await api.get('/analytics/comparison', { params })
    return response.data
  },

  getLeadVelocity: async (params?: { months?: number }) => {
    const response = await api.get('/analytics/lead-velocity', { params })
    return response.data
  },

  getSourceROI: async (params?: { startDate?: string; endDate?: string }) => {
    const response = await api.get('/analytics/source-roi', { params })
    return response.data
  },

  getFollowUpAnalytics: async (params?: { months?: number }) => {
    const response = await api.get('/analytics/follow-up-analytics', { params })
    return response.data
  },
}

// ============================================================================
// AI API
// ============================================================================

export interface InsightFilter {
  type?: string
  priority?: string
  limit?: number
  status?: 'active' | 'dismissed' | 'acted' | 'all'
  sortBy?: 'newest' | 'priority' | 'impact'
  showDismissed?: boolean
}

export interface RecommendationFilter {
  type?: string
  limit?: number
}

export interface EnhanceMessagePayload {
  message: string
  type?: string
  tone?: string
}

export interface SuggestActionsPayload {
  context?: string
  leadId?: string
  campaignId?: string
}

export interface UploadTrainingDataPayload {
  modelType: string
  data: Record<string, unknown> | unknown[]
}

export interface ScoringConfigData {
  weights?: { engagement?: number; demographic?: number; behavior?: number; timing?: number }
  emailOpenWeight?: number
  emailClickWeight?: number
  emailReplyWeight?: number
  formSubmissionWeight?: number
  propertyInquiryWeight?: number
  scheduledApptWeight?: number
  completedApptWeight?: number
  emailOptOutPenalty?: number
  recencyBonusMax?: number
  frequencyBonusMax?: number
}

export const aiApi = {
  // AI Hub Stats & Overview
  getStats: async () => {
    const response = await api.get('/ai/stats')
    return response.data
  },

  getFeatures: async () => {
    const response = await api.get('/ai/features')
    return response.data
  },

  // Model Performance & Training
  getModelPerformance: async (months?: number) => {
    const response = await api.get('/ai/models/performance', { 
      params: { months } 
    })
    return response.data
  },

  getTrainingModels: async () => {
    const response = await api.get('/ai/models/training')
    return response.data
  },

  uploadTrainingData: async (payload: UploadTrainingDataPayload) => {
    const response = await api.post('/ai/models/training/upload', payload)
    return response.data
  },

  // Data Quality
  getDataQuality: async () => {
    const response = await api.get('/ai/data-quality')
    return response.data
  },

  // Insights & Recommendations
  getInsights: async (params?: InsightFilter) => {
    const response = await api.get('/ai/insights', { params })
    return response.data
  },

  getInsightById: async (id: string) => {
    const response = await api.get(`/ai/insights/${id}`)
    return response.data
  },

  dismissInsight: async (id: string) => {
    const response = await api.post(`/ai/insights/${id}/dismiss`)
    return response.data
  },

  actOnInsight: async (id: string, actionTaken?: string) => {
    const response = await api.post(`/ai/insights/${id}/act`, { actionTaken })
    return response.data
  },

  getRecommendations: async (params?: RecommendationFilter) => {
    const response = await api.get('/ai/recommendations', { params })
    return response.data
  },

  // Lead Scoring
  getLeadScore: async (leadId: string) => {
    const response = await api.get(`/ai/lead-score/${leadId}`)
    return response.data
  },

  getLeadScoreFactors: async (leadId: string) => {
    const response = await api.get(`/ai/lead/${leadId}/score-factors`)
    return response.data
  },

  recalculateScores: async () => {
    const response = await api.post('/ai/recalculate-scores')
    return response.data
  },

  // Model Recalibration
  recalibrateModel: async () => {
    const response = await api.post('/ai/recalibrate')
    return response.data
  },

  getRecalibrationStatus: async () => {
    const response = await api.get('/ai/recalibration-status')
    return response.data
  },

  // Predictions
  getGlobalPredictions: async () => {
    const response = await api.get('/ai/predictions')
    return response.data
  },
  getPredictions: async (leadId: string) => {
    const response = await api.get(`/ai/predictions/${leadId}`)
    return response.data
  },

  // AI Assistant Features
  enhanceMessage: async (payload: EnhanceMessagePayload) => {
    const response = await api.post('/ai/enhance-message', payload)
    return response.data
  },

  composeEmail: async (payload: { leadName?: string; leadEmail?: string; tone?: string; purpose?: string; context?: string }) => {
    const response = await api.post('/ai/compose', payload)
    return response.data
  },

  generateSMS: async (payload: { leadName?: string; leadPhone?: string; tone?: string; purpose?: string; context?: string }) => {
    const response = await api.post('/ai/generate/sms', payload)
    return response.data
  },

  suggestActions: async (payload: SuggestActionsPayload) => {
    const response = await api.post('/ai/suggest-actions', payload)
    return response.data
  },

  // Feature Importance
  getFeatureImportance: async (modelType?: string) => {
    const response = await api.get('/ai/feature-importance', {
      params: { modelType }
    })
    return response.data
  },

  // Scoring Configuration
  getScoringConfig: async () => {
    const response = await api.get('/ai/scoring-config')
    return response.data
  },

  updateScoringConfig: async (config: ScoringConfigData) => {
    const response = await api.put('/ai/scoring-config', config)
    return response.data
  },

  resetScoringConfig: async () => {
    const response = await api.post('/ai/scoring-config/reset')
    return response.data
  },

  // AI Preferences (Settings page)
  getPreferences: async () => {
    const response = await api.get('/ai/preferences')
    return response.data
  },

  savePreferences: async (preferences: Record<string, unknown>) => {
    const response = await api.post('/ai/preferences', preferences)
    return response.data
  },

  resetPreferences: async () => {
    const response = await api.post('/ai/preferences/reset')
    return response.data
  },

  // AI Usage
  getUsage: async () => {
    const response = await api.get('/ai/usage')
    return response.data
  },

  getUsageLimits: async () => {
    const response = await api.get('/ai/usage/limits')
    return response.data
  },

  // Phase 7: Org-Level AI Settings
  getOrgSettings: async () => {
    const response = await api.get('/ai/org-settings')
    return response.data
  },

  updateOrgSettings: async (settings: Record<string, unknown>) => {
    const response = await api.put('/ai/org-settings', settings)
    return response.data
  },

  getAvailableModels: async () => {
    const response = await api.get('/ai/available-models')
    return response.data
  },

  // Phase 7: Cost Dashboard
  getCostDashboard: async (months?: number) => {
    const response = await api.get('/ai/cost-dashboard', { params: { months } })
    return response.data
  },

  // Phase 7: Feedback
  submitChatFeedback: async (messageId: string, payload: { feedback: 'positive' | 'negative'; note?: string }) => {
    const response = await api.post(`/ai/chat/${messageId}/feedback`, payload)
    return response.data
  },

  submitInsightFeedback: async (insightId: string, payload: { feedback: 'helpful' | 'not_helpful' }) => {
    const response = await api.post(`/ai/insights/${insightId}/feedback`, payload)
    return response.data
  },

  getFeedbackStats: async () => {
    const response = await api.get('/ai/feedback/stats')
    return response.data
  },

  // Phase 7: Lead Enrichment
  enrichLead: async (leadId: string) => {
    const response = await api.post(`/ai/enrich/${leadId}`)
    return response.data
  },

  applyEnrichment: async (leadId: string, fields: Record<string, unknown>) => {
    const response = await api.post(`/ai/enrich/${leadId}/apply`, { fields })
    return response.data
  },

  // Phase 7: Budget Settings
  getBudgetSettings: async () => {
    const response = await api.get('/ai/budget-settings')
    return response.data
  },

  updateBudgetSettings: async (settings: { warning?: number; caution?: number; hardLimit?: number; alertEnabled?: boolean }) => {
    const response = await api.put('/ai/budget-settings', settings)
    return response.data
  },
}

// Calls API — manual call logging
export const callsApi = {
  logCall: async (data: {
    leadId: string
    phoneNumber: string
    direction: 'INBOUND' | 'OUTBOUND'
    outcome: string
    duration?: number
    notes?: string
    followUpDate?: string
  }) => {
    const response = await api.post('/calls', data)
    return response.data
  },

  getCalls: async (params?: {
    leadId?: string
    direction?: string
    outcome?: string
    limit?: number
    offset?: number
  }) => {
    const response = await api.get('/calls', { params })
    return response.data
  },

  getCall: async (id: string) => {
    const response = await api.get(`/calls/${id}`)
    return response.data
  },

  updateCall: async (id: string, data: {
    outcome?: string
    duration?: number
    notes?: string
    followUpDate?: string | null
    status?: string
  }) => {
    const response = await api.patch(`/calls/${id}`, data)
    return response.data
  },

  deleteCall: async (id: string) => {
    const response = await api.delete(`/calls/${id}`)
    return response.data
  },

  getStats: async (params?: { leadId?: string }) => {
    const response = await api.get('/calls/stats', { params })
    return response.data
  },

  getQueue: async (params?: { limit?: number }) => {
    const response = await api.get('/calls/queue', { params })
    return response.data
  },

  getTodayStats: async () => {
    const response = await api.get('/calls/today-stats')
    return response.data
  },
}

// Messages & Communication API
export const messagesApi = {
  getMessages: async (params?: Record<string, unknown>) => {
    const response = await api.get('/messages', { params })
    return response.data
  },

  getMessage: async (id: string) => {
    const response = await api.get(`/messages/${id}`)
    return response.data
  },

  sendEmail: async (data: Record<string, unknown>) => {
    const response = await api.post('/messages/email', data)
    return response.data
  },

  sendSMS: async (data: Record<string, unknown>) => {
    const response = await api.post('/messages/sms', data)
    return response.data
  },

  makeCall: async (data: Record<string, unknown>) => {
    const response = await api.post('/messages/call', data)
    return response.data
  },

  markAsRead: async (data: { messageIds: string[] }) => {
    const response = await api.post('/messages/mark-read', data)
    return response.data
  },

  markAsUnread: async (data: { messageIds: string[] }) => {
    const response = await api.post('/messages/mark-unread', data)
    return response.data
  },

  markAllAsRead: async () => {
    const response = await api.post('/messages/mark-all-read')
    return response.data
  },

  markSingleAsRead: async (id: string) => {
    const response = await api.patch(`/messages/${id}/read`)
    return response.data
  },

  markSingleAsUnread: async (id: string) => {
    const response = await api.patch(`/messages/${id}/unread`)
    return response.data
  },

  deleteMessage: async (id: string) => {
    const response = await api.delete(`/messages/${id}`)
    return response.data
  },

  starMessage: async (id: string, starred: boolean) => {
    const response = await api.patch(`/messages/${id}/star`, { starred })
    return response.data
  },

  archiveMessage: async (id: string, archived: boolean) => {
    const response = await api.patch(`/messages/${id}/archive`, { archived })
    return response.data
  },

  snoozeMessage: async (id: string, snoozedUntil: string | null) => {
    const response = await api.patch(`/messages/${id}/snooze`, { snoozedUntil })
    return response.data
  },

  // Batch operations (#39)
  batchStar: async (messageIds: string[], starred: boolean) => {
    const response = await api.post('/messages/batch-star', { messageIds, starred })
    return response.data
  },

  batchArchive: async (messageIds: string[], archived: boolean) => {
    const response = await api.post('/messages/batch-archive', { messageIds, archived })
    return response.data
  },

  batchDelete: async (messageIds: string[]) => {
    const response = await api.post('/messages/batch-delete', { messageIds })
    return response.data
  },

  getStats: async (params?: { leadId?: string; type?: string }) => {
    const response = await api.get('/messages/stats', { params: params || {} })
    return response.data
  },

  uploadAttachment: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/messages/attachments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}

// Templates API
export const templatesApi = {
  // Email Templates (dedicated endpoints)
  getEmailTemplates: async (params?: Record<string, unknown>) => {
    const response = await api.get('/email-templates', { params })
    return response.data
  },

  getEmailTemplate: async (id: string) => {
    const response = await api.get(`/email-templates/${id}`)
    return response.data
  },

  createEmailTemplate: async (data: Record<string, unknown>) => {
    const response = await api.post('/email-templates', data)
    return response.data
  },

  updateEmailTemplate: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/email-templates/${id}`, data)
    return response.data
  },

  deleteEmailTemplate: async (id: string) => {
    const response = await api.delete(`/email-templates/${id}`)
    return response.data
  },

  duplicateEmailTemplate: async (id: string) => {
    const response = await api.post(`/email-templates/${id}/duplicate`)
    return response.data
  },

  // SMS Templates (dedicated endpoints)
  getSMSTemplates: async (params?: Record<string, unknown>) => {
    const response = await api.get('/sms-templates', { params })
    return response.data
  },

  getSMSTemplate: async (id: string) => {
    const response = await api.get(`/sms-templates/${id}`)
    return response.data
  },

  createSMSTemplate: async (data: Record<string, unknown>) => {
    const response = await api.post('/sms-templates', data)
    return response.data
  },

  updateSMSTemplate: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/sms-templates/${id}`, data)
    return response.data
  },

  deleteSMSTemplate: async (id: string) => {
    const response = await api.delete(`/sms-templates/${id}`)
    return response.data
  },

}

// Message Templates API (inbox templates + quick replies)
export const messageTemplatesApi = {
  getTemplates: async (params?: { category?: string; isQuickReply?: string; tier?: string }) => {
    const response = await api.get('/message-templates', { params })
    return response.data
  },
  getCategories: async () => {
    const response = await api.get('/message-templates/categories')
    return response.data
  },
  create: async (data: { name: string; content: string; category?: string; tier?: string; isQuickReply?: boolean; variables?: Record<string, string>; teamId?: string }) => {
    const response = await api.post('/message-templates', data)
    return response.data
  },
  update: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/message-templates/${id}`, data)
    return response.data
  },
  delete: async (id: string) => {
    const response = await api.delete(`/message-templates/${id}`)
    return response.data
  },
  seedDefaults: async () => {
    const response = await api.post('/message-templates/seed-defaults')
    return response.data
  },
}

// Workflows API
export const workflowsApi = {
  getWorkflows: async (params?: Record<string, unknown>) => {
    const response = await api.get('/workflows', { params })
    return response.data
  },

  getWorkflow: async (id: string) => {
    const response = await api.get(`/workflows/${id}`)
    return response.data
  },

  createWorkflow: async (data: Record<string, unknown>) => {
    const response = await api.post('/workflows', data)
    return response.data
  },

  updateWorkflow: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/workflows/${id}`, data)
    return response.data
  },

  deleteWorkflow: async (id: string) => {
    const response = await api.delete(`/workflows/${id}`)
    return response.data
  },

  toggleWorkflow: async (id: string, isActive: boolean) => {
    const response = await api.patch(`/workflows/${id}/toggle`, { isActive })
    return response.data
  },

  testWorkflow: async (id: string, testData?: Record<string, unknown>) => {
    const response = await api.post(`/workflows/${id}/test`, { testData })
    return response.data
  },

  getExecutions: async (workflowId: string, params?: Record<string, unknown>) => {
    const response = await api.get(`/workflows/${workflowId}/executions`, { params })
    return response.data
  },

  getStats: async () => {
    const response = await api.get('/workflows/stats')
    return response.data
  },

  getAnalytics: async (id: string, days?: number) => {
    const response = await api.get(`/workflows/${id}/analytics`, { 
      params: { days } 
    })
    return response.data
  },

  triggerWorkflow: async (id: string, leadId: string) => {
    const response = await api.post(`/workflows/${id}/trigger`, { leadId })
    return response.data
  },
}

// Settings API
export const settingsApi = {
  // Profile
  getProfile: async () => {
    const response = await api.get('/settings/profile')
    return response.data
  },

  updateProfile: async (data: Record<string, unknown>) => {
    const response = await api.put('/settings/profile', data)
    return response.data
  },

  uploadAvatar: async (file: File) => {
    const formData = new FormData()
    formData.append('avatar', file)
    const response = await api.post('/settings/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  changePassword: async (data: Record<string, unknown>) => {
    const response = await api.put('/settings/password', data)
    return response.data
  },

  // Business Settings
  getBusinessSettings: async () => {
    const response = await api.get('/settings/business')
    return response.data
  },

  updateBusinessSettings: async (data: Record<string, unknown>) => {
    const response = await api.put('/settings/business', data)
    return response.data
  },

  uploadLogo: async (file: File) => {
    const formData = new FormData()
    formData.append('logo', file)
    const response = await api.post('/settings/business/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  // Email Configuration
  getEmailConfig: async () => {
    const response = await api.get('/settings/email')
    return response.data.data // Unwrap { success, data: { config } }
  },

  updateEmailConfig: async (data: Record<string, unknown>) => {
    const response = await api.put('/settings/email', data)
    return response.data.data
  },

  testEmail: async (data: Record<string, unknown>) => {
    const response = await api.post('/settings/email/test', data)
    return response.data.data
  },

  // SMS Configuration
  getSMSConfig: async () => {
    const response = await api.get('/settings/sms')
    return response.data.data // Unwrap { success, data: { config } }
  },

  updateSMSConfig: async (data: Record<string, unknown>) => {
    const response = await api.put('/settings/sms', data)
    return response.data.data
  },

  deleteSMSConfig: async () => {
    const response = await api.delete('/settings/sms')
    return response.data.data
  },

  testSMS: async (data: Record<string, unknown>) => {
    const response = await api.post('/settings/sms/test', data)
    return response.data.data
  },

  // Notification Settings
  getNotificationSettings: async () => {
    const response = await api.get('/settings/notifications')
    return response.data
  },

  updateNotificationSettings: async (data: Record<string, unknown>) => {
    const response = await api.put('/settings/notifications', data)
    return response.data
  },

  // Security Settings
  getSecuritySettings: async () => {
    const response = await api.get('/settings/security')
    return response.data
  },

  enable2FA: async (data: Record<string, unknown>) => {
    const response = await api.post('/settings/2fa/enable', data)
    return response.data
  },

  disable2FA: async (data: Record<string, unknown>) => {
    const response = await api.post('/settings/2fa/disable', data)
    return response.data
  },

  verify2FA: async (data: Record<string, unknown>) => {
    const response = await api.post('/settings/2fa/verify', data)
    return response.data
  },

  // Integrations
  getIntegrations: async () => {
    const response = await api.get('/integrations')
    return response.data
  },

  connectIntegration: async (provider: string, data: Record<string, unknown>) => {
    const response = await api.post(`/integrations/${provider}/connect`, data)
    return response.data
  },

  disconnectIntegration: async (provider: string) => {
    const response = await api.post(`/integrations/${provider}/disconnect`)
    return response.data
  },

  getIntegrationStatus: async (provider: string) => {
    const response = await api.get(`/integrations/${provider}/status`)
    return response.data
  },

  updateIntegrationSettings: async (provider: string, data: Record<string, unknown>) => {
    const response = await api.put(`/integrations/${provider}/settings`, data)
    return response.data
  },

  updateServiceConfig: async (service: string, data: Record<string, unknown>) => {
    const response = await api.put(`/settings/services/${service}`, data)
    return response.data
  },

  testServiceConnection: async (service: string, data?: Record<string, unknown>) => {
    const response = await api.post(`/settings/services/${service}/test`, data || {})
    return response.data
  },

  syncIntegration: async (provider: string) => {
    const response = await api.post(`/integrations/${provider}/sync`)
    return response.data
  },
}

// Team Management API
export const teamsApi = {
  getTeams: async (params?: Record<string, unknown>) => {
    const response = await api.get('/teams', { params })
    return response.data
  },

  getTeam: async (id: string) => {
    const response = await api.get(`/teams/${id}`)
    return response.data
  },

  createTeam: async (data: Record<string, unknown>) => {
    const response = await api.post('/teams', data)
    return response.data
  },

  updateTeam: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/teams/${id}`, data)
    return response.data
  },

  deleteTeam: async (id: string) => {
    const response = await api.delete(`/teams/${id}`)
    return response.data
  },

  getMembers: async (teamId: string, params?: Record<string, unknown>) => {
    const response = await api.get(`/teams/${teamId}/members`, { params })
    return response.data
  },

  inviteMember: async (teamId: string, data: Record<string, unknown>) => {
    const response = await api.post(`/teams/${teamId}/invite`, data)
    return response.data
  },

  removeMember: async (teamId: string, userId: string) => {
    const response = await api.delete(`/teams/${teamId}/members/${userId}`)
    return response.data
  },

  updateMemberRole: async (teamId: string, userId: string, role: string) => {
    const response = await api.patch(`/teams/${teamId}/members/${userId}/role`, { role })
    return response.data
  },
}

// ============================================================================
// APPOINTMENTS API
// ============================================================================

export interface AppointmentsQuery {
  page?: number
  limit?: number
  status?: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  leadId?: string
  startDate?: string
  endDate?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface CreateAppointmentData {
  leadId?: string
  title: string
  description?: string
  type: 'CALL' | 'MEETING' | 'DEMO' | 'CONSULTATION' | 'FOLLOW_UP'
  startTime: string
  endTime: string
  location?: string
  meetingUrl?: string
  notes?: string
  attendees?: {
    email: string
    name: string
    confirmed?: boolean
  }[]
}

export interface UpdateAppointmentData {
  title?: string
  description?: string
  type?: 'CALL' | 'MEETING' | 'DEMO' | 'CONSULTATION' | 'FOLLOW_UP'
  startTime?: string
  endTime?: string
  location?: string
  meetingUrl?: string
  notes?: string
  status?: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
  attendees?: {
    email: string
    name: string
    confirmed?: boolean
  }[]
}

export interface CalendarQuery {
  startDate: string
  endDate: string
  leadId?: string
}

export interface UpcomingQuery {
  days?: number
  limit?: number
}

export interface SendReminderData {
  method: 'email' | 'sms' | 'both'
  customMessage?: string
}

export const appointmentsApi = {
  getAppointments: async (params?: AppointmentsQuery) => {
    const response = await api.get('/appointments', { params })
    return response.data
  },

  getAppointment: async (id: string) => {
    const response = await api.get(`/appointments/${id}`)
    return response.data
  },

  createAppointment: async (data: CreateAppointmentData) => {
    const response = await api.post('/appointments', data)
    return response.data
  },

  updateAppointment: async (id: string, data: UpdateAppointmentData) => {
    const response = await api.put(`/appointments/${id}`, data)
    return response.data
  },

  cancelAppointment: async (id: string) => {
    const response = await api.delete(`/appointments/${id}`)
    return response.data
  },

  confirmAppointment: async (id: string) => {
    const response = await api.patch(`/appointments/${id}/confirm`)
    return response.data
  },

  sendReminder: async (id: string, data: SendReminderData) => {
    const response = await api.post(`/appointments/${id}/reminder`, data)
    return response.data
  },

  getCalendar: async (params: CalendarQuery) => {
    const response = await api.get('/appointments/calendar', { params })
    return response.data
  },

  getUpcoming: async (params?: UpcomingQuery) => {
    const response = await api.get('/appointments/upcoming', { params })
    return response.data
  },

  exportICS: async (id: string) => {
    const response = await api.get(`/appointments/${id}/ics`, { responseType: 'blob' })
    return response.data
  },
}

// ============================================================================
// NOTIFICATIONS API
// ============================================================================

export interface Notification {
  id: string
  userId: string
  organizationId: string
  type: string
  title: string
  message: string
  link?: string
  read: boolean
  createdAt: string
}

export interface NotificationsQuery {
  page?: number
  limit?: number
  read?: boolean
}

export const notificationsApi = {
  getNotifications: async (params?: NotificationsQuery) => {
    const response = await api.get('/notifications', { params })
    return response.data
  },

  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count')
    return response.data
  },

  markAsRead: async (id: string) => {
    const response = await api.patch(`/notifications/${id}/read`)
    return response.data
  },

  markAllAsRead: async () => {
    const response = await api.patch('/notifications/mark-all-read')
    return response.data
  },

  deleteNotification: async (id: string) => {
    const response = await api.delete(`/notifications/${id}`)
    return response.data
  },

  createNotification: async (data: {
    type: string
    title: string
    message: string
    link?: string
    userId?: string
  }) => {
    const response = await api.post('/notifications', data)
    return response.data
  },
}

// ============================================================================
// USERS API
// ============================================================================

export const usersApi = {
  getUsers: async (params?: { page?: number; limit?: number; search?: string }) => {
    const response = await api.get('/users', { params })
    return response.data
  },

  getTeamMembers: async () => {
    const response = await api.get('/users')
    return response.data?.data?.users || response.data?.users || []
  },
}

// ============================================================================
// ADMIN API
// ============================================================================

export const adminApi = {
  // System Settings
  getSystemSettings: async () => {
    const response = await api.get('/admin/system-settings')
    return response.data
  },

  updateSystemSettings: async (data: Record<string, unknown>) => {
    const response = await api.put('/admin/system-settings', data)
    return response.data
  },

  // Health Check
  healthCheck: async () => {
    const response = await api.get('/admin/health')
    return response.data
  },

  // Database Maintenance
  runMaintenance: async (operation: string, options?: Record<string, unknown>) => {
    const response = await api.post('/admin/maintenance', { operation, ...options })
    return response.data
  },

  // Database Stats (real PostgreSQL stats)
  getDbStats: async () => {
    const response = await api.post('/admin/maintenance', { operation: 'db_stats' })
    return response.data
  },

  // Backup download
  downloadBackup: async (backupId: string) => {
    const response = await api.get(`/admin/backups/${backupId}/download`, { responseType: 'blob' })
    return response.data
  },

  // Admin Stats (existing)
  getStats: async () => {
    const response = await api.get('/admin/stats')
    return response.data
  },

  // Audit Logs
  getAuditLogs: async (params?: { userId?: string; action?: string; entityType?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) => {
    const response = await api.get('/admin/audit-logs', { params })
    return response.data
  },

  getAuditActions: async () => {
    const response = await api.get('/admin/audit-logs/actions')
    return response.data
  },
}

// ============================================================================
// BILLING API
// ============================================================================

export const billingApi = {
  getSubscription: async () => {
    const response = await api.get('/billing/subscription')
    return response.data
  },

  createCheckoutSession: async (planId: string) => {
    const response = await api.post('/billing/checkout', { planId })
    return response.data
  },

  getBillingPortal: async () => {
    const response = await api.post('/billing/portal')
    return response.data
  },

  getInvoices: async () => {
    const response = await api.get('/billing/invoices')
    return response.data
  },

  getPaymentMethods: async () => {
    const response = await api.get('/billing/payment-methods')
    return response.data
  },
}

// Export the axios instance as default for backward compatibility

// ============================================================================
// SEGMENTS API
// ============================================================================

export const segmentsApi = {
  getSegments: async () => {
    const response = await api.get('/segments')
    return response.data
  },

  getSegment: async (id: string) => {
    const response = await api.get(`/segments/${id}`)
    return response.data
  },

  createSegment: async (data: { name: string; description?: string; rules: Array<Record<string, unknown> | { field: string; operator: string; value: string }>; matchType?: string; color?: string }) => {
    const response = await api.post('/segments', data)
    return response.data
  },

  updateSegment: async (id: string, data: Partial<{ name: string; description?: string; rules: Array<Record<string, unknown> | { field: string; operator: string; value: string }>; matchType?: string; color?: string; isActive?: boolean }>) => {
    const response = await api.patch(`/segments/${id}`, data)
    return response.data
  },

  deleteSegment: async (id: string) => {
    const response = await api.delete(`/segments/${id}`)
    return response.data
  },

  getSegmentMembers: async (id: string, params?: { page?: number; limit?: number }) => {
    const response = await api.get(`/segments/${id}/members`, { params })
    return response.data
  },

  refreshCounts: async () => {
    const response = await api.post('/segments/refresh')
    return response.data
  },
}

// ============================================================================
// EXPORT API — Server-side export for large datasets (Phase 8.8)
// ============================================================================

export const exportApi = {
  /**
   * Download server-generated export file
   * @param type - 'leads' | 'campaigns' | 'activities'
   * @param format - 'xlsx' | 'csv'
   * @param filters - optional query filters
   */
  download: async (
    type: 'leads' | 'campaigns' | 'activities',
    format: 'xlsx' | 'csv' = 'xlsx',
    filters?: {
      status?: string;
      source?: string;
      assignedTo?: string;
      dateFrom?: string;
      dateTo?: string;
      fields?: string[];
    }
  ) => {
    const params: Record<string, unknown> = { format };
    if (filters?.status) params.status = filters.status;
    if (filters?.source) params.source = filters.source;
    if (filters?.assignedTo) params.assignedTo = filters.assignedTo;
    if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters?.dateTo) params.dateTo = filters.dateTo;
    if (filters?.fields) params.fields = filters.fields.join(',');

    const response = await api.get(`/export/${type}`, {
      params,
      responseType: 'blob',
    });

    // Trigger browser download
    const blob = new Blob([response.data], {
      type: format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    a.download = `${type}_export_${timestamp}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    return { success: true, records: 0 }; // record count not known from blob
  },
}

export const savedReportsApi = {
  list: async () => {
    const response = await api.get('/reports/saved');
    return response.data;
  },
  get: async (id: string) => {
    const response = await api.get(`/reports/saved/${id}`);
    return response.data;
  },
  create: async (data: { name: string; description?: string; type?: string; config: Record<string, unknown> }) => {
    const response = await api.post('/reports/saved', data);
    return response.data;
  },
  update: async (id: string, data: { name?: string; description?: string; type?: string; config?: Record<string, unknown> }) => {
    const response = await api.put(`/reports/saved/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/reports/saved/${id}`);
    return response.data;
  },
}

export interface PipelineStage {
  id: string
  name: string
  order: number
  color?: string
  description?: string
  isWinStage: boolean
  isLostStage: boolean
  pipelineId: string
}

export interface PipelineData {
  id: string
  name: string
  type: 'DEFAULT' | 'BUYER' | 'SELLER' | 'RENTAL' | 'COMMERCIAL' | 'CUSTOM'
  description?: string
  isDefault: boolean
  stages: PipelineStage[]
  _count?: { leads: number }
}

export const pipelinesApi = {
  getPipelines: async (): Promise<{ success: boolean; data: PipelineData[] }> => {
    const response = await api.get('/pipelines')
    return response.data
  },
  getPipeline: async (id: string): Promise<{ success: boolean; data: PipelineData }> => {
    const response = await api.get(`/pipelines/${id}`)
    return response.data
  },
  createPipeline: async (data: {
    name: string
    type?: string
    description?: string
    stages?: Array<{ name: string; color?: string; isWinStage?: boolean; isLostStage?: boolean }>
  }): Promise<{ success: boolean; data: PipelineData }> => {
    const response = await api.post('/pipelines', data)
    return response.data
  },
  updatePipeline: async (id: string, data: {
    name?: string
    description?: string
    isDefault?: boolean
  }): Promise<{ success: boolean; data: PipelineData }> => {
    const response = await api.put(`/pipelines/${id}`, data)
    return response.data
  },
  deletePipeline: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/pipelines/${id}`)
    return response.data
  },
  duplicatePipeline: async (id: string, name?: string): Promise<{ success: boolean; data: PipelineData }> => {
    const response = await api.post(`/pipelines/${id}/duplicate`, { name })
    return response.data
  },
  getPipelineLeads: async (id: string) => {
    const response = await api.get(`/pipelines/${id}/leads`)
    return response.data
  },
  moveLeadToStage: async (leadId: string, data: { pipelineId?: string; pipelineStageId: string }) => {
    const response = await api.patch(`/pipelines/leads/${leadId}/move`, data)
    return response.data
  },
  // Stage CRUD
  createStage: async (pipelineId: string, data: {
    name: string
    color?: string
    description?: string
    isWinStage?: boolean
    isLostStage?: boolean
    insertAfterOrder?: number
  }): Promise<{ success: boolean; data: PipelineStage }> => {
    const response = await api.post(`/pipelines/${pipelineId}/stages`, data)
    return response.data
  },
  updateStage: async (pipelineId: string, stageId: string, data: {
    name?: string
    color?: string
    description?: string
    isWinStage?: boolean
    isLostStage?: boolean
  }): Promise<{ success: boolean; data: PipelineStage }> => {
    const response = await api.put(`/pipelines/${pipelineId}/stages/${stageId}`, data)
    return response.data
  },
  deleteStage: async (pipelineId: string, stageId: string, moveLeadsToStageId?: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/pipelines/${pipelineId}/stages/${stageId}`, {
      data: { moveLeadsToStageId },
    })
    return response.data
  },
  reorderStages: async (pipelineId: string, stageIds: string[]): Promise<{ success: boolean; data: PipelineStage[] }> => {
    const response = await api.patch(`/pipelines/${pipelineId}/stages/reorder`, { stageIds })
    return response.data
  },
}

export interface SavedFilterView {
  id: string
  name: string
  icon?: string
  color?: string
  filterConfig: {
    status?: string[]
    source?: string[]
    scoreRange?: [number, number]
    dateRange?: { from: string; to: string }
    tags?: string[]
    assignedTo?: string[]
  }
  scoreFilter: string
  sortField?: string
  sortDirection?: string
  isDefault: boolean
  isShared: boolean
  createdAt: string
  updatedAt: string
}

export const savedFiltersApi = {
  list: async (): Promise<{ success: boolean; data: SavedFilterView[] }> => {
    const response = await api.get('/saved-filters')
    return response.data
  },
  create: async (data: Omit<SavedFilterView, 'id' | 'createdAt' | 'updatedAt'>) => {
    const response = await api.post('/saved-filters', data)
    return response.data
  },
  update: async (id: string, data: Partial<Omit<SavedFilterView, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const response = await api.patch(`/saved-filters/${id}`, data)
    return response.data
  },
  delete: async (id: string) => {
    const response = await api.delete(`/saved-filters/${id}`)
    return response.data
  },
}

// ============================================================================
// FOLLOW-UP REMINDERS API
// ============================================================================

export interface FollowUpReminder {
  id: string
  leadId: string
  userId: string
  organizationId: string
  title: string
  note?: string
  dueAt: string
  status: 'PENDING' | 'FIRED' | 'COMPLETED' | 'SNOOZED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  channelInApp: boolean
  channelEmail: boolean
  channelSms: boolean
  channelPush: boolean
  firedAt?: string
  completedAt?: string
  snoozedUntil?: string
  isRecurring?: boolean
  recurrencePattern?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM'
  recurrenceInterval?: number
  recurrenceEndDate?: string
  recurrenceCount?: number
  occurrenceNumber?: number
  parentReminderId?: string
  createdAt: string
  updatedAt: string
  lead?: {
    id: string
    firstName: string
    lastName: string
    email?: string
    phone?: string
    company?: string
  }
}

export interface CreateReminderData {
  leadId: string
  title: string
  note?: string
  dueAt: string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  channelInApp?: boolean
  channelEmail?: boolean
  channelSms?: boolean
  channelPush?: boolean
  isRecurring?: boolean
  recurrencePattern?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM'
  recurrenceInterval?: number
  recurrenceEndDate?: string
  recurrenceCount?: number
}

export const remindersApi = {
  getReminders: async (params?: { leadId?: string; status?: string; page?: number; limit?: number }) => {
    const response = await api.get('/reminders', { params })
    return response.data
  },

  getUpcoming: async () => {
    const response = await api.get('/reminders/upcoming')
    return response.data
  },

  getReminder: async (id: string) => {
    const response = await api.get(`/reminders/${id}`)
    return response.data
  },

  createReminder: async (data: CreateReminderData) => {
    const response = await api.post('/reminders', data)
    return response.data
  },

  updateReminder: async (id: string, data: Partial<CreateReminderData>) => {
    const response = await api.patch(`/reminders/${id}`, data)
    return response.data
  },

  completeReminder: async (id: string) => {
    const response = await api.patch(`/reminders/${id}/complete`)
    return response.data
  },

  snoozeReminder: async (id: string, snoozedUntil: string) => {
    const response = await api.patch(`/reminders/${id}/snooze`, { snoozedUntil })
    return response.data
  },

  deleteReminder: async (id: string) => {
    const response = await api.delete(`/reminders/${id}`)
    return response.data
  },
}

// ============================================================================
// Report Schedules API (Phase 5.3)
// ============================================================================
export const reportSchedulesApi = {
  list: async () => {
    const response = await api.get('/report-schedules')
    return response.data
  },
  create: async (data: {
    savedReportId: string
    frequency: string
    customInterval?: number
    dayOfWeek?: number
    dayOfMonth?: number
    timeOfDay?: string
    timezone?: string
    recipients?: string[]
  }) => {
    const response = await api.post('/report-schedules', data)
    return response.data
  },
  update: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch(`/report-schedules/${id}`, data)
    return response.data
  },
  delete: async (id: string) => {
    const response = await api.delete(`/report-schedules/${id}`)
    return response.data
  },
  getHistory: async (id: string, params?: { page?: number; limit?: number }) => {
    const response = await api.get(`/report-schedules/${id}/history`, { params })
    return response.data
  },
}

// ============================================================================
// Goals API (Phase 5.4)
// ============================================================================
export const goalsApi = {
  list: async (params?: { active?: string }) => {
    const response = await api.get('/goals', { params })
    return response.data
  },
  get: async (id: string) => {
    const response = await api.get(`/goals/${id}`)
    return response.data
  },
  create: async (data: {
    name: string
    metricType: string
    targetValue: number
    startDate: string
    endDate: string
    period?: string
    notes?: string
  }) => {
    const response = await api.post('/goals', data)
    return response.data
  },
  update: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch(`/goals/${id}`, data)
    return response.data
  },
  delete: async (id: string) => {
    const response = await api.delete(`/goals/${id}`)
    return response.data
  },
}

// ============================================================================
// Support Tickets API (Phase 9.7b)
// ============================================================================
export const supportApi = {
  list: async (params?: { status?: string; priority?: string; category?: string; search?: string; page?: number; limit?: number }) => {
    const response = await api.get('/support-tickets', { params })
    return response.data
  },
  get: async (id: string) => {
    const response = await api.get(`/support-tickets/${id}`)
    return response.data
  },
  getStats: async () => {
    const response = await api.get('/support-tickets/stats')
    return response.data
  },
  create: async (data: { subject: string; description: string; category?: string; priority?: string }) => {
    const response = await api.post('/support-tickets', data)
    return response.data
  },
  addMessage: async (ticketId: string, content: string) => {
    const response = await api.post(`/support-tickets/${ticketId}/messages`, { content })
    return response.data
  },
  updateStatus: async (ticketId: string, status: string) => {
    const response = await api.patch(`/support-tickets/${ticketId}/status`, { status })
    return response.data
  },
  assign: async (ticketId: string, assignedToId: string | null) => {
    const response = await api.patch(`/support-tickets/${ticketId}/assign`, { assignedToId })
    return response.data
  },
}

// ============================================================================
// Documentation API (Phase 9.7d)
// ============================================================================
export const docsApi = {
  list: async (params?: { category?: string; search?: string; page?: number; limit?: number }) => {
    const response = await api.get('/docs', { params })
    return response.data
  },
  getCategories: async () => {
    const response = await api.get('/docs/categories')
    return response.data
  },
  getBySlug: async (slug: string) => {
    const response = await api.get(`/docs/${slug}`)
    return response.data
  },
}

export default api
