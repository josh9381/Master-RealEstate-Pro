/* eslint-disable @typescript-eslint/no-explicit-any */
import { getErrorMessage } from '../../utils/errors'
import { logger } from '../../lib/logger'
import { Request, Response } from 'express'
import { prisma } from '../../config/database'
import {
  calcCompletionRate, calcLeadConversionRate, calcPercentChange,
  roundTo2
} from '../../utils/metricsCalculator'

// ============================================================================
// Phase 5.1: Multi-Touch Attribution
// ============================================================================

type AttributionModel = 'first-touch' | 'last-touch' | 'linear' | 'time-decay' | 'u-shaped'

interface Touchpoint {
  id: string
  type: string
  title: string
  createdAt: Date
  campaignId: string | null
  metadata: any
}

interface AttributionCredit {
  touchpointId: string
  type: string
  campaignId: string | null
  credit: number // 0–1 (fraction of total credit)
}

/**
 * Apply an attribution model to a set of chronologically sorted touchpoints.
 * Returns credit allocations (sum = 1.0).
 */
function applyAttributionModel(touchpoints: Touchpoint[], model: AttributionModel): AttributionCredit[] {
  if (touchpoints.length === 0) return []

  switch (model) {
    case 'first-touch':
      return touchpoints.map((tp, i) => ({
        touchpointId: tp.id,
        type: tp.type,
        campaignId: tp.campaignId,
        credit: i === 0 ? 1 : 0,
      }))

    case 'last-touch':
      return touchpoints.map((tp, i) => ({
        touchpointId: tp.id,
        type: tp.type,
        campaignId: tp.campaignId,
        credit: i === touchpoints.length - 1 ? 1 : 0,
      }))

    case 'linear': {
      const equalCredit = 1 / touchpoints.length
      return touchpoints.map((tp) => ({
        touchpointId: tp.id,
        type: tp.type,
        campaignId: tp.campaignId,
        credit: equalCredit,
      }))
    }

    case 'time-decay': {
      // Half-life of 7 days — more recent touchpoints get exponentially more credit
      const HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000
      const lastTime = touchpoints[touchpoints.length - 1].createdAt.getTime()
      const rawWeights = touchpoints.map((tp) => {
        const age = lastTime - tp.createdAt.getTime()
        return Math.pow(2, -age / HALF_LIFE_MS)
      })
      const totalWeight = rawWeights.reduce((a, b) => a + b, 0)
      return touchpoints.map((tp, i) => ({
        touchpointId: tp.id,
        type: tp.type,
        campaignId: tp.campaignId,
        credit: totalWeight > 0 ? rawWeights[i] / totalWeight : 0,
      }))
    }

    case 'u-shaped': {
      // 40% first, 40% last, 20% split among middle
      if (touchpoints.length === 1) {
        return [{ touchpointId: touchpoints[0].id, type: touchpoints[0].type, campaignId: touchpoints[0].campaignId, credit: 1 }]
      }
      if (touchpoints.length === 2) {
        return touchpoints.map((tp) => ({
          touchpointId: tp.id,
          type: tp.type,
          campaignId: tp.campaignId,
          credit: 0.5,
        }))
      }
      const middleCount = touchpoints.length - 2
      const middleCredit = 0.2 / middleCount
      return touchpoints.map((tp, i) => ({
        touchpointId: tp.id,
        type: tp.type,
        campaignId: tp.campaignId,
        credit: i === 0 ? 0.4 : i === touchpoints.length - 1 ? 0.4 : middleCredit,
      }))
    }

    default:
      return applyAttributionModel(touchpoints, 'linear')
  }
}

/** Categorize ActivityType into a readable channel */
function activityToChannel(type: string): string {
  if (type.startsWith('EMAIL')) return 'Email'
  if (type.startsWith('SMS')) return 'SMS'
  if (type.startsWith('CALL')) return 'Phone'
  if (type.startsWith('MEETING')) return 'Meeting'
  if (type === 'LEAD_CREATED') return 'Direct'
  if (type === 'CAMPAIGN_LAUNCHED' || type === 'CAMPAIGN_COMPLETED') return 'Campaign'
  return 'Other'
}

