import axios, { AxiosError } from 'axios'
import type { User } from '@/types'
import { devApiSuccessInterceptor, devApiErrorInterceptor } from './devErrorMonitor'

// Determine the API base URL
const getApiBaseUrl = () => {
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

        if (!newAccessToken) {
          throw new Error('No access token in refresh response')
        }

        localStorage.setItem('accessToken', newAccessToken)
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
}

export interface LoginData {
  email: string
  password: string
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
  customFields?: Record<string, any>
  tags?: string[]
}

export interface UpdateLeadData extends Partial<CreateLeadData> {
  score?: number
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

  mergeLeads: async (data: { primaryLeadId: string; secondaryLeadId: string }) => {
    const response = await api.post('/leads/merge', {
      primaryLeadId: data.primaryLeadId,
      secondaryLeadIds: [data.secondaryLeadId],
    })
    return response.data
  },

  importLeads: (formData: FormData) => api.post('/leads/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data),
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
  status?: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
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

  sendCampaign: async (id: string, options?: { leadIds?: string[], filters?: any }) => {
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
    const response = await api.get(`/leads/${leadId}/activities`, { params })
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
  status?: 'pending' | 'completed' | 'cancelled'
  priority?: 'low' | 'medium' | 'high'
  assignedTo?: string
  dueDate?: string
}

export interface CreateTaskData {
  title: string
  description?: string
  leadId?: string
  status?: 'pending' | 'completed' | 'cancelled'
  priority?: 'low' | 'medium' | 'high'
  dueDate?: string
  assignedTo?: string
}

export const tasksApi = {
  getTasks: async (params?: TasksQuery) => {
    const response = await api.get('/tasks', { params })
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
}

// ============================================================================
// AI API
// ============================================================================

export interface InsightFilter {
  type?: string
  priority?: string
  limit?: number
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
  data: any
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

  getRecommendations: async (params?: RecommendationFilter) => {
    const response = await api.get('/ai/recommendations', { params })
    return response.data
  },

  // Lead Scoring
  getLeadScore: async (leadId: string) => {
    const response = await api.get(`/ai/lead-score/${leadId}`)
    return response.data
  },

  recalculateScores: async () => {
    const response = await api.post('/ai/recalculate-scores')
    return response.data
  },

  // Predictions
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
}

// Messages & Communication API
export const messagesApi = {
  getMessages: async (params?: any) => {
    const response = await api.get('/messages', { params })
    return response.data
  },

  getMessage: async (id: string) => {
    const response = await api.get(`/messages/${id}`)
    return response.data
  },

  sendEmail: async (data: any) => {
    const response = await api.post('/messages/email', data)
    return response.data
  },

  sendSMS: async (data: any) => {
    const response = await api.post('/messages/sms', data)
    return response.data
  },

  makeCall: async (data: any) => {
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

  getStats: async (params?: { leadId?: string; type?: string }) => {
    const response = await api.get('/messages/stats', { params: params || {} })
    return response.data
  },
}

// Templates API
export const templatesApi = {
  // Email Templates (dedicated endpoints)
  getEmailTemplates: async (params?: any) => {
    const response = await api.get('/email-templates', { params })
    return response.data
  },

  getEmailTemplate: async (id: string) => {
    const response = await api.get(`/email-templates/${id}`)
    return response.data
  },

  createEmailTemplate: async (data: any) => {
    const response = await api.post('/email-templates', data)
    return response.data
  },

  updateEmailTemplate: async (id: string, data: any) => {
    const response = await api.put(`/email-templates/${id}`, data)
    return response.data
  },

  deleteEmailTemplate: async (id: string) => {
    const response = await api.delete(`/email-templates/${id}`)
    return response.data
  },

  // SMS Templates (dedicated endpoints)
  getSMSTemplates: async (params?: any) => {
    const response = await api.get('/sms-templates', { params })
    return response.data
  },

  getSMSTemplate: async (id: string) => {
    const response = await api.get(`/sms-templates/${id}`)
    return response.data
  },

  createSMSTemplate: async (data: any) => {
    const response = await api.post('/sms-templates', data)
    return response.data
  },

  updateSMSTemplate: async (id: string, data: any) => {
    const response = await api.put(`/sms-templates/${id}`, data)
    return response.data
  },

  deleteSMSTemplate: async (id: string) => {
    const response = await api.delete(`/sms-templates/${id}`)
    return response.data
  },

}

// Workflows API
export const workflowsApi = {
  getWorkflows: async (params?: any) => {
    const response = await api.get('/workflows', { params })
    return response.data
  },

  getWorkflow: async (id: string) => {
    const response = await api.get(`/workflows/${id}`)
    return response.data
  },

  createWorkflow: async (data: any) => {
    const response = await api.post('/workflows', data)
    return response.data
  },

  updateWorkflow: async (id: string, data: any) => {
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

  testWorkflow: async (id: string, testData?: any) => {
    const response = await api.post(`/workflows/${id}/test`, { testData })
    return response.data
  },

  getExecutions: async (workflowId: string, params?: any) => {
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

  updateProfile: async (data: any) => {
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

  changePassword: async (data: any) => {
    const response = await api.put('/settings/password', data)
    return response.data
  },

  // Business Settings
  getBusinessSettings: async () => {
    const response = await api.get('/settings/business')
    return response.data
  },

  updateBusinessSettings: async (data: any) => {
    const response = await api.put('/settings/business', data)
    return response.data
  },

  // Email Configuration
  getEmailConfig: async () => {
    const response = await api.get('/settings/email')
    return response.data.data // Unwrap { success, data: { config } }
  },

  updateEmailConfig: async (data: any) => {
    const response = await api.put('/settings/email', data)
    return response.data.data
  },

  testEmail: async (data: any) => {
    const response = await api.post('/settings/email/test', data)
    return response.data.data
  },

  // SMS Configuration
  getSMSConfig: async () => {
    const response = await api.get('/settings/sms')
    return response.data.data // Unwrap { success, data: { config } }
  },

  updateSMSConfig: async (data: any) => {
    const response = await api.put('/settings/sms', data)
    return response.data.data
  },

  deleteSMSConfig: async () => {
    const response = await api.delete('/settings/sms')
    return response.data.data
  },

  testSMS: async (data: any) => {
    const response = await api.post('/settings/sms/test', data)
    return response.data.data
  },

  // Notification Settings
  getNotificationSettings: async () => {
    const response = await api.get('/settings/notifications')
    return response.data
  },

  updateNotificationSettings: async (data: any) => {
    const response = await api.put('/settings/notifications', data)
    return response.data
  },

  // Security Settings
  getSecuritySettings: async () => {
    const response = await api.get('/settings/security')
    return response.data
  },

  enable2FA: async (data: any) => {
    const response = await api.post('/settings/2fa/enable', data)
    return response.data
  },

  disable2FA: async (data: any) => {
    const response = await api.post('/settings/2fa/disable', data)
    return response.data
  },

  verify2FA: async (data: any) => {
    const response = await api.post('/settings/2fa/verify', data)
    return response.data
  },

  // Integrations
  getIntegrations: async () => {
    const response = await api.get('/integrations')
    return response.data
  },

  connectIntegration: async (provider: string, data: any) => {
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

  updateIntegrationSettings: async (provider: string, data: any) => {
    const response = await api.put(`/integrations/${provider}/settings`, data)
    return response.data
  },

  updateServiceConfig: async (service: string, data: any) => {
    const response = await api.put(`/settings/services/${service}`, data)
    return response.data
  },

  testServiceConnection: async (service: string, data?: any) => {
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
  getTeams: async (params?: any) => {
    const response = await api.get('/teams', { params })
    return response.data
  },

  getTeam: async (id: string) => {
    const response = await api.get(`/teams/${id}`)
    return response.data
  },

  createTeam: async (data: any) => {
    const response = await api.post('/teams', data)
    return response.data
  },

  updateTeam: async (id: string, data: any) => {
    const response = await api.put(`/teams/${id}`, data)
    return response.data
  },

  deleteTeam: async (id: string) => {
    const response = await api.delete(`/teams/${id}`)
    return response.data
  },

  getMembers: async (teamId: string, params?: any) => {
    const response = await api.get(`/teams/${teamId}/members`, { params })
    return response.data
  },

  inviteMember: async (teamId: string, data: any) => {
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
  leadId: string
  title: string
  description?: string
  type: 'viewing' | 'consultation' | 'inspection' | 'meeting' | 'follow_up' | 'other'
  scheduledAt: string
  duration?: number
  location?: string
  notes?: string
  reminders?: {
    method: 'email' | 'sms'
    minutesBefore: number
  }[]
}

export interface UpdateAppointmentData {
  title?: string
  description?: string
  type?: 'viewing' | 'consultation' | 'inspection' | 'meeting' | 'follow_up' | 'other'
  scheduledAt?: string
  duration?: number
  location?: string
  notes?: string
  status?: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  reminders?: {
    method: 'email' | 'sms'
    minutesBefore: number
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

  updateSystemSettings: async (data: any) => {
    const response = await api.put('/admin/system-settings', data)
    return response.data
  },

  // Health Check
  healthCheck: async () => {
    const response = await api.get('/admin/health')
    return response.data
  },

  // Database Maintenance
  runMaintenance: async (operation: string, options?: any) => {
    const response = await api.post('/admin/maintenance', { operation, ...options })
    return response.data
  },

  // Admin Stats (existing)
  getStats: async () => {
    const response = await api.get('/admin/stats')
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

  createSegment: async (data: { name: string; description?: string; rules: any[]; matchType?: string; color?: string }) => {
    const response = await api.post('/segments', data)
    return response.data
  },

  updateSegment: async (id: string, data: Partial<{ name: string; description?: string; rules: any[]; matchType?: string; color?: string; isActive?: boolean }>) => {
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
    const params: any = { format };
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

export default api
