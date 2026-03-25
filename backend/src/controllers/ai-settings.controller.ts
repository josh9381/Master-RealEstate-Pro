import { getErrorMessage } from '../utils/errors'
import { logger } from '../lib/logger'
import { Request, Response } from 'express'
import * as preferencesService from '../services/user-preferences.service'
import { getUsageWithLimits, getCostBreakdown } from '../services/usage-tracking.service'
import { getOrgAISettings, updateOrgAISettings, MODEL_PRICING, MODEL_TIERS } from '../services/ai-config.service'
import prisma from '../config/database'
import { calcRate, calcPercentChange, roundTo2 } from '../utils/metricsCalculator'
import { recalibrationJobs } from './ai-scoring.controller'
import { invalidateTierCache } from '../routes/ai.routes'

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
    const messageChange = calcPercentChange(messagesThisMonth, messagesLastMonth)

    // Active insights count
    const activeInsights = await prisma.aIInsight.count({
      where: { organizationId, dismissed: false, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    })
    const highPriorityInsights = await prisma.aIInsight.count({
      where: { organizationId, dismissed: false, priority: { in: ['HIGH', 'CRITICAL'] }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
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
        totalCostThisMonth: costData._sum.cost ? roundTo2(costData._sum.cost) : 0,
      },
    })
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI statistics',
      error: getErrorMessage(error)
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
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI features',
      error: getErrorMessage(error)
    })
  }
}

/**
 * Get model performance metrics over time
 * Phase 1A — returns real ModelPerformanceHistory data
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
  } catch (error: unknown) {
    logger.error('Usage stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch usage statistics',
      error: getErrorMessage(error)
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
  } catch (error: unknown) {
    logger.error('Usage limits error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch usage limits',
      error: getErrorMessage(error),
    })
  }
}

/**
 * Generate content with AI
 */
export const getPreferences = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId

    const preferences = await preferencesService.getFullAIPreferences(userId)

    res.json({
      success: true,
      data: preferences
    })
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to load preferences',
      error: getErrorMessage(error)
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let prefsToSave: Record<string, any> = body
    if (body.defaultTone !== undefined || body.defaultLength !== undefined || body.defaultCTA !== undefined) {
      // Legacy flat format — wrap in composer
      prefsToSave = { composer: body }
    }

    const updated = await preferencesService.saveAllAIPreferences(userId, prefsToSave, organizationId)

    res.json({
      success: true,
      data: updated
    })
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to save preferences',
      error: getErrorMessage(error)
    })
  }
}

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
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to reset preferences',
      error: getErrorMessage(error)
    })
  }
}

// ═══════════════════════════════════════════════════════════════
// Phase 7: AI Features
// ═══════════════════════════════════════════════════════════════

/**
 * 7.1 + 7.2 + 7.3: Get org-level AI settings (model, key, personalization)
 */
export const getOrgSettings = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const settings = await getOrgAISettings(organizationId)
    res.json({ success: true, data: settings })
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: 'Failed to fetch org AI settings', error: getErrorMessage(error) })
  }
}

/**
 * 7.1 + 7.2 + 7.3: Update org-level AI settings (admin only)
 */
export const updateOrgSettings = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const result = await updateOrgAISettings(organizationId, req.body)

    // Invalidate tier cache so rate limits reflect any subscription changes immediately
    invalidateTierCache(organizationId)

    res.json({ success: true, data: result })
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: 'Failed to update org AI settings', error: getErrorMessage(error) })
  }
}

/**
 * 7.1: Get available models with pricing info
 */
export const getAvailableModels = async (req: Request, res: Response) => {
  try {
    const models = Object.entries(MODEL_PRICING).map(([model, pricing]) => {
      // Determine which tier group this model belongs to
      let tier = 'other'
      for (const [t, m] of Object.entries(MODEL_TIERS)) {
        if (m === model) { tier = t; break }
      }
      return {
        model,
        tier,
        inputCost: `$${(pricing.input * 1_000_000).toFixed(2)}/1M tokens`,
        outputCost: `$${(pricing.output * 1_000_000).toFixed(2)}/1M tokens`,
        inputCostRaw: pricing.input * 1_000_000,
        outputCostRaw: pricing.output * 1_000_000,
      }
    })
    res.json({ success: true, data: models })
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: 'Failed to fetch available models', error: getErrorMessage(error) })
  }
}

