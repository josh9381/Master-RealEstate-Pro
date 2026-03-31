import api from './client'

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

  getThreadMessages: async (threadId: string) => {
    const response = await api.get(`/messages/thread/${threadId}`)
    return response.data
  },

  replyToMessage: async (messageId: string, data: { body: string; attachments?: Array<{ filename: string; content: string; contentType: string }> }) => {
    const response = await api.post(`/messages/${messageId}/reply`, data)
    return response.data
  },
}

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

  duplicateSMSTemplate: async (id: string) => {
    const response = await api.post(`/sms-templates/${id}/duplicate`)
    return response.data
  },

}

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
