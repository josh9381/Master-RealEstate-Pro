import api from './client'

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
