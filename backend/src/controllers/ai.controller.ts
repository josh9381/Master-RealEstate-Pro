import { Request, Response } from 'express'
import { getIntelligenceService } from '../services/intelligence.service'
import { getOpenAIService, ASSISTANT_TONES, AssistantTone } from '../services/openai.service'
import { getAIFunctionsService, AI_FUNCTIONS } from '../services/ai-functions.service'
import { gatherMessageContext } from '../services/message-context.service'
import { generateContextualMessage, generateVariations, ComposeSettings } from '../services/ai-compose.service'
import * as templateService from '../services/template-ai.service'
import * as preferencesService from '../services/user-preferences.service'
import { updateMultipleLeadScores, getLeadScoreBreakdown } from '../services/leadScoring.service'
import { incrementAIUsage, getUsageWithLimits, getCostBreakdown } from '../services/usage-tracking.service'
import prisma from '../config/database'

/**
 * Generate actionable insights from real DB data and store in AIInsight table.
 * Runs on each GET /insights call but is idempotent (won't create duplicates
 * for the same insight within 24h).
 */
async function generateAndStoreInsights(organizationId: string): Promise<void> {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Helper: only create if no recent duplicate of same type exists
  async function upsertInsight(type: string, priority: string, title: string, description: string, data?: any, actionUrl?: string) {
    const existing = await prisma.aIInsight.findFirst({
      where: {
        organizationId,
        type,
        title,
        createdAt: { gte: oneDayAgo },
      },
    })
    if (existing) return // Already have a recent one

    await prisma.aIInsight.create({
      data: {
        organizationId,
        type,
        priority,
        title,
        description,
        data: data || undefined,
        actionUrl,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 day expiry
      },
    })
  }

  try {
    // 1. Leads not contacted in 14+ days
    const staleLeads = await prisma.lead.findMany({
      where: {
        organizationId,
        status: { notIn: ['WON', 'LOST'] },
        OR: [
          { lastContactAt: { lt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) } },
          { lastContactAt: null },
        ],
      },
      select: { id: true, firstName: true, lastName: true, lastContactAt: true },
      take: 20,
    })

    if (staleLeads.length > 0) {
      await upsertInsight(
        'lead_followup',
        staleLeads.length > 5 ? 'high' : 'medium',
        `${staleLeads.length} leads haven't been contacted in 14+ days`,
        `These leads may disengage without follow-up. Consider reaching out to re-engage them.`,
        { leadIds: staleLeads.map(l => l.id), leadNames: staleLeads.slice(0, 5).map(l => `${l.firstName} ${l.lastName}`) },
        '/leads?filter=stale'
      )
    }

    // 2. Scoring model accuracy check
    const models = await prisma.leadScoringModel.findMany({
      where: { organizationId },
    })
    for (const model of models) {
      if (model.accuracy !== null && model.accuracy < 70) {
        await upsertInsight(
          'scoring_accuracy',
          'high',
          `Lead scoring model accuracy is below 70% (${model.accuracy?.toFixed(1)}%)`,
          `Your lead scoring model has low accuracy. Consider recalibrating with more conversion data.`,
          { modelId: model.id, accuracy: model.accuracy },
          '/ai-hub'
        )
      }
    }

    // 3. Pipeline stagnation — leads stuck in same stage too long
    const stuckLeads = await prisma.lead.findMany({
      where: {
        organizationId,
        status: { notIn: ['WON', 'LOST'] },
        stage: { in: ['CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION'] },
        updatedAt: { lt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000) },
      },
      select: { id: true, firstName: true, lastName: true, stage: true },
      take: 20,
    })

    if (stuckLeads.length > 0) {
      await upsertInsight(
        'pipeline_health',
        stuckLeads.length > 3 ? 'high' : 'medium',
        `${stuckLeads.length} leads stuck in pipeline for 21+ days`,
        `These leads haven't progressed stages in 3+ weeks. They may need attention or should be marked lost.`,
        { leadIds: stuckLeads.map(l => l.id), stages: stuckLeads.slice(0, 5).map(l => `${l.firstName} ${l.lastName} (${l.stage})`) },
        '/leads?filter=stuck'
      )
    }

    // 4. Email engagement drop — compare recent campaigns
    const recentCampaigns = await prisma.campaignAnalytics.findMany({
      where: { organizationId },
      orderBy: { lastUpdatedAt: 'desc' },
      take: 10,
    })
    if (recentCampaigns.length >= 2) {
      const avgOpenRate = recentCampaigns.reduce((s, c) => s + (c.openRate || 0), 0) / recentCampaigns.length
      const latestRate = recentCampaigns[0].openRate || 0
      if (latestRate < avgOpenRate * 0.85 && avgOpenRate > 0) {
        await upsertInsight(
          'email_performance',
          'medium',
          `Email open rate dropped ${Math.round((1 - latestRate / avgOpenRate) * 100)}% vs average`,
          `Your latest campaign open rate (${(latestRate * 100).toFixed(1)}%) is below your average (${(avgOpenRate * 100).toFixed(1)}%). Consider A/B testing subject lines.`,
          { latestRate, avgOpenRate },
          '/campaigns'
        )
      }
    }

    // 5. New leads without score
    const unscoredLeads = await prisma.lead.count({
      where: {
        organizationId,
        score: { equals: 0 },
      },
    })
    if (unscoredLeads > 0) {
      await upsertInsight(
        'lead_followup',
        unscoredLeads > 10 ? 'medium' : 'low',
        `${unscoredLeads} leads don't have a score yet`,
        `Run score recalculation to prioritize your pipeline effectively.`,
        { count: unscoredLeads },
        '/ai-hub'
      )
    }

    // 6. High-value leads at risk
    const highValueAtRisk = await prisma.lead.findMany({
      where: {
        organizationId,
        value: { gte: 100000 },
        status: { notIn: ['WON', 'LOST'] },
        OR: [
          { lastContactAt: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
          { lastContactAt: null },
        ],
      },
      select: { id: true, firstName: true, lastName: true, value: true },
      take: 10,
    })

    if (highValueAtRisk.length > 0) {
      const totalValue = highValueAtRisk.reduce((s, l) => s + (l.value || 0), 0)
      await upsertInsight(
        'lead_followup',
        'critical',
        `${highValueAtRisk.length} high-value leads ($${totalValue.toLocaleString()}) need attention`,
        `These high-value leads haven't been contacted in 7+ days. Prioritize outreach to protect this pipeline value.`,
        { leadIds: highValueAtRisk.map(l => l.id), totalValue },
        '/leads?filter=high-value'
      )
    }

  } catch (error) {
    console.error('Error generating insights:', error)
    // Don't throw — insights generation is best-effort
  }
}

/**
 * Get AI Hub overview statistics
 * Phase 1E — returns real counts from database
 */
export const getAIStats = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Count leads
    const leadsCount = await prisma.lead.count({ where: { organizationId } })

    // Count active scoring models
    const activeModels = await prisma.leadScoringModel.count({
      where: { organizationId, lastTrainedAt: { not: null } },
    })

    // Count total models (including untrained)
    const totalModels = await prisma.leadScoringModel.count({
      where: { organizationId },
    })

    // Average model accuracy
    const modelAccuracies = await prisma.leadScoringModel.aggregate({
      where: { organizationId, accuracy: { not: null } },
      _avg: { accuracy: true },
      _count: { id: true },
    })

    // Accuracy change from last recalibration
    const lastTwoRecalibrations = await prisma.modelPerformanceHistory.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 2,
      select: { accuracyAfter: true, accuracyBefore: true },
    })
    const accuracyChange = lastTwoRecalibrations.length >= 1
      ? (lastTwoRecalibrations[0].accuracyAfter - (lastTwoRecalibrations[0].accuracyBefore || 0))
      : 0

    // Chat messages today (predictions/interactions today)
    const messagestoday = await prisma.chatMessage.count({
      where: {
        organizationId,
        createdAt: { gte: startOfDay },
        role: 'assistant',
      },
    })

    // Messages this month vs last month for trend
    const messagesThisMonth = await prisma.chatMessage.count({
      where: {
        organizationId,
        createdAt: { gte: startOfMonth },
        role: 'assistant',
      },
    })
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    const messagesLastMonth = await prisma.chatMessage.count({
      where: {
        organizationId,
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        role: 'assistant',
      },
    })
    const messageChange = messagesLastMonth > 0
      ? Math.round(((messagesThisMonth - messagesLastMonth) / messagesLastMonth) * 100)
      : 0

    // Active insights count
    const activeInsights = await prisma.aIInsight.count({
      where: { organizationId, dismissed: false, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    })
    const highPriorityInsights = await prisma.aIInsight.count({
      where: { organizationId, dismissed: false, priority: { in: ['high', 'critical'] }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    })

    // Total tokens/cost this month
    const costData = await prisma.chatMessage.aggregate({
      where: {
        organizationId,
        createdAt: { gte: startOfMonth },
        role: 'assistant',
      },
      _sum: { tokens: true, cost: true },
    })

    res.json({
      success: true,
      data: {
        activeModels,
        totalModels,
        modelsInTraining: Array.from(recalibrationJobs.values()).filter(j => j.status === 'running').length,
        avgAccuracy: modelAccuracies._avg.accuracy
          ? Math.round(modelAccuracies._avg.accuracy * 10) / 10
          : 0,
        accuracyChange: Math.round(accuracyChange * 10) / 10,
        predictionsToday: messagestoday,
        predictionsChange: messageChange,
        activeInsights,
        highPriorityInsights,
        leadsScored: leadsCount,
        messagesThisMonth,
        totalTokensThisMonth: costData._sum.tokens || 0,
        totalCostThisMonth: costData._sum.cost ? Math.round(costData._sum.cost * 100) / 100 : 0,
      },
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI statistics',
      error: error.message
    })
  }
}

