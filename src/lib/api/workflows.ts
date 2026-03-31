import api from './client'

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
