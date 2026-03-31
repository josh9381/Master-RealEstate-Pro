import api from './client'

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
