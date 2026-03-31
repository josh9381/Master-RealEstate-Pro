import api from './client'

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
