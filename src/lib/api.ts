import axios, { AxiosError } from 'axios'
import type { Lead, Campaign, Note, Activity, Analytics, User } from '@/types'

// Create axios instance
const api = axios.create({
  baseURL: '/api',
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
  status?: string
  source?: string
  assignedTo?: string
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
  getLeadNotes: async (leadId: string) => {
    const response = await api.get(`/leads/${leadId}/notes`)
    return response.data
  },

  createNote: async (data: CreateNoteData) => {
    const response = await api.post('/notes', data)
    return response.data
  },

  updateNote: async (id: string, content: string) => {
    const response = await api.patch(`/notes/${id}`, { content })
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
  type: 'email' | 'sms' | 'phone'
  status?: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed'
  subject?: string
  content?: string
  scheduledAt?: string
  targetAudience?: string[]
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

// Export the axios instance as default for backward compatibility
export default api