/**
 * Get list of AI features with their real status
 * Phase 1F — dynamic feature list based on actual configuration
 */
export const getAIFeatures = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId

    const leadsCount = await prisma.lead.count({ where: { organizationId } })
    const modelsCount = await prisma.leadScoringModel.count({ where: { organizationId } })
    const testsCount = await prisma.aBTest.count({ where: { organizationId } })
    const insightsCount = await prisma.aIInsight.count({ where: { organizationId, dismissed: false } })

    const hasOpenAI = !!process.env.OPENAI_API_KEY
    // Check if org has its own key
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { useOwnAIKey: true, openaiApiKey: true },
    })
    const hasOrgKey = !!(org?.useOwnAIKey && org?.openaiApiKey)
    const aiEnabled = hasOpenAI || hasOrgKey

    const features = [
      {
        id: 'lead-scoring',
        title: 'Lead Scoring',
        description: 'AI-powered lead quality prediction with per-user ML models',
        status: 'active',
        category: 'scoring',
        leadsScored: leadsCount,
        models: modelsCount,
      },
      {
        id: 'intelligence-hub',
        title: 'Intelligence Hub',
        description: 'Lead predictions, engagement analysis, and pipeline insights',
        status: 'active',
        category: 'analytics',
        insights: insightsCount,
      },
      {
        id: 'ab-testing',
        title: 'A/B Testing',
        description: 'Statistical testing for campaign optimization',
        status: 'active',
        category: 'optimization',
        tests: testsCount,
      },
      {
        id: 'ai-chatbot',
        title: 'AI Chatbot',
        description: 'GPT-powered assistant with 25+ functions (create leads, send messages, etc.)',
        status: aiEnabled ? 'active' : 'inactive',
        category: 'assistant',
        requiresKey: !aiEnabled,
      },
      {
        id: 'ai-compose',
        title: 'AI Compose',
        description: 'Context-aware message composition with streaming and variations',
        status: aiEnabled ? 'active' : 'inactive',
        category: 'content',
        requiresKey: !aiEnabled,
      },
      {
        id: 'content-generation',
        title: 'AI Content Generation',
        description: 'Generate emails, SMS, property descriptions, social posts, and listing presentations',
        status: aiEnabled ? 'active' : 'inactive',
        category: 'content',
        requiresKey: !aiEnabled,
      },
      {
        id: 'message-enhancer',
        title: 'Message Enhancer',
        description: '6 tone options for rewriting messages professionally',
        status: aiEnabled ? 'active' : 'inactive',
        category: 'content',
        requiresKey: !aiEnabled,
      },
      {
        id: 'ml-optimization',
        title: 'ML Optimization',
        description: 'Automatic per-user scoring weight optimization via correlation analysis',
        status: 'active',
        category: 'scoring',
      },
      {
        id: 'predictive-analytics',
        title: 'Predictive Analytics',
        description: 'Conversion, revenue, and pipeline predictions from real data',
        status: 'active',
        category: 'analytics',
      },
      {
        id: 'ai-insights',
        title: 'AI Insights',
        description: 'Automated actionable insights from lead and engagement data',
        status: 'active',
        category: 'analytics',
        insights: insightsCount,
      },
      {
        id: 'segmentation',
        title: 'Segmentation',
        description: 'Rule-based lead segmentation',
        status: 'active',
        category: 'targeting',
      },
      {
        id: 'template-personalization',
        title: 'Template AI Personalization',
        description: 'AI-powered template customization with lead context',
        status: aiEnabled ? 'active' : 'inactive',
        category: 'content',
        requiresKey: !aiEnabled,
      },
      {
        id: 'voice-ai',
        title: 'Voice AI (Vapi)',
        description: 'AI-powered voice calls for leads',
        status: 'coming_soon',
        category: 'communication',
      },
    ]

    res.json({
      success: true,
      data: features,
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI features',
      error: error.message
    })
  }
}

/**
 * Get model performance metrics over time
 * Phase 1A — returns real ModelPerformanceHistory data
 */
export const getModelPerformance = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId

    const history = await prisma.modelPerformanceHistory.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        modelType: true,
        accuracyBefore: true,
        accuracyAfter: true,
        sampleSize: true,
        improvements: true,
        trainingDuration: true,
        createdAt: true,
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    })

    // Also get current model stats
    const models = await prisma.leadScoringModel.findMany({
      where: { organizationId },
      select: {
        id: true,
        accuracy: true,
        lastTrainedAt: true,
        trainingDataCount: true,
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    })

    res.json({
      success: true,
      data: {
        history: history.map(h => ({
          id: h.id,
          modelType: h.modelType,
          accuracyBefore: h.accuracyBefore,
          accuracyAfter: h.accuracyAfter,
          sampleSize: h.sampleSize,
          improvements: h.improvements,
          trainingDuration: h.trainingDuration,
          date: h.createdAt,
          user: `${h.user.firstName} ${h.user.lastName}`,
        })),
        currentModels: models.map(m => ({
          id: m.id,
          accuracy: m.accuracy,
          lastTrainedAt: m.lastTrainedAt,
          trainingDataCount: m.trainingDataCount,
          user: `${m.user.firstName} ${m.user.lastName}`,
        })),
        summary: {
          totalRecalibrations: history.length,
          avgAccuracy: history.length > 0
            ? Math.round(history.reduce((s, h) => s + h.accuracyAfter, 0) / history.length * 10) / 10
            : 0,
          activeModels: models.length,
        },
      },
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch model performance',
      error: error.message
    })
  }
}

/**
 * Get active training models — returns real LeadScoringModel records
 * Phase 1B
 */
export const getTrainingModels = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId

    const models = await prisma.leadScoringModel.findMany({
      where: { organizationId },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Get recent performance history for each model
    const performanceHistory = await prisma.modelPerformanceHistory.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    res.json({
      success: true,
      data: models.map(m => ({
        id: m.id,
        userId: m.userId,
        userName: `${m.user.firstName} ${m.user.lastName}`,
        userEmail: m.user.email,
        modelType: 'lead_scoring',
        status: m.lastTrainedAt ? 'trained' : 'untrained',
        accuracy: m.accuracy,
        lastTrainedAt: m.lastTrainedAt,
        trainingDataCount: m.trainingDataCount,
        factors: m.factors,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        recentHistory: performanceHistory
          .filter(h => h.userId === m.userId)
          .slice(0, 5)
          .map(h => ({
            accuracyBefore: h.accuracyBefore,
            accuracyAfter: h.accuracyAfter,
            sampleSize: h.sampleSize,
            date: h.createdAt,
          })),
      })),
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch training models',
      error: error.message
    })
  }
}

/**
 * Upload training data — processes lead conversion data to improve scoring
 *
 * Accepts an array of { leadId, converted: boolean } records.
 * Updates leads with actual outcomes, bumps the model's trainingDataCount,
 * and triggers an asynchronous recalibration.
 */