/**
 * Phase 5.1: GET /api/analytics/attribution
 * Multi-touch attribution report with 5 models.
 * Query params: model (attribution model), startDate, endDate
 */
export async function getAttributionReport(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Organization required' })
    }

    const model = (req.query.model as AttributionModel) || 'linear'
    const validModels: AttributionModel[] = ['first-touch', 'last-touch', 'linear', 'time-decay', 'u-shaped']
    if (!validModels.includes(model)) {
      return res.status(400).json({ success: false, message: `Invalid model. Use: ${validModels.join(', ')}` })
    }

    const { startDate, endDate } = req.query
    const dateFilter: Record<string, any> = {}
    if (startDate) dateFilter.gte = new Date(startDate as string)
    if (endDate) dateFilter.lte = new Date(endDate as string)
    const dateWhere = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}

    // Step 1: Get WON leads in date range (capped to prevent unbounded queries)
    const MAX_ATTRIBUTION_LEADS = 500
    const wonLeads = await prisma.lead.findMany({
      where: {
        organizationId,
        status: 'WON',
        ...dateWhere,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        source: true,
        value: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_ATTRIBUTION_LEADS,
    })

    if (wonLeads.length === 0) {
      return res.json({
        success: true,
        data: {
          model,
          conversions: 0,
          totalRevenue: 0,
          bySource: [],
          byCampaign: [],
          byChannel: [],
          leads: [],
        },
      })
    }

    const leadIds = wonLeads.map((l) => l.id)

    // Step 2: Get all touchpoint activities for these leads
    const activities = await prisma.activity.findMany({
      where: {
        organizationId,
        leadId: { in: leadIds },
        type: {
          in: [
            'EMAIL_SENT', 'EMAIL_OPENED', 'EMAIL_CLICKED',
            'SMS_SENT', 'SMS_DELIVERED',
            'CALL_MADE', 'CALL_RECEIVED',
            'MEETING_SCHEDULED', 'MEETING_COMPLETED',
            'LEAD_CREATED', 'LEAD_ASSIGNED',
            'CAMPAIGN_LAUNCHED',
          ],
        },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        type: true,
        title: true,
        createdAt: true,
        leadId: true,
        campaignId: true,
        metadata: true,
      },
    })

    // Step 3: Group activities by lead, apply attribution model, accumulate credits
    const activitiesByLead = new Map<string, Touchpoint[]>()
    for (const act of activities) {
      if (!act.leadId) continue
      const list = activitiesByLead.get(act.leadId) || []
      list.push({
        id: act.id,
        type: act.type,
        title: act.title || act.type,
        createdAt: act.createdAt,
        campaignId: act.campaignId,
        metadata: act.metadata,
      })
      activitiesByLead.set(act.leadId, list)
    }

    // Aggregators
    const sourceCredits: Record<string, { credit: number; revenue: number; conversions: number }> = {}
    const campaignCredits: Record<string, { credit: number; revenue: number; conversions: number; name: string }> = {}
    const channelCredits: Record<string, { credit: number; revenue: number; conversions: number }> = {}
    const leadResults: Record<string, any>[] = []
    let totalAttributedRevenue = 0

    // Get campaign names for lookup
    const campaignIds = [...new Set(activities.filter((a) => a.campaignId).map((a) => a.campaignId!))]
    const campaigns = campaignIds.length > 0
      ? await prisma.campaign.findMany({ where: { id: { in: campaignIds } }, select: { id: true, name: true } })
      : []
    const campaignNameMap = new Map(campaigns.map((c) => [c.id, c.name]))

    for (const lead of wonLeads) {
      const touchpoints = activitiesByLead.get(lead.id) || []
      const revenue = lead.value || 0
      totalAttributedRevenue += revenue

      const credits = applyAttributionModel(touchpoints, model)

      // Accumulate source credits (from lead.source for each touchpoint credit)
      const leadSource = lead.source || 'Unknown'
      if (!sourceCredits[leadSource]) sourceCredits[leadSource] = { credit: 0, revenue: 0, conversions: 0 }
      sourceCredits[leadSource].credit += 1
      sourceCredits[leadSource].revenue += revenue
      sourceCredits[leadSource].conversions += 1

      // Accumulate campaign + channel credits from touchpoints
      for (const c of credits) {
        if (c.credit <= 0) continue

        // Channel
        const channel = activityToChannel(c.type)
        if (!channelCredits[channel]) channelCredits[channel] = { credit: 0, revenue: 0, conversions: 0 }
        channelCredits[channel].credit += c.credit
        channelCredits[channel].revenue += revenue * c.credit
        channelCredits[channel].conversions += c.credit

        // Campaign
        if (c.campaignId) {
          if (!campaignCredits[c.campaignId]) {
            campaignCredits[c.campaignId] = {
              credit: 0,
              revenue: 0,
              conversions: 0,
              name: campaignNameMap.get(c.campaignId) || 'Unknown Campaign',
            }
          }
          campaignCredits[c.campaignId].credit += c.credit
          campaignCredits[c.campaignId].revenue += revenue * c.credit
          campaignCredits[c.campaignId].conversions += c.credit
        }
      }

      leadResults.push({
        leadId: lead.id,
        name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unknown',
        source: leadSource,
        revenue,
        touchpoints: touchpoints.length,
        credits: credits.filter((c) => c.credit > 0).map((c) => ({
          type: c.type,
          channel: activityToChannel(c.type),
          campaignId: c.campaignId,
          credit: roundTo2(c.credit),
        })),
      })
    }

    res.json({
      success: true,
      data: {
        model,
        conversions: wonLeads.length,
        totalRevenue: totalAttributedRevenue,
        capped: wonLeads.length >= MAX_ATTRIBUTION_LEADS,
        bySource: Object.entries(sourceCredits)
          .sort(([, a], [, b]) => b.revenue - a.revenue)
          .map(([name, data]) => ({ name, ...data, credit: roundTo2(data.credit) })),
        byCampaign: Object.entries(campaignCredits)
          .sort(([, a], [, b]) => b.revenue - a.revenue)
          .map(([id, data]) => ({ campaignId: id, ...data, credit: roundTo2(data.credit) })),
        byChannel: Object.entries(channelCredits)
          .sort(([, a], [, b]) => b.revenue - a.revenue)
          .map(([name, data]) => ({ name, ...data, credit: roundTo2(data.credit) })),
        leads: leadResults.slice(0, 50), // Top 50 leads with touchpoint details
      },
    })
  } catch (error: unknown) {
    logger.error('Error fetching attribution report:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch attribution report', error: getErrorMessage(error) })
  }
}

