import prisma from '../config/database'

/**
 * AI Service - Handles all AI-related operations
 * Currently uses rule-based algorithms and mock data
 * Can be enhanced with actual ML models in the future
 */

interface InsightFilter {
  type?: string
  priority?: string
  limit: number
}

interface RecommendationFilter {
  type?: string
  limit: number
}

interface ActionContext {
  context?: string
  leadId?: string
  campaignId?: string
}

/**
 * Get AI Hub statistics
 */
export const getAIStats = async () => {
  const [leadsCount, activeModels] = await Promise.all([
    prisma.lead.count(),
    Promise.resolve(6) // Mock: 6 active models
  ])

  // Calculate predictions count (mock: based on leads)
  const predictionsToday = Math.floor(leadsCount * 2.5)
  
  return {
    activeModels: 6,
    modelsInTraining: 2,
    avgAccuracy: 91.2,
    accuracyChange: 2.3,
    predictionsToday,
    predictionsChange: 12,
    activeInsights: 23,
    highPriorityInsights: 3
  }
}

/**
 * Get AI features with their status
 */
export const getAIFeatures = async () => {
  const leadsCount = await prisma.lead.count()
  
  return [
    {
      id: 1,
      title: 'Lead Scoring',
      description: 'AI-powered lead quality prediction',
      status: 'active',
      accuracy: '94%',
      leadsScored: leadsCount,
    },
    {
      id: 2,
      title: 'Customer Segmentation',
      description: 'Intelligent customer grouping',
      status: 'active',
      accuracy: '89%',
      segments: 12,
    },
    {
      id: 3,
      title: 'Predictive Analytics',
      description: 'Forecast outcomes and trends',
      status: 'training',
      accuracy: '91%',
      predictions: Math.floor(leadsCount * 0.7),
    },
    {
      id: 4,
      title: 'Model Training',
      description: 'Train and optimize AI models',
      status: 'active',
      accuracy: '87%',
      models: 5,
    },
    {
      id: 5,
      title: 'Intelligence Insights',
      description: 'Automated business insights',
      status: 'active',
      insights: 23,
    },
    {
      id: 6,
      title: 'Performance Analytics',
      description: 'AI model performance metrics',
      status: 'active',
      accuracy: '92%',
    },
  ]
}

/**
 * Get model performance metrics over time
 */
export const getModelPerformance = async (months: number = 6) => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const currentMonth = new Date().getMonth()
  
  const performance = []
  for (let i = months - 1; i >= 0; i--) {
    const monthIndex = (currentMonth - i + 12) % 12
    const baseAccuracy = 85 + (months - i - 1) * 1.5
    const basePredictions = 450 + (months - i - 1) * 70
    
    performance.push({
      month: monthNames[monthIndex],
      accuracy: Math.min(95, Math.round(baseAccuracy)),
      predictions: Math.round(basePredictions)
    })
  }
  
  return performance
}

/**
 * Get active training models
 */
export const getTrainingModels = async () => {
  return [
    {
      name: 'Lead Scoring v2',
      progress: 85,
      eta: '2 hours',
      status: 'training'
    },
    {
      name: 'Churn Prediction',
      progress: 45,
      eta: '6 hours',
      status: 'training'
    },
    {
      name: 'Email Optimization',
      progress: 100,
      eta: 'Complete',
      status: 'complete'
    },
  ]
}

/**
 * Upload training data (mock implementation)
 */
export const uploadTrainingData = async (modelType: string, data: any) => {
  // In a real implementation, this would:
  // 1. Validate the data format
  // 2. Store the training data
  // 3. Queue a model training job
  
  return {
    modelType,
    recordsUploaded: Array.isArray(data) ? data.length : 1,
    status: 'queued',
    message: 'Training data uploaded successfully and queued for processing'
  }
}

/**
 * Get data quality metrics
 */