export const uploadTrainingData = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const userId = req.user!.userId
    const { modelType, data } = req.body

    if (!modelType || !data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'modelType (string) and data (non-empty array of { leadId, converted }) are required',
      })
    }

    // Validate and apply conversion outcomes to leads
    let processed = 0
    let skipped = 0
    for (const record of data) {
      if (!record.leadId || typeof record.converted !== 'boolean') {
        skipped++
        continue
      }
      // Only update leads belonging to this org
      const lead = await prisma.lead.findFirst({
        where: { id: record.leadId, organizationId },
        select: { id: true },
      })
      if (!lead) {
        skipped++
        continue
      }
      // Mark the lead's outcome
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: record.converted ? 'WON' : 'LOST',
          ...(record.converted ? { stage: 'WON' } : {}),
        },
      })
      processed++
    }

    // Update the model's training data count
    await prisma.leadScoringModel.upsert({
      where: { userId },
      create: {
        userId,
        organizationId,
        trainingDataCount: processed,
        factors: { engagement: 30, demographic: 25, behavior: 25, timing: 20 },
      },
      update: {
        trainingDataCount: { increment: processed },
      },
    })

    // Respond immediately, then kick off a background recalibration
    res.json({
      success: true,
      message: `Training data processed: ${processed} records applied, ${skipped} skipped`,
      data: {
        modelType,
        recordsUploaded: data.length,
        recordsProcessed: processed,
        recordsSkipped: skipped,
        status: 'processing',
        message: 'Training data applied. Recalibration started in background.',
      },
    })

    // Fire-and-forget recalibration with the new data
    if (processed > 0) {
      // Capture accuracy BEFORE optimization writes the new value
      const preModel = await prisma.leadScoringModel.findUnique({ where: { userId } })
      const accuracyBefore = preModel?.accuracy ?? null

      import('../services/ml-optimization.service')
        .then(({ getMLOptimizationService }) => {
          const mlService = getMLOptimizationService()
          return mlService.optimizeScoringWeights(userId, organizationId)
        })
        .then(async (result) => {
          await prisma.modelPerformanceHistory.create({
            data: {
              organizationId,
              userId,
              modelType: modelType || 'lead_scoring',
              accuracyBefore,
              accuracyAfter: result.accuracy,
              sampleSize: result.sampleSize,
              improvements: result.improvements as any,
              metadata: { source: 'training_upload', recordsProcessed: processed } as any,
            },
          })
          console.log(`✅ Training upload recalibration complete for user ${userId}: accuracy ${result.accuracy}%`)
        })
        .catch((err) => {
          console.error(`❌ Training upload recalibration failed for user ${userId}:`, err)
        })
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to upload training data',
      error: error.message,
    })
  }
}

/**
 * Get data quality metrics — uses real database analysis
 */
export const getDataQuality = async (req: Request, res: Response) => {
  try {
    const intelligence = getIntelligenceService()
    const quality = await intelligence.getDataQuality()
    
    res.json({
      success: true,
      data: quality
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch data quality metrics',
      error: error.message
    })
  }
}

/**
 * Get AI-generated insights — Phase 1C: real data-driven insights
 * Generated from DB analysis, not OpenAI calls
 */
export const getInsights = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const showDismissed = req.query.showDismissed === 'true'
    const status = req.query.status as string | undefined // 'active' | 'dismissed' | 'acted' | 'all'
    const priority = req.query.priority as string | undefined
    const type = req.query.type as string | undefined
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50
    const sortBy = req.query.sortBy as string | undefined // 'newest' | 'priority' | 'impact'

    // First, generate fresh insights (idempotent — won't duplicate)
    await generateAndStoreInsights(organizationId)

    // Fetch insights from DB
    const where: any = { organizationId }

    // Status-based filtering (new param takes precedence over legacy showDismissed)
    if (status === 'dismissed') {
      where.dismissed = true
    } else if (status === 'acted') {
      where.actedOn = true
      where.dismissed = false
    } else if (status === 'active') {
      where.dismissed = false
      where.actedOn = false
    } else if (status === 'all') {
      // No filter
    } else if (!showDismissed) {
      where.dismissed = false
    }

    // Priority filter
    if (priority && priority !== 'all') {
      where.priority = priority
    }

    // Type filter
    if (type && type !== 'all') {
      where.type = type
    }

    // Filter out expired insights
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
    ]

    // Determine sort order
    // For priority sort, fetch extra rows from DB (alphabetical sort is imprecise)
    // then apply correct priority ordering in JS and slice to the requested limit.
    let orderBy: any[] = [{ createdAt: 'desc' }]
    if (sortBy === 'newest') {
      orderBy = [{ createdAt: 'desc' }]
    }

    // Fetch more than needed when sorting by priority so JS sort sees all candidates
    const fetchLimit = sortBy === 'newest' ? Math.min(limit, 200) : Math.min(limit * 4, 200)

    const insights = await prisma.aIInsight.findMany({
      where,
      orderBy,
      take: fetchLimit,
    })

    // Sort by priority weight (only if default/impact sort)
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    const sorted = sortBy === 'newest'
      ? insights
      : insights
          .sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2))
          .slice(0, limit)

    res.json({
      success: true,
      data: sorted.map(i => ({
        id: i.id,
        type: i.type,
        priority: i.priority,
        title: i.title,
        description: i.description,
        data: i.data,
        actionUrl: i.actionUrl,
        dismissed: i.dismissed,
        actedOn: (i as any).actedOn || false,
        actedOnAt: (i as any).actedOnAt || null,
        actionTaken: (i as any).actionTaken || null,
        createdAt: i.createdAt,
      })),
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch insights',
      error: error.message
    })
  }
}

/**
 * Get a specific insight by ID
 */
export const getInsightById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const organizationId = req.user!.organizationId

    const insight = await prisma.aIInsight.findFirst({
      where: { id, organizationId },
    })

    if (!insight) {
      return res.status(404).json({
        success: false,
        message: 'Insight not found',
      })
    }

    res.json({
      success: true,
      data: insight,
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch insight',
      error: error.message
    })
  }
}

/**
 * Dismiss an AI insight
 */
export const dismissInsight = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const organizationId = req.user!.organizationId
    const userId = req.user!.userId

    const insight = await prisma.aIInsight.findFirst({
      where: { id, organizationId },
    })

    if (!insight) {
      return res.status(404).json({
        success: false,
        message: 'Insight not found',
      })
    }

    await prisma.aIInsight.update({
      where: { id },
      data: {
        dismissed: true,
        dismissedAt: new Date(),
        dismissedBy: userId,
      },
    })

    res.json({
      success: true,
      message: 'Insight dismissed successfully'
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to dismiss insight',
      error: error.message
    })
  }
}

/**
 * Mark an insight as acted upon
 */
export const actOnInsight = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const organizationId = req.user!.organizationId
    const userId = req.user!.userId
    const { actionTaken } = req.body || {}

    const insight = await prisma.aIInsight.findFirst({
      where: { id, organizationId },
    })

    if (!insight) {
      return res.status(404).json({
        success: false,
        message: 'Insight not found',
      })
    }

    await prisma.aIInsight.update({
      where: { id },
      data: {
        actedOn: true,
        actedOnAt: new Date(),
        actedOnBy: userId,
        actionTaken: actionTaken || 'Action taken',
      },
    })

    res.json({
      success: true,
      message: 'Insight marked as acted upon'
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark insight as acted upon',
      error: error.message
    })
  }
}

/**
 * Get AI-powered recommendations — Phase 1D: real data-driven
 * Returns next-best-action suggestions based on pipeline state
 */