/**
 * Phase 5.1: GET /api/analytics/attribution/touchpoints/:leadId
 * Get all touchpoints for a specific lead with attribution credits.
 */
export async function getLeadTouchpoints(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Organization required' })
    }

    const { leadId } = req.params
    const model = (req.query.model as AttributionModel) || 'linear'

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
      select: { id: true, firstName: true, lastName: true, source: true, value: true, status: true },
    })
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' })
    }

    const activities = await prisma.activity.findMany({
      where: {
        organizationId,
        leadId,
        type: {
          in: [
            'EMAIL_SENT', 'EMAIL_OPENED', 'EMAIL_CLICKED',
            'SMS_SENT', 'SMS_DELIVERED',
            'CALL_MADE', 'CALL_RECEIVED',
            'MEETING_SCHEDULED', 'MEETING_COMPLETED',
            'LEAD_CREATED', 'LEAD_ASSIGNED',
            'CAMPAIGN_LAUNCHED',
          ],
        },
      },
      orderBy: { createdAt: 'asc' },
      include: { campaign: { select: { id: true, name: true } } },
    })

    const touchpoints: Touchpoint[] = activities.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title || a.type,
      createdAt: a.createdAt,
      campaignId: a.campaignId,
      metadata: a.metadata,
    }))

    const credits = applyAttributionModel(touchpoints, model)

    res.json({
      success: true,
      data: {
        lead: {
          id: lead.id,
          name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
          source: lead.source,
          value: lead.value,
          status: lead.status,
        },
        model,
        touchpoints: activities.map((a, i) => ({
          id: a.id,
          type: a.type,
          title: a.title,
          channel: activityToChannel(a.type),
          createdAt: a.createdAt,
          campaignId: a.campaignId,
          campaignName: (a as any).campaign?.name || null,
          credit: credits[i] ? roundTo2(credits[i].credit) : 0,
        })),
      },
    })
  } catch (error: unknown) {
    logger.error('Error fetching lead touchpoints:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch lead touchpoints', error: getErrorMessage(error) })
  }
}

