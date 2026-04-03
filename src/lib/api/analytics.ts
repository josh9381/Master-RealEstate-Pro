import api from './client'

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

  // Phase 5: Attribution, comparison, velocity, ROI, follow-up analytics
  getAttributionReport: async (params?: { model?: string; startDate?: string; endDate?: string }) => {
    const response = await api.get('/analytics/attribution', { params })
    return response.data
  },

  getLeadTouchpoints: async (leadId: string, params?: { model?: string }) => {
    const response = await api.get(`/analytics/attribution/touchpoints/${leadId}`, { params })
    return response.data
  },

  getPeriodComparison: async (params?: { startDate?: string; endDate?: string }) => {
    const response = await api.get('/analytics/comparison', { params })
    return response.data
  },

  getLeadVelocity: async (params?: { months?: number }) => {
    const response = await api.get('/analytics/lead-velocity', { params })
    return response.data
  },

  getSourceROI: async (params?: { startDate?: string; endDate?: string }) => {
    const response = await api.get('/analytics/source-roi', { params })
    return response.data
  },

  getFollowUpAnalytics: async (params?: { months?: number }) => {
    const response = await api.get('/analytics/follow-up-analytics', { params })
    return response.data
  },

  getLeadSources: async () => {
    const response = await api.get('/analytics/lead-sources')
    return response.data
  },

  getUsageStats: async (params?: AnalyticsQuery) => {
    const response = await api.get('/analytics/usage-stats', { params })
    return response.data
  },
}