export const getRecommendations = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const now = new Date()
    const recommendations: Array<{
      id: string
      type: string
      title: string
      description: string
      priority: string
      actionUrl?: string
      data?: any
    }> = []

    // 1. Follow up with hot leads (high score, recently active)
    const hotLeads = await prisma.lead.findMany({
      where: {
        organizationId,
        status: { notIn: ['WON', 'LOST'] },
        score: { gte: 70 },
      },
      select: { id: true, firstName: true, lastName: true, score: true, stage: true },
      orderBy: { score: 'desc' },
      take: 5,
    })
    if (hotLeads.length > 0) {
      recommendations.push({
        id: 'follow-up-hot',
        type: 'follow_up',
        title: `Follow up with ${hotLeads.length} hot leads`,
        description: `These leads have high scores (70+) and are likely ready to convert. Prioritize reaching out today.`,
        priority: 'high',
        actionUrl: '/leads?sort=score&order=desc',
        data: { leads: hotLeads.slice(0, 3).map(l => ({ name: `${l.firstName} ${l.lastName}`, score: l.score, stage: l.stage })) },
      })
    }

    // 2. Best time to send emails (analyze campaign performance)
    const campaigns = await prisma.campaignAnalytics.findMany({
      where: { organizationId },
      include: { campaign: { select: { lastSentAt: true, type: true } } },
      orderBy: { openRate: 'desc' },
      take: 20,
    })
    if (campaigns.length >= 3) {
      // Find best-performing day of week
      const dayStats: Record<number, { opens: number; count: number }> = {}
      for (const c of campaigns) {
        if (c.campaign.lastSentAt) {
          const day = c.campaign.lastSentAt.getDay()
          if (!dayStats[day]) dayStats[day] = { opens: 0, count: 0 }
          dayStats[day].opens += c.openRate || 0
          dayStats[day].count++
        }
      }
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      let bestDay = -1
      let bestAvg = 0
      for (const [day, stats] of Object.entries(dayStats)) {
        const avg = stats.opens / stats.count
        if (avg > bestAvg) {
          bestAvg = avg
          bestDay = parseInt(day)
        }
      }
      if (bestDay >= 0) {
        recommendations.push({
          id: 'best-send-day',
          type: 'optimization',
          title: `Your ${dayNames[bestDay]} emails perform best`,
          description: `Based on your campaign data, emails sent on ${dayNames[bestDay]} have the highest open rates. Consider scheduling important campaigns for this day.`,
          priority: 'medium',
          actionUrl: '/campaigns',
          data: { bestDay: dayNames[bestDay], avgOpenRate: (bestAvg * 100).toFixed(1) },
        })
      }
    }

    // 3. Leads needing stage advancement
    const readyToAdvance = await prisma.lead.findMany({
      where: {
        organizationId,
        status: { notIn: ['WON', 'LOST'] },
        score: { gte: 60 },
        stage: { in: ['NEW', 'CONTACTED'] },
      },
      select: { id: true, firstName: true, lastName: true, score: true, stage: true },
      take: 5,
    })
    if (readyToAdvance.length > 0) {
      recommendations.push({
        id: 'advance-stage',
        type: 'pipeline',
        title: `${readyToAdvance.length} leads may be ready to advance`,
        description: `These leads have high scores but are still in early stages. Review them for stage advancement.`,
        priority: 'medium',
        actionUrl: '/leads',
        data: { leads: readyToAdvance.slice(0, 3).map(l => ({ name: `${l.firstName} ${l.lastName}`, score: l.score, stage: l.stage })) },
      })
    }

    // 4. Recalibration recommendation
    const models = await prisma.leadScoringModel.findMany({
      where: { organizationId },
    })
    for (const model of models) {
      if (model.lastTrainedAt) {
        const daysSinceTraining = Math.floor((now.getTime() - model.lastTrainedAt.getTime()) / (1000 * 60 * 60 * 24))
        if (daysSinceTraining > 14) {
          recommendations.push({
            id: `recalibrate-${model.id}`,
            type: 'model_maintenance',
            title: `Scoring model hasn't been recalibrated in ${daysSinceTraining} days`,
            description: `Regular recalibration ensures your lead scores stay accurate. Consider running a recalibration.`,
            priority: daysSinceTraining > 30 ? 'high' : 'low',
            actionUrl: '/ai-hub',
          })
          break // Only show one recalibration recommendation
        }
      }
    }

    // 5. Campaign suggestions based on pipeline
    const newLeadsCount = await prisma.lead.count({
      where: { organizationId, stage: 'NEW' },
    })
    if (newLeadsCount > 10) {
      recommendations.push({
        id: 'nurture-new-leads',
        type: 'campaign',
        title: `${newLeadsCount} new leads could benefit from a nurture campaign`,
        description: `Create an automated email sequence to engage new leads and move them through your pipeline.`,
        priority: 'medium',
        actionUrl: '/campaigns/new',
      })
    }

    res.json({
      success: true,
      data: recommendations,
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommendations',
      error: error.message
    })
  }
}

/**
 * Get lead score for a specific lead — uses real scoring from intelligence service
 */
export const getLeadScore = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params
    const intelligence = getIntelligenceService()
    const score = await intelligence.calculateLeadScore(leadId)
    
    res.json({
      success: true,
      data: score
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to calculate lead score',
      error: error.message
    })
  }
}

/**
 * GET /api/ai/lead/:leadId/score-factors
 * Returns detailed breakdown of why a lead has its score
 */
export const getLeadScoreFactors = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params
    const breakdown = await getLeadScoreBreakdown(leadId)
    res.json({ success: true, data: breakdown })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to get score factors',
      error: error.message,
    })
  }
}

/**
 * Recalculate scores for all leads
 */
export const recalculateScores = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const userId = req.user!.userId

    const leads = await prisma.lead.findMany({
      where: { organizationId },
      select: { id: true },
    })

    if (leads.length === 0) {
      return res.json({
        success: true,
        message: 'No leads to recalculate',
        data: { status: 'completed', leadsProcessed: 0 },
      })
    }

    // Respond immediately, then process in background
    res.json({
      success: true,
      message: 'Score recalculation initiated',
      data: {
        status: 'initiated',
        leadsToProcess: leads.length,
        estimatedTime: `${Math.ceil(leads.length / 100)} minutes`,
      },
    })

    // Fire-and-forget: recalculate with user's custom weights
    const leadIds = leads.map((l) => l.id)
    updateMultipleLeadScores(leadIds, userId).catch((err) => {
      console.error('Background recalculation error:', err)
    })

    // Track usage
    await incrementAIUsage(organizationId, 'scoringRecalculations')
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to recalculate scores',
      error: error.message,
    })
  }
}

/**
 * GET /api/ai/predictions — Global predictions from real org data
 * Returns conversion trends, pipeline velocity, revenue forecast
 */