// ============================================================================
// Phase 5.2: Period-over-Period Comparison
// ============================================================================

/**
 * Phase 5.2: GET /api/analytics/comparison
 * Compare current period vs previous period for key metrics.
 * Query params: startDate, endDate (current period). Previous period auto-calculated as same length prior.
 */
export async function getPeriodComparison(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Organization required' })
    }

    const { startDate, endDate } = req.query
    const now = new Date()
    const currentEnd = endDate ? new Date(endDate as string) : now
    const currentStart = startDate ? new Date(startDate as string) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const periodLength = currentEnd.getTime() - currentStart.getTime()
    const previousEnd = new Date(currentStart.getTime() - 1) // Day before current starts
    const previousStart = new Date(previousEnd.getTime() - periodLength)

    const buildWhere = (start: Date, end: Date) => ({
      organizationId,
      createdAt: { gte: start, lte: end },
    })

    const [
      currentLeads, previousLeads,
      currentWon, previousWon,
      currentLost, previousLost,
      currentActivities, previousActivities,
      currentCampaigns, previousCampaigns,
      currentRevenue, previousRevenue,
      currentTasks, previousTasks,
      currentCompletedTasks, previousCompletedTasks,
    ] = await Promise.all([
      prisma.lead.count({ where: buildWhere(currentStart, currentEnd) }),
      prisma.lead.count({ where: buildWhere(previousStart, previousEnd) }),
      prisma.lead.count({ where: { ...buildWhere(currentStart, currentEnd), status: 'WON' } }),
      prisma.lead.count({ where: { ...buildWhere(previousStart, previousEnd), status: 'WON' } }),
      prisma.lead.count({ where: { ...buildWhere(currentStart, currentEnd), status: 'LOST' } }),
      prisma.lead.count({ where: { ...buildWhere(previousStart, previousEnd), status: 'LOST' } }),
      prisma.activity.count({ where: buildWhere(currentStart, currentEnd) }),
      prisma.activity.count({ where: buildWhere(previousStart, previousEnd) }),
      prisma.campaign.count({ where: buildWhere(currentStart, currentEnd) }),
      prisma.campaign.count({ where: buildWhere(previousStart, previousEnd) }),
      prisma.lead.aggregate({ where: { ...buildWhere(currentStart, currentEnd), status: 'WON' }, _sum: { value: true } }),
      prisma.lead.aggregate({ where: { ...buildWhere(previousStart, previousEnd), status: 'WON' }, _sum: { value: true } }),
      prisma.task.count({ where: buildWhere(currentStart, currentEnd) }),
      prisma.task.count({ where: buildWhere(previousStart, previousEnd) }),
      prisma.task.count({ where: { ...buildWhere(currentStart, currentEnd), status: 'COMPLETED' } }),
      prisma.task.count({ where: { ...buildWhere(previousStart, previousEnd), status: 'COMPLETED' } }),
    ])

    const calcChange = (current: number, previous: number) => {
      return calcPercentChange(current, previous)
    }

    const currentRevenueVal = currentRevenue._sum.value || 0
    const previousRevenueVal = previousRevenue._sum.value || 0
    const currentConvRate = calcLeadConversionRate(currentWon, currentWon + currentLost)
    const previousConvRate = calcLeadConversionRate(previousWon, previousWon + previousLost)

    res.json({
      success: true,
      data: {
        currentPeriod: { start: currentStart, end: currentEnd },
        previousPeriod: { start: previousStart, end: previousEnd },
        metrics: [
          {
            name: 'New Leads',
            current: currentLeads,
            previous: previousLeads,
            change: calcChange(currentLeads, previousLeads),
          },
          {
            name: 'Deals Won',
            current: currentWon,
            previous: previousWon,
            change: calcChange(currentWon, previousWon),
          },
          {
            name: 'Revenue',
            current: currentRevenueVal,
            previous: previousRevenueVal,
            change: calcChange(currentRevenueVal, previousRevenueVal),
            format: 'currency',
          },
          {
            name: 'Conversion Rate',
            current: currentConvRate,
            previous: previousConvRate,
            change: calcChange(currentConvRate, previousConvRate),
            format: 'percentage',
          },
          {
            name: 'Activities',
            current: currentActivities,
            previous: previousActivities,
            change: calcChange(currentActivities, previousActivities),
          },
          {
            name: 'Campaigns',
            current: currentCampaigns,
            previous: previousCampaigns,
            change: calcChange(currentCampaigns, previousCampaigns),
          },
          {
            name: 'Tasks Created',
            current: currentTasks,
            previous: previousTasks,
            change: calcChange(currentTasks, previousTasks),
          },
          {
            name: 'Tasks Completed',
            current: currentCompletedTasks,
            previous: previousCompletedTasks,
            change: calcChange(currentCompletedTasks, previousCompletedTasks),
          },
        ],
      },
    })
  } catch (error: unknown) {
    logger.error('Error fetching period comparison:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch period comparison', error: getErrorMessage(error) })
  }
}