export const getDataQuality = async () => {
  const leads = await prisma.lead.findMany({
    select: {
      email: true,
      phone: true,
      company: true,
      status: true,
      createdAt: true,
    }
  })

  // Calculate completeness (fields filled)
  const completeness = leads.reduce((acc, lead) => {
    const fields = [lead.email, lead.phone, lead.company, lead.status]
    const filled = fields.filter(f => f && f.trim() !== '').length
    return acc + (filled / fields.length)
  }, 0) / Math.max(leads.length, 1) * 100

  // Calculate timeliness (how recent are leads)
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const recentLeads = leads.filter(l => l.createdAt >= thirtyDaysAgo).length
  const timeliness = (recentLeads / Math.max(leads.length, 1)) * 100

  return [
    {
      metric: 'Completeness',
      score: Math.round(completeness),
      status: completeness >= 90 ? 'excellent' : completeness >= 70 ? 'good' : 'warning'
    },
    {
      metric: 'Accuracy',
      score: 88,
      status: 'good'
    },
    {
      metric: 'Consistency',
      score: 75,
      status: 'warning'
    },
    {
      metric: 'Timeliness',
      score: Math.round(timeliness),
      status: timeliness >= 80 ? 'excellent' : timeliness >= 60 ? 'good' : 'warning'
    },
  ]
}

/**
 * Get AI-generated insights
 */
export const getInsights = async (filter: InsightFilter) => {
  const insights = [
    {
      id: '1',
      type: 'opportunity',
      title: 'High-value leads detected',
      description: '12 leads have >80% conversion probability',
      priority: 'high',
      date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      dismissed: false
    },
    {
      id: '2',
      type: 'warning',
      title: 'Engagement dropping',
      description: 'Email open rates down 15% this week',
      priority: 'medium',
      date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      dismissed: false
    },
    {
      id: '3',
      type: 'success',
      title: 'Model accuracy improved',
      description: 'Lead scoring model now at 94% accuracy',
      priority: 'low',
      date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      dismissed: false
    },
  ]

  let filtered = insights

  if (filter.type) {
    filtered = filtered.filter(i => i.type === filter.type)
  }

  if (filter.priority) {
    filtered = filtered.filter(i => i.priority === filter.priority)
  }

  return filtered.slice(0, filter.limit)
}

/**
 * Get insight by ID
 */
export const getInsightById = async (id: string) => {
  const insights = await getInsights({ limit: 100 })
  return insights.find(i => i.id === id)
}

/**
 * Dismiss an insight
 */
export const dismissInsight = async (id: string) => {
  // In a real implementation, this would update the database
  return { id, dismissed: true }
}

/**
 * Get AI-powered recommendations
 */
export const getRecommendations = async (filter: RecommendationFilter) => {
  const recommendations = [
    {
      id: 1,
      title: 'Focus on high-value leads',
      description: 'Prioritize 15 leads with >85% conversion probability',
      impact: 'High',
      action: 'View Leads',
      category: 'lead-management'
    },
    {
      id: 2,
      title: 'Optimize email send times',
      description: 'Best engagement at 10 AM and 3 PM on Tuesdays',
      impact: 'Medium',
      action: 'Schedule Campaign',
      category: 'campaign'
    },
    {
      id: 3,
      title: 'Re-engage dormant leads',
      description: '23 qualified leads inactive for 30+ days',
      impact: 'Medium',
      action: 'Create Workflow',
      category: 'automation'
    },
  ]

  let filtered = recommendations

  if (filter.type) {
    filtered = filtered.filter(r => r.category === filter.type)
  }

  return filtered.slice(0, filter.limit)
}

/**
 * Calculate lead score based on various factors
 */
export const calculateLeadScore = async (leadId: string) => {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      notes: true,
      activities: true,
    }
  })

  if (!lead) {
    throw new Error('Lead not found')
  }

  // Rule-based scoring algorithm
  let score = 50 // Base score

  // Email engagement (if we had email tracking)
  score += 10

  // Response time
  if (lead.activities && lead.activities.length > 0) {
    score += 15
  }

  // Budget/value (if status indicates high value)
  if (lead.status === 'QUALIFIED' || lead.status === 'NEGOTIATION') {
    score += 20
  }

  // Company size (mock)
  score += 10

  // Lead source quality (mock)
  score += 8

  // Engagement (notes count)
  if (lead.notes) {
    score += Math.min(lead.notes.length * 2, 10)
  }

  // Activity recency
  if (lead.activities && lead.activities.length > 0) {
    const lastActivity = lead.activities.sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    )[0]
    const daysSinceActivity = (Date.now() - lastActivity.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceActivity < 7) score += 5
  }

  // Cap at 100
  score = Math.min(100, score)

  return {
    leadId,
    score,
    factors: {
      emailEngagement: 10,
      responseTime: lead.activities?.length ? 15 : 0,
      budget: (lead.status === 'QUALIFIED' || lead.status === 'NEGOTIATION') ? 20 : 0,
      companySize: 10,
      leadSource: 8,
      engagement: Math.min((lead.notes?.length || 0) * 2, 10)
    },
    recommendation: score >= 80 ? 'high-priority' : score >= 60 ? 'medium-priority' : 'low-priority',
    confidence: 0.87
  }
}