export const getGlobalPredictions = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId

    // Get leads with their activities for trend analysis
    const leads = await prisma.lead.findMany({
      where: { organizationId },
      include: {
        activities: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 1. Monthly conversion rates (last 6 months)
    const now = new Date()
    const monthlyConversions: Array<{ month: string; converted: number; total: number; rate: number }> = []
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      const monthLabel = start.toLocaleString('en', { month: 'short', year: '2-digit' })
      const monthLeads = leads.filter(l => l.createdAt >= start && l.createdAt <= end)
      const converted = monthLeads.filter(l => l.status === 'WON').length
      const total = monthLeads.length
      monthlyConversions.push({
        month: monthLabel,
        converted,
        total,
        rate: total > 0 ? Math.round((converted / total) * 100) : 0,
      })
    }

    // 2. Pipeline velocity — avg days per stage transition
    const stageOrder = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON']
    const stageLeads = leads.filter(l => l.stage && stageOrder.includes(l.stage))
    const avgDaysInPipeline = stageLeads.length > 0
      ? Math.round(stageLeads.reduce((sum, l) => {
          const days = Math.floor((now.getTime() - l.createdAt.getTime()) / (1000 * 60 * 60 * 24))
          return sum + days
        }, 0) / stageLeads.length)
      : 0

    // Stage distribution
    const stageDistribution = stageOrder.map(stage => ({
      stage,
      count: leads.filter(l => l.stage === stage).length,
    }))

    // 3. Revenue forecast — project from deal values
    const wonLeads = leads.filter(l => l.status === 'WON')
    const totalRevenue = wonLeads.reduce((sum, l) => sum + (l.value || 0), 0)
    const avgMonthlyRevenue = totalRevenue > 0 ? Math.round(totalRevenue / 6) : 0
    
    // Leads in late pipeline stages (PROPOSAL, NEGOTIATION) — potential revenue
    const pipelineLeads = leads.filter(l => l.stage === 'PROPOSAL' || l.stage === 'NEGOTIATION')
    const pipelineValue = pipelineLeads.reduce((sum, l) => sum + (l.value || 0), 0)
    
    // Simple linear projection for next 3 months
    const revenueRates = monthlyConversions.map(m => m.rate)
    const avgRate = revenueRates.length > 0
      ? revenueRates.reduce((s, r) => s + r, 0) / revenueRates.length
      : 0
    const trend = revenueRates.length >= 2
      ? (revenueRates[revenueRates.length - 1] - revenueRates[0]) / revenueRates.length
      : 0

    const revenueForecast = []
    for (let i = 1; i <= 3; i++) {
      const projectedMonth = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const label = projectedMonth.toLocaleString('en', { month: 'short', year: '2-digit' })
      const projectedRate = Math.min(100, Math.max(0, avgRate + trend * i))
      revenueForecast.push({
        month: label,
        predicted: Math.round(avgMonthlyRevenue * (1 + trend * i / 100)),
        confidence: Math.max(50, Math.round(85 - i * 10)),
      })
    }

    // 4. Build predictions list
    const predictions = []

    // Conversion trend prediction
    const lastRate = monthlyConversions.length > 0 ? monthlyConversions[monthlyConversions.length - 1].rate : 0
    predictions.push({
      id: 'conversion-trend',
      title: 'Conversion Rate Trend',
      prediction: trend >= 0
        ? `Conversion rate trending up — projected ${Math.min(100, Math.round(lastRate + trend * 3))}% in 3 months`
        : `Conversion rate declining — projected ${Math.max(0, Math.round(lastRate + trend * 3))}% in 3 months`,
      confidence: Math.round(70 + Math.min(20, leads.length / 10)),
      impact: Math.abs(trend) > 2 ? 'high' : 'medium',
      status: trend >= 0 ? 'positive' : 'warning',
      details: `Based on ${leads.length} leads over 6 months (current rate: ${lastRate}%)`,
      dataPoints: leads.length,
    })

    // Pipeline velocity prediction
    predictions.push({
      id: 'pipeline-velocity',
      title: 'Pipeline Velocity',
      prediction: avgDaysInPipeline > 30
        ? `Avg deal cycle is ${avgDaysInPipeline} days — consider optimizing follow-ups`
        : `Avg deal cycle is ${avgDaysInPipeline} days — healthy velocity`,
      confidence: stageLeads.length > 5 ? 80 : 60,
      impact: avgDaysInPipeline > 45 ? 'high' : 'medium',
      status: avgDaysInPipeline > 45 ? 'warning' : 'positive',
      details: `${stageLeads.length} leads actively in pipeline`,
      dataPoints: stageLeads.length,
    })

    // Revenue forecast prediction
    if (pipelineValue > 0) {
      predictions.push({
        id: 'revenue-forecast',
        title: 'Revenue Pipeline',
        prediction: `$${pipelineValue.toLocaleString()} in late-stage pipeline (${pipelineLeads.length} deals)`,
        confidence: 75,
        impact: pipelineValue > avgMonthlyRevenue ? 'high' : 'medium',
        status: 'positive',
        details: `${pipelineLeads.length} deals in Proposal/Negotiation stage`,
        dataPoints: pipelineLeads.length,
      })
    }

    // At-risk leads prediction
    const atRiskLeads = leads.filter(l => {
      if (!l.lastContactAt) return true
      const daysSinceContact = Math.floor((now.getTime() - l.lastContactAt.getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceContact > 14 && l.status !== 'WON' && l.status !== 'LOST'
    })
    if (atRiskLeads.length > 0) {
      predictions.push({
        id: 'at-risk',
        title: 'At-Risk Leads',
        prediction: `${atRiskLeads.length} leads haven't been contacted in 14+ days`,
        confidence: 90,
        impact: atRiskLeads.length > 5 ? 'high' : 'medium',
        status: 'warning',
        details: `These leads may disengage without follow-up`,
        dataPoints: atRiskLeads.length,
      })
    }

    // Stats summary
    const totalPredictions = predictions.length
    const avgConfidence = totalPredictions > 0
      ? Math.round(predictions.reduce((s, p) => s + p.confidence, 0) / totalPredictions)
      : 0
    const highImpact = predictions.filter(p => p.impact === 'high').length

    res.json({
      success: true,
      data: {
        predictions,
        stats: {
          activePredictions: totalPredictions,
          avgConfidence,
          highImpactAlerts: highImpact,
          accuracy: Math.round(avgRate),
        },
        conversionTrend: monthlyConversions,
        revenueForecast: [
          ...monthlyConversions.map(m => ({ month: m.month, actual: m.converted * (avgMonthlyRevenue > 0 ? Math.round(avgMonthlyRevenue / (m.total || 1)) : 1000) })),
          ...revenueForecast,
        ],
        stageDistribution,
        pipelineSummary: {
          avgDaysInPipeline,
          totalPipelineValue: pipelineValue,
          activeDeals: stageLeads.length,
        },
      }
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate global predictions',
      error: error.message,
    })
  }
}

/**
 * Get predictions for a specific lead — uses real intelligence service
 */
export const getPredictions = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params
    const intelligence = getIntelligenceService()
    const prediction = await intelligence.predictLeadConversion(leadId)
    
    res.json({
      success: true,
      data: {
        leadId,
        conversionProbability: prediction.conversionProbability,
        estimatedTimeToConversion: prediction.conversionProbability >= 80 ? '7-14 days' : prediction.conversionProbability >= 60 ? '14-30 days' : '30+ days',
        recommendedActions: [
          'Schedule a follow-up call',
          'Send personalized email',
          'Share relevant case study'
        ],
        churnRisk: prediction.conversionProbability < 50 ? 'high' : prediction.conversionProbability < 70 ? 'medium' : 'low',
        nextBestAction: prediction.conversionProbability >= 70 ? 'Close deal' : 'Nurture relationship',
        confidence: prediction.confidence,
        factors: prediction.factors,
        reasoning: prediction.reasoning,
      }
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate predictions',
      error: error.message
    })
  }
}

/**
 * Enhance a message using AI — uses real intelligence service
 */
export const enhanceMessage = async (req: Request, res: Response) => {
  try {
    const { message, type, tone } = req.body
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      })
    }
    
    const intelligence = getIntelligenceService()
    const enhanced = await intelligence.enhanceMessage(message, type, tone)
    
    // Track usage
    const organizationId = req.user!.organizationId
    await incrementAIUsage(organizationId, 'enhancements')

    res.json({
      success: true,
      data: enhanced
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to enhance message',
      error: error.message
    })
  }
}

/**
 * Get AI-suggested actions for a context — uses real intelligence service
 */
export const suggestActions = async (req: Request, res: Response) => {
  try {
    const { context, leadId, campaignId } = req.body
    
    const intelligence = getIntelligenceService()
    const actions = await intelligence.suggestActions({
      context,
      leadId,
      campaignId
    })
    
    res.json({
      success: true,
      data: actions
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to suggest actions',
      error: error.message
    })
  }
}

/**
 * Get feature importance analysis — reads real model factors when available
 */
export const getFeatureImportance = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId

    // Try to load actual scoring model factors for this org
    const model = await prisma.leadScoringModel.findFirst({
      where: { organizationId },
      orderBy: { lastTrainedAt: 'desc' },
    })

    const factors = (model?.factors as Record<string, number> | null) ?? {}
    const scoringConfig = await prisma.scoringConfig.findUnique({ where: { organizationId } })
    const configWeights = (scoringConfig?.weights as Record<string, number> | null) ?? {}

    // Build dynamic weights: prefer model factors, then scoring config, then defaults
    const scoreWeight   = factors.scoreWeight   ?? configWeights.scoreWeight   ?? 30
    const activityWeight = factors.activityWeight ?? configWeights.activityWeight ?? 30
    const recencyWeight  = factors.recencyWeight  ?? configWeights.recencyWeight  ?? 20
    const funnelWeight   = factors.funnelTimeWeight ?? configWeights.funnelTimeWeight ?? 20

    const weights: Record<string, { label: string; weight: number; color: string }> = {
      scoreWeight:    { label: 'Lead Score (Demographics & Fit)',   weight: scoreWeight,   color: '#3b82f6' },
      activityWeight: { label: 'Activity & Engagement',            weight: activityWeight, color: '#10b981' },
      recencyWeight:  { label: 'Recency & Timing',                 weight: recencyWeight,  color: '#f59e0b' },
      funnelWeight:   { label: 'Funnel Progression',               weight: funnelWeight,   color: '#8b5cf6' },
    }

    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w.weight, 0)
    const data = Object.values(weights).map(w => ({
      name: w.label,
      value: totalWeight > 0 ? Math.round((w.weight / totalWeight) * 100) : 25,
      color: w.color,
    }))

    res.json({
      success: true,
      data,
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feature importance',
      error: error.message
    })
  }
}

