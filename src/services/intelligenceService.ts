import api from '@/lib/api';

export interface LeadPrediction {
  leadId: string;
  conversionProbability: number;
  estimatedValue: number;
  confidenceScore: number;
  riskFactors: string[];
  opportunities: string[];
  predictedCloseDateDays: number;
}

export interface EngagementAnalysis {
  leadId: string;
  engagementScore: number;
  trend: 'increasing' | 'stable' | 'declining';
  lastActivityDays: number;
  activityFrequency: number;
  churnRisk: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface NextActionSuggestion {
  leadId: string;
  suggestedAction: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string;
  expectedImpact: string;
  timing: string;
}

export interface DashboardInsights {
  totalLeads: number;
  highProbabilityLeads: number;
  atRiskLeads: number;
  avgConversionProbability: number;
  topOpportunities: Array<{
    leadId: string;
    leadName: string;
    probability: number;
    value: number;
  }>;
  urgentActions: Array<{
    leadId: string;
    leadName: string;
    action: string;
    priority: string;
  }>;
}

export interface TrendsData {
  conversionTrend: Array<{
    period: string;
    avgProbability: number;
    conversions: number;
  }>;
  engagementTrend: Array<{
    period: string;
    avgScore: number;
    activities: number;
  }>;
  scoringAccuracy: Array<{
    period: string;
    accuracy: number;
    predictions: number;
  }>;
}

export interface ScoringModel {
  organizationId: string;
  factors: {
    scoreWeight: number;
    activityWeight: number;
    recencyWeight: number;
    funnelTimeWeight: number;
  };
  accuracy: number | null;
  lastTrainedAt: string | null;
  trainingDataCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversionOutcome {
  leadId: string;
  outcome: 'WON' | 'LOST';
}

export interface BatchAnalysisRequest {
  leadIds: string[];
}

export interface BatchAnalysisResponse {
  results: Array<{
    leadId: string;
    prediction: LeadPrediction;
    engagement: EngagementAnalysis;
    nextAction: NextActionSuggestion;
  }>;
}

/**
 * Intelligence Service
 * Provides AI-powered predictions, insights, and recommendations
 */
export const intelligenceService = {
  /**
   * Get AI prediction for a specific lead
   */
  async getLeadPrediction(leadId: string): Promise<LeadPrediction> {
    const response = await api.get(`/intelligence/leads/${leadId}/prediction`);
    return response.data;
  },

  /**
   * Get engagement analysis for a specific lead
   */
  async getEngagementAnalysis(leadId: string): Promise<EngagementAnalysis> {
    const response = await api.get(`/intelligence/leads/${leadId}/engagement`);
    return response.data;
  },

  /**
   * Get next action suggestion for a specific lead
   */
  async getNextAction(leadId: string): Promise<NextActionSuggestion> {
    const response = await api.get(`/intelligence/leads/${leadId}/next-action`);
    return response.data;
  },

  /**
   * Get dashboard insights for organization
   */
  async getDashboardInsights(): Promise<DashboardInsights> {
    const response = await api.get('/intelligence/insights/dashboard');
    return response.data;
  },

  /**
   * Get analytics trends over time
   */
  async getAnalyticsTrends(days: number = 30): Promise<TrendsData> {
    const response = await api.get('/intelligence/analytics/trends', {
      params: { days }
    });
    return response.data;
  },

  /**
   * Analyze multiple leads in batch
   */
  async analyzeBatch(leadIds: string[]): Promise<BatchAnalysisResponse> {
    const response = await api.post('/intelligence/analyze-batch', { leadIds });
    return response.data;
  },

  /**
   * Get current scoring model configuration
   */
  async getScoringModel(): Promise<ScoringModel> {
    const response = await api.get('/intelligence/scoring-model');
    return response.data;
  },

  /**
   * Trigger ML optimization of scoring weights
   */
  async optimizeScoring(): Promise<{
    success: boolean;
    accuracy: number;
    optimizedWeights: {
      scoreWeight: number;
      activityWeight: number;
      recencyWeight: number;
      funnelTimeWeight: number;
    };
  }> {
    const response = await api.post('/intelligence/optimize-scoring');
    return response.data;
  },

  /**
   * Record conversion outcome for learning
   */
  async recordConversion(leadId: string, outcome: 'WON' | 'LOST'): Promise<void> {
    await api.post('/intelligence/record-conversion', { leadId, outcome });
  },
};

export default intelligenceService;