// ============================================================================
// Phase 5.5: Lead Velocity Metrics
// ============================================================================

/**
 * Phase 5.5: GET /api/analytics/lead-velocity
 * Measures how quickly leads move through the pipeline.
 * Returns: avg days per stage, velocity trend, throughput by period.
 */
export async function getLeadVelocity(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Organization required' })
    }

    const months = parseInt(req.query.months as string) || 6

    // Get stage-change activities for the period
    const since = new Date()
    since.setMonth(since.getMonth() - months)

    const stageChanges = await prisma.activity.findMany({
      where: {
        organizationId,
        type: { in: ['STATUS_CHANGED', 'STAGE_CHANGED'] },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'asc' },
      select: { leadId: true, createdAt: true, metadata: true },
    })

    // Group stage changes by lead to compute time-in-stage
    const byLead = new Map<string, { createdAt: Date; metadata: any }[]>()
    for (const sc of stageChanges) {
      if (!sc.leadId) continue
      const list = byLead.get(sc.leadId) || []
      list.push({ createdAt: sc.createdAt, metadata: sc.metadata })
      byLead.set(sc.leadId, list)
    }

    // Compute avg days between stage transitions
    const stageDurations: Record<string, number[]> = {}
    for (const [, changes] of byLead) {
      for (let i = 0; i < changes.length - 1; i++) {
        const meta = changes[i].metadata as any
        const fromStage = meta?.fromStatus || meta?.from || 'Unknown'
        const days = (changes[i + 1].createdAt.getTime() - changes[i].createdAt.getTime()) / (1000 * 60 * 60 * 24)
        if (!stageDurations[fromStage]) stageDurations[fromStage] = []
        stageDurations[fromStage].push(days)
      }
    }

    const avgDaysPerStage = Object.entries(stageDurations)
      .map(([stage, durations]) => ({
        stage,
        avgDays: Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10,
        count: durations.length,
      }))
      .sort((a, b) => b.count - a.count)

    // Monthly velocity (leads entering pipeline + leads exiting pipeline)
    const monthlyVelocity: Record<string, { entered: number; won: number; lost: number }> = {}
    for (const sc of stageChanges) {
      const meta = sc.metadata as any
      const monthKey = `${sc.createdAt.getFullYear()}-${String(sc.createdAt.getMonth() + 1).padStart(2, '0')}`
      if (!monthlyVelocity[monthKey]) monthlyVelocity[monthKey] = { entered: 0, won: 0, lost: 0 }
      const toStatus = meta?.toStatus || meta?.to || ''
      if (toStatus === 'NEW' || toStatus === 'CONTACTED') monthlyVelocity[monthKey].entered++
      if (toStatus === 'WON') monthlyVelocity[monthKey].won++
      if (toStatus === 'LOST') monthlyVelocity[monthKey].lost++
    }

    // Overall velocity: avg days from lead creation to WON
    const wonLeads = await prisma.lead.findMany({
      where: { organizationId, status: 'WON', createdAt: { gte: since } },
      select: { createdAt: true, updatedAt: true },
    })
    const avgDaysToClose = wonLeads.length > 0
      ? Math.round(
          (wonLeads.reduce((sum, l) => sum + (l.updatedAt.getTime() - l.createdAt.getTime()), 0) /
            wonLeads.length /
            (1000 * 60 * 60 * 24)) * 10
        ) / 10
      : 0

    res.json({
      success: true,
      data: {
        avgDaysToClose,
        avgDaysPerStage,
        totalLeadsTracked: byLead.size,
        monthlyVelocity: Object.entries(monthlyVelocity)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, data]) => ({ month, ...data })),
      },
    })
  } catch (error: unknown) {
    logger.error('Error fetching lead velocity:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch lead velocity', error: getErrorMessage(error) })
  }
}