/**
 * Chat with AI Assistant (OpenAI GPT-4)
 */
export const chatWithAI = async (req: Request, res: Response) => {
  try {
    console.log('🎤 Chat request received:', req.body?.message?.substring(0, 100))
    const { message, conversationHistory, tone } = req.body
    const userId = req.user!.userId
    const organizationId = req.user!.organizationId
    console.log('👤 User:', userId, 'Org:', organizationId)

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      })
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'AI chatbot is not configured. Please add OPENAI_API_KEY to environment variables.'
      })
    }

    const openAI = getOpenAIService()
    const functionsService = getAIFunctionsService()

    const selectedTone = tone || 'FRIENDLY'
    const toneConfig = ASSISTANT_TONES[selectedTone as AssistantTone] || ASSISTANT_TONES.FRIENDLY

    const messages = [
      {
        role: 'system' as const,
        content: `You are a highly experienced real estate AI assistant with 20+ years of industry expertise. 
You're integrated into a professional CRM and act as the user's virtual chief of staff and strategist.

YOUR ROLE:
- Senior real estate advisor and business partner
- Proactive problem identifier and opportunity spotter
- Expert in lead management, conversion optimization, and market strategy
- Supportive coach who celebrates wins and guides through challenges
- YOU CAN ACTUALLY PERFORM ACTIONS - Don't just give guides, DO THE THING!

YOUR CAPABILITIES - YOU CAN:
✅ CREATE leads (use create_lead function)
✅ UPDATE leads (use update_lead function)
✅ DELETE leads (use delete_lead function)
✅ ADD notes to leads (use add_note_to_lead function)
✅ ADD tags to leads (use add_tag_to_lead function)
✅ LOG activities (use create_activity function)
✅ SEND emails (use send_email function)
✅ SEND SMS messages (use send_sms function)
✅ SCHEDULE appointments (use schedule_appointment function)
✅ CREATE tasks and reminders
✅ SEARCH and analyze leads
✅ COMPOSE emails, SMS, and call scripts
✅ PREDICT conversions
✅ RECOMMEND next actions

IMPORTANT INSTRUCTIONS:
- When user asks you to DO something, USE THE FUNCTION to do it
- Don't say "Here's how to create a lead" - Just CREATE it using create_lead
- Don't say "You can add a note" - Just ADD it using add_note_to_lead
- Be proactive: if user gives you lead info, CREATE the lead immediately
- After performing action, confirm what you did with the result

EXAMPLES:
User: "Create a lead for John Smith, email john@example.com"
You: [USE create_lead function] → "✅ Created new lead: John Smith (ID: abc123)"

User: "Add a note to lead abc123 saying he's interested in downtown properties"
You: [USE add_note_to_lead function] → "✅ Added note to John Smith"

User: "Schedule a meeting with lead abc123 tomorrow at 2pm"
You: [USE schedule_appointment function] → "📅 Scheduled meeting with John Smith"

YOUR PERSONALITY:
- Professional yet approachable and friendly
- Direct and action-oriented (DO things, don't just describe them)
- Data-driven with strategic insights
- Proactive (suggest AND execute, don't just answer)
- Empathetic and supportive
- Results-focused

TONE SETTINGS: ${toneConfig.systemAddition}`,
      },
      ...(conversationHistory || []),
      {
        role: 'user' as const,
        content: message,
      },
    ]

    const response = await openAI.chatWithFunctions(messages, AI_FUNCTIONS, userId, organizationId)

    if (response.functionCall) {
      console.log(`🎯 Executing function: ${response.functionCall.name}`)
      
      const functionResult = await functionsService.executeFunction(
        response.functionCall.name,
        response.functionCall.arguments,
        organizationId,
        userId
      )

      console.log(`✅ Function result:`, functionResult.substring(0, 200))

      // Use tools format for OpenAI SDK v4+
      const finalMessages = [
        ...messages,
        {
          role: 'assistant' as const,
          content: null,
          tool_calls: [{
            id: 'call_' + Date.now(),
            type: 'function' as const,
            function: {
              name: response.functionCall.name,
              arguments: JSON.stringify(response.functionCall.arguments),
            },
          }],
        },
        {
          role: 'tool' as const,
          tool_call_id: 'call_' + Date.now(),
          content: functionResult,
        },
      ]

      const finalResponse = await openAI.chat(finalMessages, userId, organizationId)

      await prisma.chatMessage.create({
        data: {
          userId,
          organizationId,
          role: 'user',
          content: message,
          tokens: null,
          cost: null,
        },
      })

      await prisma.chatMessage.create({
        data: {
          userId,
          organizationId,
          role: 'assistant',
          content: finalResponse.response,
          tokens: response.tokens + finalResponse.tokens,
          cost: response.cost + finalResponse.cost,
          metadata: {
            functionCall: response.functionCall.name,
            functionArgs: response.functionCall.arguments,
          } as never,
        },
      })

      // Track AI usage
      await incrementAIUsage(organizationId, 'aiMessages', {
        tokens: response.tokens + finalResponse.tokens,
        cost: response.cost + finalResponse.cost,
      })

      return res.json({
        success: true,
        data: {
          message: finalResponse.response,
          tokens: response.tokens + finalResponse.tokens,
          cost: response.cost + finalResponse.cost,
          functionUsed: response.functionCall.name,
        },
      })
    }

    await prisma.chatMessage.create({
      data: {
        userId,
        organizationId,
        role: 'user',
        content: message,
        tokens: null,
        cost: null,
      },
    })

    await prisma.chatMessage.create({
      data: {
        userId,
        organizationId,
        role: 'assistant',
        content: response.response,
        tokens: response.tokens,
        cost: response.cost,
      },
    })

    // Track AI usage
    await incrementAIUsage(organizationId, 'aiMessages', {
      tokens: response.tokens,
      cost: response.cost,
    })

    res.json({
      success: true,
      data: {
        message: response.response,
        tokens: response.tokens,
        cost: response.cost,
      },
    })
  } catch (error: any) {
    console.error('Chat error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to process chat message',
      error: error.message
    })
  }
}

/**
 * Get chat history
 */
export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const organizationId = req.user!.organizationId
    const limit = parseInt(req.query.limit as string) || 50

    const messages = await prisma.chatMessage.findMany({
      where: { userId, organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        role: true,
        content: true,
        tokens: true,
        cost: true,
        createdAt: true,
      },
    })

    messages.reverse()

    res.json({
      success: true,
      data: { messages, total: messages.length },
    })
  } catch (error: any) {
    console.error('Chat history error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat history',
      error: error.message
    })
  }
}

/**
 * Clear chat history
 */
export const clearChatHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const organizationId = req.user!.organizationId

    const result = await prisma.chatMessage.deleteMany({
      where: { userId, organizationId },
    })

    res.json({
      success: true,
      data: { deleted: result.count },
    })
  } catch (error: any) {
    console.error('Clear chat history error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to clear chat history',
      error: error.message
    })
  }
}

/**
 * Get AI usage statistics
 */
export const getAIUsage = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const chatStats = await prisma.chatMessage.aggregate({
      where: {
        organizationId,
        createdAt: { gte: startDate },
        role: 'assistant',
      },
      _sum: { tokens: true, cost: true },
      _count: { id: true },
    })

    // Also return usage-tracked data
    const usageWithLimits = await getUsageWithLimits(organizationId)

    res.json({
      success: true,
      data: {
        period: { start: startDate, end: new Date() },
        chat: {
          totalMessages: chatStats._count.id,
          totalTokens: chatStats._sum.tokens || 0,
          totalCost: chatStats._sum.cost || 0,
        },
        monthly: usageWithLimits,
      },
    })
  } catch (error: any) {
    console.error('Usage stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch usage statistics',
      error: error.message
    })
  }
}

/**
 * Get AI usage limits and current usage for the org (Phase 2D)
 * Used by frontend to show "X of Y AI messages used this month"
 */
