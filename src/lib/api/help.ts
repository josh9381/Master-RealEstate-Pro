import api from './client'

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
