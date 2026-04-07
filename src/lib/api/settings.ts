import api from './client'

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

  // Setup Wizard
  getSetupStatus: async () => {
    const response = await api.get('/settings/setup-status')
    return response.data
  },

  completeSetup: async () => {
    const response = await api.post('/settings/setup-complete')
    return response.data
  },
}

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