// ============================================================================
// Phase 5.6: Source ROI Calculation
// ============================================================================

/**
 * Phase 5.6: GET /api/analytics/source-roi
 * Calculate return on investment per lead source.
 */
export async function getSourceROI(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Organization required' })
    }

    const { startDate, endDate } = req.query
    const dateFilter: Record<string, any> = {}
    if (startDate) dateFilter.gte = new Date(startDate as string)
    if (endDate) dateFilter.lte = new Date(endDate as string)
    const dateWhere = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}

    // Get all leads with their source and value
    const leads = await prisma.lead.findMany({
      where: { organizationId, ...dateWhere },
      select: { id: true, source: true, status: true, value: true, createdAt: true },
    })

    // Group by source
    const sourceData: Record<string, { total: number; won: number; lost: number; revenue: number; values: number[] }> = {}
    for (const lead of leads) {
      const source = lead.source || 'Unknown'
      if (!sourceData[source]) sourceData[source] = { total: 0, won: 0, lost: 0, revenue: 0, values: [] }
      sourceData[source].total++
      if (lead.status === 'WON') {
        sourceData[source].won++
        const val = lead.value || 0
        sourceData[source].revenue += val
        if (val > 0) sourceData[source].values.push(val)
      }
      if (lead.status === 'LOST') sourceData[source].lost++
    }

    const results = Object.entries(sourceData)
      .map(([source, data]) => ({
        source,
        totalLeads: data.total,
        wonLeads: data.won,
        lostLeads: data.lost,
        revenue: data.revenue,
        conversionRate: calcLeadConversionRate(data.won, data.won + data.lost),
        avgDealSize: data.values.length > 0 ? Math.round(data.revenue / data.values.length) : 0,
        // ROI = revenue per lead (since we don't track ad spend, this is revenue efficiency)
        revenuePerLead: data.total > 0 ? Math.round(data.revenue / data.total) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)

    const totalWon = results.reduce((s, r) => s + r.wonLeads, 0)
    const totalLost = results.reduce((s, r) => s + r.lostLeads, 0)

    const totals = {
      totalLeads: leads.length,
      totalWon,
      totalRevenue: results.reduce((s, r) => s + r.revenue, 0),
      overallConversionRate: calcLeadConversionRate(totalWon, totalWon + totalLost),
    }

    res.json({
      success: true,
      data: { sources: results, totals },
    })
  } catch (error: unknown) {
    logger.error('Error fetching source ROI:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch source ROI', error: getErrorMessage(error) })
  }
}

// ============================================================================
// Phase 5.9: Follow-up Analytics
// ============================================================================

/**
 * Phase 5.9: GET /api/analytics/follow-up-analytics
 * Aggregate follow-up reminder completion rates, response times, and trends.
 */