/**
 * 7.4: AI cost tracking dashboard — detailed breakdown
 */
export const getCostDashboard = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const months = parseInt(req.query.months as string) || 6

    const costHistory = await getCostBreakdown(organizationId, months)
    const usageWithLimits = await getUsageWithLimits(organizationId)

    // Get per-model cost breakdown from chat messages
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const modelBreakdown = await prisma.chatMessage.groupBy({
      by: ['model'],
      where: {
        organizationId,
        role: 'assistant',
        createdAt: { gte: thirtyDaysAgo },
        cost: { not: null },
      },
      _sum: { tokens: true, cost: true },
      _count: { id: true },
    })

    // Get per-user cost breakdown
    const userBreakdown = await prisma.chatMessage.groupBy({
      by: ['userId'],
      where: {
        organizationId,
        role: 'assistant',
        createdAt: { gte: thirtyDaysAgo },
        cost: { not: null },
      },
      _sum: { tokens: true, cost: true },
      _count: { id: true },
    })

    // Fetch user names for the breakdown
    const userIds = userBreakdown.map(u => u.userId)
    const users = userIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    }) : []
    const userMap = new Map(users.map(u => [u.id, u]))

    // Get budget settings
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        aiBudgetWarning: true,
        aiBudgetCaution: true,
        aiBudgetHardLimit: true,
        aiBudgetAlertEnabled: true,
      },
    })

    const currentMonthCost = usageWithLimits.usage.totalCost

    res.json({
      success: true,
      data: {
        currentMonth: {
          cost: currentMonthCost,
          tokens: usageWithLimits.usage.totalTokensUsed,
          tier: usageWithLimits.tier,
          useOwnKey: usageWithLimits.useOwnKey,
        },
        budget: {
          warning: org?.aiBudgetWarning ?? 25,
          caution: org?.aiBudgetCaution ?? 50,
          hardLimit: org?.aiBudgetHardLimit ?? 100,
          alertEnabled: org?.aiBudgetAlertEnabled ?? true,
          currentCost: currentMonthCost,
          status: currentMonthCost >= (org?.aiBudgetHardLimit ?? 100)
            ? 'exceeded'
            : currentMonthCost >= (org?.aiBudgetCaution ?? 50)
            ? 'caution'
            : currentMonthCost >= (org?.aiBudgetWarning ?? 25)
            ? 'warning'
            : 'ok',
        },
        costHistory,
        modelBreakdown: modelBreakdown.map(m => ({
          model: m.model || 'unknown',
          requests: m._count.id,
          tokens: m._sum.tokens || 0,
          cost: m._sum.cost || 0,
        })),
        userBreakdown: userBreakdown.map(u => {
          const user = userMap.get(u.userId)
          return {
            userId: u.userId,
            name: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
            email: user?.email || '',
            requests: u._count.id,
            tokens: u._sum.tokens || 0,
            cost: u._sum.cost || 0,
          }
        }),
      },
    })
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: 'Failed to fetch cost dashboard', error: getErrorMessage(error) })
  }
}

/**
 * 7.5: Submit feedback on a chat message (thumbs up/down)
 */
export const submitChatFeedback = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { feedback, note } = req.body
    const organizationId = req.user!.organizationId

    const message = await prisma.chatMessage.findFirst({
      where: { id, organizationId },
    })

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' })
    }

    const updated = await prisma.chatMessage.update({
      where: { id },
      data: {
        feedback,
        feedbackNote: note || null,
        feedbackAt: new Date(),
      },
    })

    res.json({ success: true, data: { id: updated.id, feedback: updated.feedback } })
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: 'Failed to submit feedback', error: getErrorMessage(error) })
  }
}

