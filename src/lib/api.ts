import axios, { AxiosError } from 'axios'
import type { Lead, Campaign, Note, Activity, Analytics, User } from '@/types'

// Determine the API base URL
const getApiBaseUrl = () => {
  // Check if we have an environment variable for the API URL
  const envApiUrl = import.meta.env.VITE_API_URL
  if (envApiUrl) {
    console.log('🔧 Using API URL from environment:', envApiUrl)
    return envApiUrl
  }

  // In GitHub Codespaces, detect the backend URL
  if (window.location.hostname.includes('app.github.dev')) {
    // Replace the port 3000 with 8000 for backend
    const backendUrl = window.location.origin.replace('-3000.', '-8000.')
    const apiUrl = `${backendUrl}/api`
    console.log('🔧 Detected Codespaces, using API URL:', apiUrl)
    return apiUrl
  }

  // Default to relative path (works with Vite proxy in local development)
  console.log('🔧 Using relative API URL (Vite proxy): /api')
  return '/api'
}

// Create axios instance
const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
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
  (response) => response,
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
        localStorage.clear()
        window.location.href = '/auth/login'
        return Promise.reject(error)
      }

      try {
        const response = await axios.post('/api/auth/refresh', { refreshToken })
        const { accessToken } = response.data

        localStorage.setItem('accessToken', accessToken)
        processQueue(null, accessToken)

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
        }
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError as Error, null)
        localStorage.clear()
        window.location.href = '/auth/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
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
    await api.post('/auth/logout', { refreshToken })
    localStorage.clear()
  },

  refreshToken: async (refreshToken: string): Promise<{ accessToken: string }> => {
    const response = await api.post('/auth/refresh', { refreshToken })
    return response.data
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me')
    return response.data
  },
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
  name: string
  email: string
  phone?: string
  company?: string
  position?: string
  status?: string
  source?: string
  value?: number
  stage?: string
  assignedToId?: string
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
    const response = await api.patch('/leads/bulk-update', data)
    return response.data
  },

  bulkDelete: async (leadIds: string[]) => {
    const response = await api.post('/leads/bulk-delete', { leadIds })
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
    const response = await api.patch(`/tags/${id}`, data)
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
  type?: 'email' | 'sms' | 'phone'
  status?: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed'
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

  sendCampaign: async (id: string) => {
    const response = await api.post(`/campaigns/${id}/send`)
    return response.data
  },

  pauseCampaign: async (id: string) => {
    const response = await api.post(`/campaigns/${id}/pause`)
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
  type: 'email' | 'call' | 'meeting' | 'note' | 'status_change'
  leadId: string
  description: string
  metadata?: Record<string, unknown>
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
    const response = await api.patch(`/activities/${id}`, data)
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
    const response = await api.patch(`/tasks/${id}`, data)
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

  getActivityFeed: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get('/analytics/activity-feed', { params })
    return response.data
  },

  getConversionFunnel: async (params?: AnalyticsQuery) => {
    const response = await api.get('/analytics/conversion-funnel', { params })
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

  markAsRead: async (id: string) => {
    const response = await api.patch(`/messages/${id}/read`)
    return response.data
  },

  deleteMessage: async (id: string) => {
    const response = await api.delete(`/messages/${id}`)
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

  useEmailTemplate: async (id: string) => {
    const response = await api.post(`/templates/email/${id}/use`)
    return response.data
  },

  getEmailTemplateStats: async () => {
    const response = await api.get('/templates/email/stats')
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

  useSMSTemplate: async (id: string) => {
    const response = await api.post(`/templates/sms/${id}/use`)
    return response.data
  },

  getSMSTemplateStats: async () => {
    const response = await api.get('/templates/sms/stats')
    return response.data
  },

  // Generic template endpoints (via /api/templates route)
  // These provide alternative access patterns for the same functionality
  getAllEmailTemplates: async (params?: any) => {
    const response = await api.get('/templates/email', { params })
    return response.data
  },

  getAllSMSTemplates: async (params?: any) => {
    const response = await api.get('/templates/sms', { params })
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

  toggleWorkflow: async (id: string) => {
    const response = await api.patch(`/workflows/${id}/toggle`)
    return response.data
  },

  testWorkflow: async (id: string) => {
    const response = await api.post(`/workflows/${id}/test`)
    return response.data
  },

  getExecutions: async (workflowId: string, params?: any) => {
    const response = await api.get(`/workflows/${workflowId}/executions`, { params })
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
    return response.data
  },

  updateEmailConfig: async (data: any) => {
    const response = await api.put('/settings/email', data)
    return response.data
  },

  testEmail: async (data: any) => {
    const response = await api.post('/settings/email/test', data)
    return response.data
  },

  // SMS Configuration
  getSMSConfig: async () => {
    const response = await api.get('/settings/sms')
    return response.data
  },

  updateSMSConfig: async (data: any) => {
    const response = await api.put('/settings/sms', data)
    return response.data
  },

  testSMS: async (data: any) => {
    const response = await api.post('/settings/sms/test', data)
    return response.data
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

// Export the axios instance as default for backward compatibility
export default api
