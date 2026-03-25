import { getErrorMessage } from '../utils/errors'
import { logger } from '../lib/logger'
import { Request, Response } from 'express'
import prisma from '../config/database'
import { AIInsightType, AIInsightPriority, Prisma } from '@prisma/client'
import { calcRate, formatRate } from '../utils/metricsCalculator'

// Throttle insight generation: at most once per 5 minutes per org
const insightGenerationTimestamps = new Map<string, number>()
const INSIGHT_GENERATION_COOLDOWN_MS = 5 * 60 * 1000

async function generateAndStoreInsights(organizationId: string): Promise<void> {
  const currentTime = Date.now()
  const lastRun = insightGenerationTimestamps.get(organizationId) || 0
  if (currentTime - lastRun < INSIGHT_GENERATION_COOLDOWN_MS) {
    return // Skip — generated recently
  }
  insightGenerationTimestamps.set(organizationId, currentTime)
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Helper: only create if no recent duplicate of same type exists
  async function upsertInsight(type: AIInsightType, priority: AIInsightPriority, title: string, description: string, data?: Record<string, unknown>, actionUrl?: string) {
    // Before creating, check if the user has disabled this insight type
    // (org-level check — if ANY user in the org has dismissed this type, we still
    // generate for the org but the getInsights endpoint filters per-user)
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
        data: (data || undefined) as Prisma.InputJsonValue | undefined,
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
        'LEAD_FOLLOWUP',
        staleLeads.length > 5 ? 'HIGH' : 'MEDIUM',
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
          'SCORING_ACCURACY',
          'HIGH',
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
        stage: { in: ['CONTACTED', 'NURTURING', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION'] },
        updatedAt: { lt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000) },
      },
      select: { id: true, firstName: true, lastName: true, stage: true },
      take: 20,
    })

    if (stuckLeads.length > 0) {
      await upsertInsight(
        'PIPELINE_HEALTH',
        stuckLeads.length > 3 ? 'HIGH' : 'MEDIUM',
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
          'EMAIL_PERFORMANCE',
          'MEDIUM',
          `Email open rate dropped ${calcRate(avgOpenRate - latestRate, avgOpenRate, 0)}% vs average`,
          `Your latest campaign open rate (${formatRate(latestRate)}) is below your average (${formatRate(avgOpenRate)}%). Consider A/B testing subject lines.`,
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
        'LEAD_FOLLOWUP',
        unscoredLeads > 10 ? 'MEDIUM' : 'LOW',
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
        'LEAD_FOLLOWUP',
        'CRITICAL',
        `${highValueAtRisk.length} high-value leads ($${totalValue.toLocaleString()}) need attention`,
        `These high-value leads haven't been contacted in 7+ days. Prioritize outreach to protect this pipeline value.`,
        { leadIds: highValueAtRisk.map(l => l.id), totalValue },
        '/leads?filter=high-value'
      )
    }

  } catch (error) {
    logger.error('Error generating insights:', error)
    // Don't throw — insights generation is best-effort
  }
}

/**
 * Get AI Hub overview statistics
 * Phase 1E — returns real counts from database
 */
export const getInsights = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const userId = req.user!.userId
    const showDismissed = req.query.showDismissed === 'true'
    const status = req.query.status as string | undefined // 'active' | 'dismissed' | 'acted' | 'all'
    const priority = req.query.priority as string | undefined
    const type = req.query.type as string | undefined
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50
    const sortBy = req.query.sortBy as string | undefined // 'newest' | 'priority' | 'impact'

    // First, generate fresh insights (idempotent — won't duplicate)
    await generateAndStoreInsights(organizationId)

    // Load user's insight type preferences to filter results
    const userPrefs = await prisma.userAIPreferences.findUnique({
      where: { userId },
      select: { insightTypes: true, insightPriorityThreshold: true },
    })

    // insightTypes is a JSON array of enabled type strings e.g. ["lead_followup","scoring_accuracy"]
    const enabledTypes = (userPrefs?.insightTypes as string[] | null) || null
    const priorityThreshold = userPrefs?.insightPriorityThreshold || 'all'

    // Fetch insights from DB
    const where: Record<string, unknown> = { organizationId }

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

    // Type filter (explicit query param takes precedence over user pref)
    if (type && type !== 'all') {
      where.type = type
    } else if (enabledTypes && Array.isArray(enabledTypes) && enabledTypes.length > 0) {
      // Apply user's preferred insight types filter (uppercased to match enum)
      const uppercased = enabledTypes.map(t => t.toUpperCase())
      where.type = { in: uppercased }
    }

    // Apply priority threshold from user preferences
    if (priorityThreshold && priorityThreshold !== 'all') {
      const thresholdMap: Record<string, string[]> = {
        critical: ['CRITICAL'],
        high: ['CRITICAL', 'HIGH'],
        medium: ['CRITICAL', 'HIGH', 'MEDIUM'],
      }
      const allowedPriorities = thresholdMap[priorityThreshold.toLowerCase()]
      if (allowedPriorities) {
        // Explicit priority filter takes precedence
        if (!priority || priority === 'all') {
          where.priority = { in: allowedPriorities }
        }
      }
    }

    // Filter out expired insights
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
    ]

    // Determine sort order
    // For priority sort, fetch extra rows from DB (alphabetical sort is imprecise)
    // then apply correct priority ordering in JS and slice to the requested limit.
    let orderBy: Record<string, string>[] = [{ createdAt: 'desc' }]
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
        actedOn: (i as Record<string, unknown>).actedOn || false,
        actedOnAt: (i as Record<string, unknown>).actedOnAt || null,
        actionTaken: (i as Record<string, unknown>).actionTaken || null,
        createdAt: i.createdAt,
      })),
    })
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch insights',
      error: getErrorMessage(error)
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
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch insight',
      error: getErrorMessage(error)
    })
  }
}

/**
 * Dismiss an AI insight
 * Optionally set `disableType: true` in body to remove this insight type from the user's preferences
 */
export const dismissInsight = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const organizationId = req.user!.organizationId
    const userId = req.user!.userId
    const { disableType } = req.body || {}

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

    // If user wants to stop seeing this type of insight, update their preferences
    if (disableType) {
      const prefs = await prisma.userAIPreferences.findUnique({
        where: { userId },
        select: { insightTypes: true },
      })
      if (prefs) {
        const currentTypes = (prefs.insightTypes as string[] | null) || []
        const typeToRemove = insight.type.toLowerCase()
        const updatedTypes = currentTypes.filter(t => t.toLowerCase() !== typeToRemove)
        await prisma.userAIPreferences.update({
          where: { userId },
          data: { insightTypes: updatedTypes },
        })
      }
    }

    res.json({
      success: true,
      message: disableType
        ? `Insight dismissed and "${insight.type}" insights disabled for your account`
        : 'Insight dismissed successfully',
    })
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to dismiss insight',
      error: getErrorMessage(error)
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
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark insight as acted upon',
      error: getErrorMessage(error)
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
      data?: Record<string, unknown>
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
          data: { bestDay: dayNames[bestDay], avgOpenRate: formatRate(bestAvg * 100) },
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
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommendations',
      error: getErrorMessage(error)
    })
  }
}

/**
 * Get lead score for a specific lead — uses real scoring from intelligence service
 */