/**
 * 7.5: Submit feedback on an AI insight
 */
export const submitInsightFeedback = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { feedback } = req.body
    const userId = req.user!.userId
    const organizationId = req.user!.organizationId

    const insight = await prisma.aIInsight.findFirst({
      where: { id, organizationId },
    })

    if (!insight) {
      return res.status(404).json({ success: false, message: 'Insight not found' })
    }

    const updated = await prisma.aIInsight.update({
      where: { id },
      data: {
        feedback,
        feedbackAt: new Date(),
        feedbackBy: userId,
      },
    })

    res.json({ success: true, data: { id: updated.id, feedback: updated.feedback } })
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: 'Failed to submit insight feedback', error: getErrorMessage(error) })
  }
}

/**
 * 7.5: Get feedback stats for the org
 */
export const getFeedbackStats = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [chatPositive, chatNegative, chatTotal, insightHelpful, insightNotHelpful] = await Promise.all([
      prisma.chatMessage.count({ where: { organizationId, feedback: 'positive', feedbackAt: { gte: thirtyDaysAgo } } }),
      prisma.chatMessage.count({ where: { organizationId, feedback: 'negative', feedbackAt: { gte: thirtyDaysAgo } } }),
      prisma.chatMessage.count({ where: { organizationId, role: 'assistant', createdAt: { gte: thirtyDaysAgo } } }),
      prisma.aIInsight.count({ where: { organizationId, feedback: 'helpful', feedbackAt: { gte: thirtyDaysAgo } } }),
      prisma.aIInsight.count({ where: { organizationId, feedback: 'not_helpful', feedbackAt: { gte: thirtyDaysAgo } } }),
    ])

    res.json({
      success: true,
      data: {
        chat: {
          positive: chatPositive,
          negative: chatNegative,
          total: chatTotal,
          satisfactionRate: chatTotal > 0 ? calcRate(chatPositive, Math.max(1, chatPositive + chatNegative), 0) : null,
        },
        insights: {
          helpful: insightHelpful,
          notHelpful: insightNotHelpful,
          total: insightHelpful + insightNotHelpful,
        },
      },
    })
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: 'Failed to fetch feedback stats', error: getErrorMessage(error) })
  }
}

/**
 * 7.6: AI-powered lead enrichment  
 * Uses GPT to infer/enrich lead data from available context
 */
export const getBudgetSettings = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        aiBudgetWarning: true,
        aiBudgetCaution: true,
        aiBudgetHardLimit: true,
        aiBudgetAlertEnabled: true,
      },
    })

    res.json({
      success: true,
      data: {
        warning: org?.aiBudgetWarning ?? 25,
        caution: org?.aiBudgetCaution ?? 50,
        hardLimit: org?.aiBudgetHardLimit ?? 100,
        alertEnabled: org?.aiBudgetAlertEnabled ?? true,
      },
    })
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: 'Failed to fetch budget settings', error: getErrorMessage(error) })
  }
}

export const updateBudgetSettings = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const { warning, caution, hardLimit, alertEnabled } = req.body

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(warning !== undefined && { aiBudgetWarning: warning }),
        ...(caution !== undefined && { aiBudgetCaution: caution }),
        ...(hardLimit !== undefined && { aiBudgetHardLimit: hardLimit }),
        ...(alertEnabled !== undefined && { aiBudgetAlertEnabled: alertEnabled }),
      },
      select: {
        aiBudgetWarning: true,
        aiBudgetCaution: true,
        aiBudgetHardLimit: true,
        aiBudgetAlertEnabled: true,
      },
    })

    res.json({
      success: true,
      data: {
        warning: updated.aiBudgetWarning ?? 25,
        caution: updated.aiBudgetCaution ?? 50,
        hardLimit: updated.aiBudgetHardLimit ?? 100,
        alertEnabled: updated.aiBudgetAlertEnabled,
      },
    })
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: 'Failed to update budget settings', error: getErrorMessage(error) })
  }
}