export const getAIUsageLimits = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const usageWithLimits = await getUsageWithLimits(organizationId)
    const costHistory = await getCostBreakdown(organizationId, 6)

    res.json({
      success: true,
      data: {
        ...usageWithLimits,
        costHistory,
      },
    })
  } catch (error: any) {
    console.error('Usage limits error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch usage limits',
      error: error.message,
    })
  }
}

/**
 * Generate content with AI
 */
export const generateEmailSequence = async (req: Request, res: Response) => {
  try {
    const { leadName, propertyType, goal, tone, sequenceLength } = req.body

    if (!goal) {
      return res.status(400).json({
        success: false,
        message: 'Goal is required for email sequence generation',
      })
    }

    const openAIService = getOpenAIService()
    const emails = await openAIService.generateEmailSequence({
      leadName,
      propertyType,
      goal,
      tone,
      sequenceLength,
    })

    // Track usage
    await incrementAIUsage(req.user!.organizationId, 'contentGenerations')

    res.json({
      success: true,
      data: { emails, count: emails.length },
    })
  } catch (error: any) {
    console.error('Email sequence generation error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to generate email sequence',
      error: error.message,
    })
  }
}

export const generateSMS = async (req: Request, res: Response) => {
  try {
    const { leadName, propertyType, goal, tone } = req.body

    if (!goal) {
      return res.status(400).json({
        success: false,
        message: 'Goal is required for SMS generation',
      })
    }

    const openAIService = getOpenAIService()
    const sms = await openAIService.generateSMS({
      leadName,
      propertyType,
      goal,
      tone,
    })

    // Track usage
    await incrementAIUsage(req.user!.organizationId, 'contentGenerations')

    res.json({
      success: true,
      data: { message: sms, length: sms.length },
    })
  } catch (error: any) {
    console.error('SMS generation error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to generate SMS',
      error: error.message,
    })
  }
}

export const generatePropertyDescription = async (req: Request, res: Response) => {
  try {
    const { address, propertyType, bedrooms, bathrooms, squareFeet, price, features, neighborhood } = req.body

    if (!address || !propertyType) {
      return res.status(400).json({
        success: false,
        message: 'Address and property type are required',
      })
    }

    const openAIService = getOpenAIService()
    const description = await openAIService.generatePropertyDescription({
      address,
      propertyType,
      bedrooms,
      bathrooms,
      squareFeet,
      price,
      features,
      neighborhood,
    })

    // Track usage
    await incrementAIUsage(req.user!.organizationId, 'contentGenerations')

    res.json({
      success: true,
      data: { description, wordCount: description.split(' ').length },
    })
  } catch (error: any) {
    console.error('Property description generation error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to generate property description',
      error: error.message,
    })
  }
}

export const generateSocialPosts = async (req: Request, res: Response) => {
  try {
    const { topic, propertyAddress, platforms, tone } = req.body

    if (!topic || !platforms || !Array.isArray(platforms)) {
      return res.status(400).json({
        success: false,
        message: 'Topic and platforms array are required',
      })
    }

    const openAIService = getOpenAIService()
    const posts = await openAIService.generateSocialPosts({
      topic,
      propertyAddress,
      platforms,
      tone,
    })

    // Track usage
    await incrementAIUsage(req.user!.organizationId, 'contentGenerations')

    res.json({
      success: true,
      data: { posts, platforms: Object.keys(posts) },
    })
  } catch (error: any) {
    console.error('Social posts generation error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to generate social posts',
      error: error.message,
    })
  }
}

export const generateListingPresentation = async (req: Request, res: Response) => {
  try {
    const { address, propertyType, estimatedValue, comparables, marketTrends } = req.body

    if (!address || !propertyType) {
      return res.status(400).json({
        success: false,
        message: 'Address and property type are required',
      })
    }

    const openAIService = getOpenAIService()
    const presentation = await openAIService.generateListingPresentation({
      address,
      propertyType,
      estimatedValue,
      comparables,
      marketTrends,
    })

    // Track usage
    await incrementAIUsage(req.user!.organizationId, 'contentGenerations')

    res.json({
      success: true,
      data: presentation,
    })
  } catch (error: any) {
    console.error('Listing presentation generation error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to generate listing presentation',
      error: error.message,
    })
  }
}

/**
 * Compose message with AI (Phase 1)
 */
export const composeMessage = async (req: Request, res: Response) => {
  try {
    const { leadId, conversationId, messageType, draftMessage, settings,
            // Quick-compose fields (from AIEmailComposer / AISMSComposer)
            leadName, leadEmail, leadPhone, tone, purpose, context: quickContext } = req.body
    const userId = req.user!.userId
    const organizationId = req.user!.organizationId

    // Determine message type — explicit or inferred from quick-compose
    const resolvedType = messageType || (leadPhone ? 'sms' : 'email')

    if (!['email', 'sms', 'call'].includes(resolvedType)) {
      return res.status(400).json({
        success: false,
        message: 'messageType must be email, sms, or call'
      })
    }

    // Quick-compose mode: no leadId/conversationId required
    const isQuickCompose = !leadId && !conversationId
    if (!isQuickCompose && !leadId) {
      return res.status(400).json({
        success: false,
        message: 'leadId is required (or use quick-compose with leadName/tone/purpose)'
      })
    }

    const composeSettings: ComposeSettings = {
      tone: settings?.tone || tone || 'professional',
      length: settings?.length || 'standard',
      includeCTA: settings?.includeCTA !== false,
      personalization: settings?.personalization || 'standard',
      templateBase: settings?.templateBase,
      includeProperties: settings?.includeProperties,
      addUrgency: settings?.addUrgency || false,
      draftMessage: draftMessage || undefined
    }

    let result
    if (isQuickCompose) {
      // Quick compose — build lightweight context from provided fields
      const prompt = resolvedType === 'email'
        ? `Write a professional ${purpose || 'follow-up'} email to ${leadName || 'a real estate lead'} (${leadEmail || ''}).
Tone: ${composeSettings.tone}. ${quickContext ? `Context: ${quickContext}` : ''}
Return JSON: { "subject": "...", "content": "..." }`
        : `Write a ${purpose || 'follow-up'} SMS (max 160 chars) to ${leadName || 'a real estate lead'} (${leadPhone || ''}).
Tone: ${composeSettings.tone}. ${quickContext ? `Context: ${quickContext}` : ''}
Return JSON: { "content": "..." }`

      const { getOpenAIClient, getModelForTask } = await import('../services/ai-config.service')
      const { client } = await getOpenAIClient(organizationId)
      const model = getModelForTask('content')
      const { withRetryAndFallback } = await import('../utils/ai-retry')

      const { result: completion } = await withRetryAndFallback(
        (c, m) => c.chat.completions.create({
          model: m,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: resolvedType === 'sms' ? 200 : 800,
          response_format: { type: 'json_object' },
        }),
        client, model
      )

      const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
      result = {
        content: parsed.content || parsed.body || parsed.message || '',
        subject: parsed.subject,
        confidence: 0.85,
        messageType: resolvedType,
      }
    } else {
      // Full compose mode with conversation context
      const ctx = await gatherMessageContext(leadId!, conversationId || leadId!, organizationId)
      result = await generateContextualMessage(ctx, resolvedType, composeSettings, userId, organizationId)
    }

    // Track usage
    await incrementAIUsage(organizationId, 'composeUses')

    res.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('Compose message error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to compose message',
      error: error.message
    })
  }
}

/**
 * Generate message variations (Phase 2)
 */
export const composeVariations = async (req: Request, res: Response) => {
  try {
    const { leadId, conversationId, messageType, draftMessage, settings } = req.body
    const userId = req.user!.userId
    const organizationId = req.user!.organizationId

    if (!leadId || !conversationId || !messageType) {
      return res.status(400).json({
        success: false,
        message: 'leadId, conversationId, and messageType are required'
      })
    }

    const composeSettings: ComposeSettings = {
      tone: settings?.tone || 'professional',
      length: settings?.length || 'standard',
      includeCTA: settings?.includeCTA !== false,
      personalization: settings?.personalization || 'standard',
      templateBase: settings?.templateBase,
      includeProperties: settings?.includeProperties,
      addUrgency: settings?.addUrgency || false,
      draftMessage: draftMessage || undefined
    }

    const context = await gatherMessageContext(leadId, conversationId, organizationId)
    const variations = await generateVariations(context, messageType, composeSettings, userId, organizationId)

    // Track usage
    await incrementAIUsage(organizationId, 'composeUses')

    res.json({
      success: true,
      data: { variations, count: variations.length }
    })
  } catch (error: any) {
    console.error('Generate variations error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate variations',
      error: error.message
    })
  }
}

