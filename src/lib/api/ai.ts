import api from './client'

export interface InsightFilter {
  type?: string
  priority?: string
  limit?: number
  status?: 'active' | 'dismissed' | 'acted' | 'all'
  sortBy?: 'newest' | 'priority' | 'impact'
  showDismissed?: boolean
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
  data: Record<string, unknown> | unknown[]
}

export interface ScoringConfigData {
  weights?: { engagement?: number; demographic?: number; behavior?: number; timing?: number }
  emailOpenWeight?: number
  emailClickWeight?: number
  emailReplyWeight?: number
  formSubmissionWeight?: number
  propertyInquiryWeight?: number
  scheduledApptWeight?: number
  completedApptWeight?: number
  emailOptOutPenalty?: number
  recencyBonusMax?: number
  frequencyBonusMax?: number
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

  actOnInsight: async (id: string, actionTaken?: string) => {
    const response = await api.post(`/ai/insights/${id}/act`, { actionTaken })
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

  getLeadScoreFactors: async (leadId: string) => {
    const response = await api.get(`/ai/lead/${leadId}/score-factors`)
    return response.data
  },

  recalculateScores: async () => {
    const response = await api.post('/ai/recalculate-scores')
    return response.data
  },

  // Model Recalibration
  recalibrateModel: async () => {
    const response = await api.post('/ai/recalibrate')
    return response.data
  },

  getRecalibrationStatus: async () => {
    const response = await api.get('/ai/recalibration-status')
    return response.data
  },

  // Predictions
  getGlobalPredictions: async () => {
    const response = await api.get('/ai/predictions')
    return response.data
  },
  getPredictions: async (leadId: string) => {
    const response = await api.get(`/ai/predictions/${leadId}`)
    return response.data
  },

  // AI Assistant Features
  enhanceMessage: async (payload: EnhanceMessagePayload) => {
    const response = await api.post('/ai/enhance-message', payload)
    return response.data
  },

  composeEmail: async (payload: { leadName?: string; leadEmail?: string; tone?: string; purpose?: string; context?: string }) => {
    const response = await api.post('/ai/compose', payload)
    return response.data
  },

  generateSMS: async (payload: { leadName?: string; leadPhone?: string; tone?: string; purpose?: string; context?: string }) => {
    const response = await api.post('/ai/generate/sms', payload)
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

  // Scoring Configuration
  getScoringConfig: async () => {
    const response = await api.get('/ai/scoring-config')
    return response.data
  },

  updateScoringConfig: async (config: ScoringConfigData) => {
    const response = await api.put('/ai/scoring-config', config)
    return response.data
  },

  resetScoringConfig: async () => {
    const response = await api.post('/ai/scoring-config/reset')
    return response.data
  },

  // AI Preferences (Settings page)
  getPreferences: async () => {
    const response = await api.get('/ai/preferences')
    return response.data
  },

  savePreferences: async (preferences: Record<string, unknown>) => {
    const response = await api.post('/ai/preferences', preferences)
    return response.data
  },

  resetPreferences: async () => {
    const response = await api.post('/ai/preferences/reset')
    return response.data
  },

  // AI Usage
  getUsage: async () => {
    const response = await api.get('/ai/usage')
    return response.data
  },

  getUsageLimits: async () => {
    const response = await api.get('/ai/usage/limits')
    return response.data
  },

  // Phase 7: Org-Level AI Settings
  getOrgSettings: async () => {
    const response = await api.get('/ai/org-settings')
    return response.data
  },

  updateOrgSettings: async (settings: Record<string, unknown>) => {
    const response = await api.put('/ai/org-settings', settings)
    return response.data
  },

  getAvailableModels: async () => {
    const response = await api.get('/ai/available-models')
    return response.data
  },

  // Phase 7: Cost Dashboard
  getCostDashboard: async (months?: number) => {
    const response = await api.get('/ai/cost-dashboard', { params: { months } })
    return response.data
  },

  // Phase 7: Feedback
  submitChatFeedback: async (messageId: string, payload: { feedback: 'positive' | 'negative'; note?: string }) => {
    const response = await api.post(`/ai/chat/${messageId}/feedback`, payload)
    return response.data
  },

  submitInsightFeedback: async (insightId: string, payload: { feedback: 'helpful' | 'not_helpful' }) => {
    const response = await api.post(`/ai/insights/${insightId}/feedback`, payload)
    return response.data
  },

  getFeedbackStats: async () => {
    const response = await api.get('/ai/feedback/stats')
    return response.data
  },

  // Phase 7: Lead Enrichment
  enrichLead: async (leadId: string) => {
    const response = await api.post(`/ai/enrich/${leadId}`)
    return response.data
  },

  applyEnrichment: async (leadId: string, fields: Record<string, unknown>) => {
    const response = await api.post(`/ai/enrich/${leadId}/apply`, { fields })
    return response.data
  },

  // Phase 7: Budget Settings
  getBudgetSettings: async () => {
    const response = await api.get('/ai/budget-settings')
    return response.data
  },

  updateBudgetSettings: async (settings: { warning?: number; caution?: number; hardLimit?: number; alertEnabled?: boolean }) => {
    const response = await api.put('/ai/budget-settings', settings)
    return response.data
  },
}