/**
 * Recalculate scores for all leads
 */
export const recalculateAllScores = async () => {
  const leads = await prisma.lead.findMany({
    select: { id: true }
  })

  // In production, this would be a background job
  return {
    status: 'initiated',
    leadsToProcess: leads.length,
    estimatedTime: `${Math.ceil(leads.length / 100)} minutes`
  }
}

/**
 * Get predictions for a lead
 */
export const getPredictions = async (leadId: string) => {
  const score = await calculateLeadScore(leadId)

  return {
    leadId,
    conversionProbability: score.score,
    estimatedTimeToConversion: score.score >= 80 ? '7-14 days' : score.score >= 60 ? '14-30 days' : '30+ days',
    recommendedActions: [
      'Schedule a follow-up call',
      'Send personalized email',
      'Share relevant case study'
    ],
    churnRisk: score.score < 50 ? 'high' : score.score < 70 ? 'medium' : 'low',
    nextBestAction: score.score >= 70 ? 'Close deal' : 'Nurture relationship'
  }
}

/**
 * Enhance a message using AI (mock implementation)
 */
export const enhanceMessage = async (message: string, type?: string, tone?: string) => {
  // In production, this would call an AI service (OpenAI, Claude, etc.)
  
  const enhanced = message
    .replace(/\bhi\b/gi, 'Hello')
    .replace(/\bthanks\b/gi, 'Thank you')
    .trim()

  return {
    original: message,
    enhanced: enhanced + '\n\nBest regards,\nYour Real Estate Team',
    improvements: ['Added professional greeting', 'Improved tone', 'Added signature'],
    tone: tone || 'professional',
    type: type || 'email'
  }
}

/**
 * Suggest actions based on context
 */
export const suggestActions = async (context: ActionContext) => {
  const actions = []

  if (context.leadId) {
    const lead = await prisma.lead.findUnique({
      where: { id: context.leadId }
    })

    if (lead) {
      if (lead.status === 'NEW') {
        actions.push({
          action: 'qualify-lead',
          title: 'Qualify this lead',
          description: 'Review and update lead status',
          priority: 'high'
        })
      }

      actions.push({
        action: 'schedule-followup',
        title: 'Schedule follow-up',
        description: 'Set a reminder to follow up with this lead',
        priority: 'medium'
      })

      actions.push({
        action: 'send-email',
        title: 'Send personalized email',
        description: 'Engage with a tailored message',
        priority: 'medium'
      })
    }
  }

  if (context.campaignId) {
    actions.push({
      action: 'optimize-campaign',
      title: 'Optimize campaign',
      description: 'Review performance and make improvements',
      priority: 'high'
    })
  }

  return actions
}

/**
 * Get feature importance for a model
 */
export const getFeatureImportance = async (modelType: string) => {
  // Mock feature importance data
  const importanceData: Record<string, any[]> = {
    'lead-scoring': [
      { name: 'Email Engagement', value: 28, color: '#3b82f6' },
      { name: 'Response Time', value: 22, color: '#10b981' },
      { name: 'Budget Range', value: 18, color: '#f59e0b' },
      { name: 'Company Size', value: 15, color: '#8b5cf6' },
      { name: 'Lead Source', value: 12, color: '#ec4899' },
      { name: 'Other', value: 5, color: '#6b7280' },
    ],
    'churn-prediction': [
      { name: 'Last Activity Date', value: 32, color: '#3b82f6' },
      { name: 'Engagement Score', value: 26, color: '#10b981' },
      { name: 'Contract Value', value: 20, color: '#f59e0b' },
      { name: 'Support Tickets', value: 12, color: '#8b5cf6' },
      { name: 'Other', value: 10, color: '#6b7280' },
    ]
  }

  return importanceData[modelType] || importanceData['lead-scoring']
}
