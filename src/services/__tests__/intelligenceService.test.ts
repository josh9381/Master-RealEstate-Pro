import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()

vi.mock('@/lib/api', () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
  },
}))

import { intelligenceService } from '../intelligenceService'

describe('intelligenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getLeadPrediction fetches prediction for a lead', async () => {
    mockGet.mockResolvedValue({
      data: { leadId: 'lead1', conversionProbability: 75 },
    })
    const result = await intelligenceService.getLeadPrediction('lead1')
    expect(mockGet).toHaveBeenCalledWith('/intelligence/leads/lead1/prediction')
    expect(result.conversionProbability).toBe(75)
  })

  it('getEngagementAnalysis fetches engagement data', async () => {
    mockGet.mockResolvedValue({
      data: { leadId: 'lead1', engagementScore: 60, trend: 'increasing' },
    })
    const result = await intelligenceService.getEngagementAnalysis('lead1')
    expect(mockGet).toHaveBeenCalledWith('/intelligence/leads/lead1/engagement')
    expect(result.trend).toBe('increasing')
  })

  it('getNextAction fetches next action suggestion', async () => {
    mockGet.mockResolvedValue({
      data: { leadId: 'lead1', suggestedAction: 'call', priority: 'high' },
    })
    const result = await intelligenceService.getNextAction('lead1')
    expect(mockGet).toHaveBeenCalledWith('/intelligence/leads/lead1/next-action')
    expect(result.suggestedAction).toBe('call')
  })

  it('getDashboardInsights fetches org dashboard', async () => {
    mockGet.mockResolvedValue({
      data: { totalLeads: 100, highProbabilityLeads: 20 },
    })
    const result = await intelligenceService.getDashboardInsights()
    expect(mockGet).toHaveBeenCalledWith('/intelligence/insights/dashboard')
    expect(result.totalLeads).toBe(100)
  })

  it('getAnalyticsTrends fetches trends with default 30 days', async () => {
    mockGet.mockResolvedValue({ data: { conversionTrend: [] } })
    await intelligenceService.getAnalyticsTrends()
    expect(mockGet).toHaveBeenCalledWith('/intelligence/analytics/trends', {
      params: { days: 30 },
    })
  })

  it('getAnalyticsTrends accepts custom days parameter', async () => {
    mockGet.mockResolvedValue({ data: { conversionTrend: [] } })
    await intelligenceService.getAnalyticsTrends(90)
    expect(mockGet).toHaveBeenCalledWith('/intelligence/analytics/trends', {
      params: { days: 90 },
    })
  })

  it('analyzeBatch posts lead IDs for batch analysis', async () => {
    mockPost.mockResolvedValue({ data: { results: [] } })
    const result = await intelligenceService.analyzeBatch(['lead1', 'lead2'])
    expect(mockPost).toHaveBeenCalledWith('/intelligence/analyze-batch', {
      leadIds: ['lead1', 'lead2'],
    })
    expect(result.results).toEqual([])
  })

  it('getScoringModel fetches current model', async () => {
    mockGet.mockResolvedValue({
      data: { accuracy: 0.85, factors: {} },
    })
    const result = await intelligenceService.getScoringModel()
    expect(mockGet).toHaveBeenCalledWith('/intelligence/scoring-model')
    expect(result.accuracy).toBe(0.85)
  })

  it('optimizeScoring triggers ML optimization', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, accuracy: 0.9 },
    })
    const result = await intelligenceService.optimizeScoring()
    expect(mockPost).toHaveBeenCalledWith('/intelligence/optimize-scoring')
    expect(result.success).toBe(true)
  })

  it('recordConversion posts outcome for a lead', async () => {
    mockPost.mockResolvedValue({ data: {} })
    await intelligenceService.recordConversion('lead1', 'WON')
    expect(mockPost).toHaveBeenCalledWith('/intelligence/record-conversion', {
      leadId: 'lead1',
      outcome: 'WON',
    })
  })
})