/**
 * Stream message composition (Phase 3)
 */
export const composeMessageStream = async (req: Request, res: Response) => {
  try {
    const { leadId, conversationId, messageType, draftMessage, settings } = req.body
    const userId = req.user!.userId
    const organizationId = req.user!.organizationId

    if (!leadId || !conversationId || !messageType) {
      return res.status(400).json({
        success: false,
        message: 'leadId, conversationId, and messageType are required'
      })
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const composeSettings: ComposeSettings = {
      tone: settings?.tone || 'professional',
      length: settings?.length || 'standard',
      includeCTA: settings?.includeCTA !== false,
      personalization: settings?.personalization || 'standard',
      templateBase: settings?.templateBase,
      includeProperties: settings?.includeProperties,
      addUrgency: settings?.addUrgency || false,
      draftMessage: draftMessage || undefined
    }

    const context = await gatherMessageContext(leadId, conversationId, organizationId)

    res.write(`data: ${JSON.stringify({ 
      type: 'context', 
      data: {
        leadName: context.lead.name,
        leadScore: context.lead.score
      }
    })}\n\n`)

    const openAI = getOpenAIService()
    
    // Build prompt based on whether draft exists
    const prompt = draftMessage 
      ? `Enhance this draft message for ${context.lead.name}:

${draftMessage}

Improve it with ${composeSettings.tone} tone, personalize with lead context, and make it more effective.`
      : `Generate a ${messageType} message for ${context.lead.name} with ${composeSettings.tone} tone.`
    
    const stream = openAI.chatStream(
      [{ role: 'user', content: prompt }],
      userId,
      organizationId
    )

    for await (const token of stream) {
      res.write(`data: ${JSON.stringify({ type: 'token', data: token })}\n\n`)
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
    res.end()

  } catch (error: any) {
    console.error('Stream message error:', error)
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      message: error.message 
    })}\n\n`)
    res.end()
  }
}

/**
 * Get templates (Phase 3)
 */
export const getTemplates = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const { category } = req.query

    const templates = await templateService.getUserTemplates(
      organizationId,
      category as string | undefined
    )

    res.json({
      success: true,
      data: templates
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to load templates',
      error: error.message
    })
  }
}

/**
 * Generate from template (Phase 3)
 */
export const generateTemplateMessage = async (req: Request, res: Response) => {
  try {
    const { templateId, leadId, conversationId, tone } = req.body
    const userId = req.user!.userId
    const organizationId = req.user!.organizationId

    if (!templateId || !leadId || !conversationId) {
      return res.status(400).json({
        success: false,
        message: 'templateId, leadId, and conversationId are required'
      })
    }

    const result = await templateService.generateFromTemplate(
      templateId,
      { leadId, conversationId },
      tone || 'professional',
      userId,
      organizationId
    )

    res.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate from template',
      error: error.message
    })
  }
}

/**
 * Save as template (Phase 3)
 */
export const saveMessageAsTemplate = async (req: Request, res: Response) => {
  try {
    const { message, name, category } = req.body
    const userId = req.user!.userId
    const organizationId = req.user!.organizationId

    if (!message || !name || !category) {
      return res.status(400).json({
        success: false,
        message: 'message, name, and category are required'
      })
    }

    const template = await templateService.saveAsTemplate(
      message,
      name,
      category,
      organizationId,
      userId
    )

    res.json({
      success: true,
      data: template
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to save template',
      error: error.message
    })
  }
}

/**
 * Get preferences (Phase 3 — expanded for AI Hub rebuild)
 * Returns all AI preferences: chatbot, composer, profile, feature toggles
 */
export const getPreferences = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId

    const preferences = await preferencesService.getFullAIPreferences(userId)

    res.json({
      success: true,
      data: preferences
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to load preferences',
      error: error.message
    })
  }
}

/**
 * Save preferences (Phase 4 — expanded for AI Hub rebuild)
 * Accepts partial updates across chatbot, composer, profile, and feature toggles
 */
export const savePreferences = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const organizationId = req.user!.organizationId
    const body = req.body

    // Support both legacy flat format (composer-only) and new structured format
    let prefsToSave: any = body
    if (body.defaultTone !== undefined || body.defaultLength !== undefined || body.defaultCTA !== undefined) {
      // Legacy flat format — wrap in composer
      prefsToSave = { composer: body }
    }

    const updated = await preferencesService.saveAllAIPreferences(userId, prefsToSave, organizationId)

    res.json({
      success: true,
      data: updated
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to save preferences',
      error: error.message
    })
  }
}

// In-memory recalibration job tracking
interface RecalibrationJob {
  id: string
  status: 'running' | 'completed' | 'failed'
  startedAt: Date
  completedAt?: Date
  result?: {
    accuracy: number
    sampleSize: number
    improvements: string[]
  }
  error?: string
}
const recalibrationJobs = new Map<string, RecalibrationJob>()

/**
 * POST /api/ai/recalibrate
 * Triggers ML optimization run for the current user
 */
export const recalibrateModel = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const organizationId = req.user!.organizationId

    // Check if a job is already running for this user
    const existing = recalibrationJobs.get(userId)
    if (existing && existing.status === 'running') {
      return res.json({
        success: true,
        data: { jobId: existing.id, status: 'running', startedAt: existing.startedAt },
        message: 'Recalibration already in progress',
      })
    }

    const jobId = `recal_${userId}_${Date.now()}`
    const job: RecalibrationJob = {
      id: jobId,
      status: 'running',
      startedAt: new Date(),
    }
    recalibrationJobs.set(userId, job)

    // Respond immediately
    res.json({
      success: true,
      data: { jobId, status: 'running', startedAt: job.startedAt },
      message: 'Model recalibration started',
    })

    // Run optimization in background
    const { getMLOptimizationService } = await import('../services/ml-optimization.service')
    const mlService = getMLOptimizationService()
    try {
      const startTime = Date.now()
      // Capture accuracy BEFORE optimization writes the new value
      const preModel = await prisma.leadScoringModel.findUnique({ where: { userId } })
      const accuracyBefore = preModel?.accuracy ?? null

      const result = await mlService.optimizeScoringWeights(userId, organizationId)
      const duration = Date.now() - startTime

      job.status = 'completed'
      job.completedAt = new Date()
      job.result = {
        accuracy: result.accuracy,
        sampleSize: result.sampleSize,
        improvements: result.improvements,
      }

      // Phase 1A: Persist model performance history
      await prisma.modelPerformanceHistory.create({
        data: {
          organizationId,
          userId,
          modelType: 'lead_scoring',
          accuracyBefore,
          accuracyAfter: result.accuracy,
          sampleSize: result.sampleSize,
          improvements: result.improvements as any,
          trainingDuration: duration,
          metadata: {
            oldWeights: result.oldWeights,
            newWeights: result.newWeights,
          } as any,
        },
      })

      // Track usage
      await incrementAIUsage(organizationId, 'scoringRecalculations')

      console.log(`✅ Recalibration complete for user ${userId}: accuracy ${result.accuracy}%`)
    } catch (err: any) {
      job.status = 'failed'
      job.completedAt = new Date()
      job.error = err.message || 'Unknown error'
      console.error(`❌ Recalibration failed for user ${userId}:`, err)
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to start recalibration',
      error: error.message,
    })
  }
}

/**
 * GET /api/ai/recalibration-status
 * Returns the status of the current user's recalibration job
 */
export const getRecalibrationStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const job = recalibrationJobs.get(userId)

    if (!job) {
      return res.json({
        success: true,
        data: { status: 'none', message: 'No recalibration job found' },
      })
    }

    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        result: job.result,
        error: job.error,
      },
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to get recalibration status',
      error: error.message,
    })
  }
}

/**
 * Reset preferences (Phase 3)
 */
export const resetPreferences = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId

    await preferencesService.resetComposerPreferences(userId)
    // Return the full defaults
    const defaults = await preferencesService.getFullAIPreferences(userId)

    res.json({
      success: true,
      data: defaults
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to reset preferences',
      error: error.message
    })
  }
}