export async function getFollowUpAnalytics(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Organization required' })
    }

    const months = parseInt(req.query.months as string) || 3
    const since = new Date()
    since.setMonth(since.getMonth() - months)

    const reminders = await prisma.followUpReminder.findMany({
      where: { organizationId, createdAt: { gte: since } },
      select: {
        id: true,
        status: true,
        priority: true,
        dueAt: true,
        firedAt: true,
        completedAt: true,
        createdAt: true,
        channelEmail: true,
        channelSms: true,
        channelInApp: true,
        channelPush: true,
      },
    })

    const total = reminders.length
    const completed = reminders.filter((r) => r.status === 'COMPLETED').length
    const fired = reminders.filter((r) => r.status === 'FIRED').length
    const pending = reminders.filter((r) => r.status === 'PENDING').length
    const snoozed = reminders.filter((r) => r.status === 'SNOOZED').length
    const cancelled = reminders.filter((r) => r.status === 'CANCELLED').length

    // Avg response time: time from fired to completed (in hours)
    const responseTimes: number[] = []
    for (const r of reminders) {
      if (r.firedAt && r.completedAt) {
        const hours = (r.completedAt.getTime() - r.firedAt.getTime()) / (1000 * 60 * 60)
        if (hours >= 0 && hours < 720) responseTimes.push(hours) // Exclude outliers > 30 days
      }
    }
    const avgResponseHours = responseTimes.length > 0
      ? Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10) / 10
      : 0

    // Overdue: fired but not completed, past due date
    const overdue = reminders.filter((r) => r.status === 'FIRED' && r.dueAt < new Date()).length

    // By priority
    const byPriority: Record<string, { total: number; completed: number }> = {}
    for (const r of reminders) {
      const p = r.priority || 'MEDIUM'
      if (!byPriority[p]) byPriority[p] = { total: 0, completed: 0 }
      byPriority[p].total++
      if (r.status === 'COMPLETED') byPriority[p].completed++
    }

    // By channel usage
    const channelUsage = {
      email: reminders.filter((r) => r.channelEmail).length,
      sms: reminders.filter((r) => r.channelSms).length,
      inApp: reminders.filter((r) => r.channelInApp).length,
      push: reminders.filter((r) => r.channelPush).length,
    }

    // Monthly trend
    const monthlyTrend: Record<string, { created: number; completed: number; fired: number }> = {}
    for (const r of reminders) {
      const key = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, '0')}`
      if (!monthlyTrend[key]) monthlyTrend[key] = { created: 0, completed: 0, fired: 0 }
      monthlyTrend[key].created++
      if (r.status === 'COMPLETED') monthlyTrend[key].completed++
      if (r.status === 'FIRED' || r.status === 'COMPLETED') monthlyTrend[key].fired++
    }

    res.json({
      success: true,
      data: {
        summary: {
          total,
          completed,
          fired,
          pending,
          snoozed,
          cancelled,
          overdue,
          completionRate: calcCompletionRate(completed, total),
          avgResponseHours,
        },
        byPriority: Object.entries(byPriority).map(([priority, data]) => ({
          priority,
          ...data,
          completionRate: calcCompletionRate(data.completed, data.total),
        })),
        channelUsage,
        monthlyTrend: Object.entries(monthlyTrend)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, data]) => ({ month, ...data })),
      },
    })
  } catch (error: unknown) {
    logger.error('Error fetching follow-up analytics:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch follow-up analytics', error: getErrorMessage(error) })
  }
}

// Get distinct lead sources for filter dropdowns
export const getLeadSources = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const sources = await prisma.lead.groupBy({
      by: ['source'],
      where: { organizationId, source: { not: null } },
      _count: true,
      orderBy: { _count: { source: 'desc' } },
    })

    res.json({
      success: true,
      data: sources.map((s) => ({
        value: s.source,
        label: s.source,
        count: s._count,
      })),
    })
  } catch (error: unknown) {
    logger.error('Error fetching lead sources:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch lead sources', error: getErrorMessage(error) })
  }
}
