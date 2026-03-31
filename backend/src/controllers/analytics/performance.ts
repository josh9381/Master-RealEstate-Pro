import { getErrorMessage } from '../../utils/errors'
import { logger } from '../../lib/logger'
import { Request, Response } from 'express'
import { prisma } from '../../config/database'
import {
  calcRate, calcOpenRate, calcClickRate, calcConversionRate,
  calcDeliveryRate, calcCompletionRate, calcLeadConversionRate,
} from '../../utils/metricsCalculator'

// ============================================================================
// PHASE 5: New Analytics Endpoints
// ============================================================================

/**
 * 5.1 — Get monthly campaign performance data
 * Aggregates sent/opened/clicked/converted by month across all org campaigns
 * Unlocks "Performance Trend" chart on CampaignAnalytics page
 */
export const getMonthlyPerformance = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const { months = 12 } = req.query

    const monthsNum = Number(months)
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - monthsNum)
    startDate.setDate(1)
    startDate.setHours(0, 0, 0, 0)

    // Get all campaigns in the date range
    const campaigns = await prisma.campaign.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        name: true,
        sent: true,
        delivered: true,
        opened: true,
        clicked: true,
        converted: true,
        bounced: true,
        revenue: true,
        spent: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    // Group by month
    const monthlyData: Record<string, {
      month: string
      sent: number
      delivered: number
      opened: number
      clicked: number
      converted: number
      bounced: number
      revenue: number
      spent: number
      campaigns: number
    }> = {}

    // Pre-fill months
    const current = new Date(startDate)
    const now = new Date()
    while (current <= now) {
      const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
      monthlyData[key] = {
        month: key,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
        bounced: 0,
        revenue: 0,
        spent: 0,
        campaigns: 0,
      }
      current.setMonth(current.getMonth() + 1)
    }

    // Aggregate campaign data by month
    campaigns.forEach((campaign) => {
      const key = `${campaign.createdAt.getFullYear()}-${String(campaign.createdAt.getMonth() + 1).padStart(2, '0')}`
      if (monthlyData[key]) {
        monthlyData[key].sent += campaign.sent
        monthlyData[key].delivered += campaign.delivered
        monthlyData[key].opened += campaign.opened
        monthlyData[key].clicked += campaign.clicked
        monthlyData[key].converted += campaign.converted
        monthlyData[key].bounced += campaign.bounced
        monthlyData[key].revenue += campaign.revenue || 0
        monthlyData[key].spent += campaign.spent || 0
        monthlyData[key].campaigns += 1
      }
    })

    // Calculate rates for each month
    const result = Object.values(monthlyData).map((m) => ({
      ...m,
      openRate: calcOpenRate(m.opened, m.sent),
      clickRate: calcClickRate(m.clicked, m.sent),
      conversionRate: calcConversionRate(m.converted, m.sent),
      deliveryRate: calcDeliveryRate(m.delivered, m.sent),
    }))

    res.json({
      success: true,
      data: result,
    })
  } catch (error: unknown) {
    logger.error('Error fetching monthly performance:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly performance data',
      error: getErrorMessage(error),
    })
  }
}

/**
 * 5.2 — Get hourly engagement data
 * Aggregates Activity records by hour-of-day for EMAIL_OPENED/EMAIL_CLICKED events
 * Unlocks "Best Time to Send" chart
 */
export const getHourlyEngagement = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const { days = 90 } = req.query

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - Number(days))

    // Get all email open/click activities
    const activities = await prisma.activity.findMany({
      where: {
        organizationId,
        type: { in: ['EMAIL_OPENED', 'EMAIL_CLICKED'] },
        createdAt: { gte: startDate },
      },
      select: {
        type: true,
        createdAt: true,
      },
    })

    // Initialize hourly buckets (0-23)
    const hourlyData: Array<{
      hour: number
      label: string
      opens: number
      clicks: number
      total: number
    }> = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${i === 0 ? '12' : i > 12 ? i - 12 : i}${i < 12 ? 'AM' : 'PM'}`,
      opens: 0,
      clicks: 0,
      total: 0,
    }))

    // Aggregate by hour
    activities.forEach((activity) => {
      const hour = activity.createdAt.getHours()
      if (activity.type === 'EMAIL_OPENED') {
        hourlyData[hour].opens++
      } else if (activity.type === 'EMAIL_CLICKED') {
        hourlyData[hour].clicks++
      }
      hourlyData[hour].total++
    })

    // Find best times
    const sortedByTotal = [...hourlyData].sort((a, b) => b.total - a.total)
    const bestHours = sortedByTotal.slice(0, 3).map((h) => h.label)

    res.json({
      success: true,
      data: {
        hourly: hourlyData,
        bestHours,
        totalEvents: activities.length,
        periodDays: Number(days),
      },
    })
  } catch (error: unknown) {
    logger.error('Error fetching hourly engagement:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hourly engagement data',
      error: getErrorMessage(error),
    })
  }
}

/**
 * 5.4 — Get team performance data
 * Per-user lead conversions, activity counts, task completions
 * Unlocks Dashboard "Team Performance" section
 */
export const getTeamPerformance = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const { startDate, endDate } = req.query

    const dateFilter: Record<string, any> = {}
    if (startDate) dateFilter.gte = new Date(startDate as string)
    if (endDate) dateFilter.lte = new Date(endDate as string)
    const hasDateFilter = Object.keys(dateFilter).length > 0

    // Get all users in the organization
    const users = await prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
      },
    })

    // Get per-user stats in parallel
    const userStats = await Promise.all(
      users.map(async (user) => {
        const leadWhere: Record<string, any> = { assignedToId: user.id, organizationId }
        const activityWhere: Record<string, any> = { userId: user.id, organizationId }
        const taskWhere: Record<string, any> = { assignedToId: user.id, organizationId }

        if (hasDateFilter) {
          leadWhere.createdAt = dateFilter
          activityWhere.createdAt = dateFilter
          taskWhere.createdAt = dateFilter
        }

        const [
          totalLeads,
          wonLeads,
          lostLeads,
          totalActivities,
          completedTasks,
          totalTasks,
        ] = await Promise.all([
          prisma.lead.count({ where: leadWhere }),
          prisma.lead.count({ where: { ...leadWhere, status: 'WON' } }),
          prisma.lead.count({ where: { ...leadWhere, status: 'LOST' } }),
          prisma.activity.count({ where: activityWhere }),
          prisma.task.count({ where: { ...taskWhere, status: 'COMPLETED' } }),
          prisma.task.count({ where: taskWhere }),
        ])

        const conversionRate = calcLeadConversionRate(wonLeads, wonLeads + lostLeads)
        const taskCompletionRate = calcCompletionRate(completedTasks, totalTasks)

        return {
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            role: user.role,
          },
          totalLeads,
          wonLeads,
          conversionRate,
          totalActivities,
          completedTasks,
          totalTasks,
          taskCompletionRate,
        }
      })
    )

    // Sort by won leads descending
    userStats.sort((a, b) => b.wonLeads - a.wonLeads)

    res.json({
      success: true,
      data: userStats,
    })
  } catch (error: unknown) {
    logger.error('Error fetching team performance:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team performance data',
      error: getErrorMessage(error),
    })
  }
}

/**
 * 5.5 — Get revenue timeline data
 * Aggregates Lead.value by month + Campaign.revenue by month
 * Unlocks Dashboard "Revenue" chart
 */
export const getRevenueTimeline = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const { months = 12 } = req.query

    const monthsNum = Number(months)
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - monthsNum)
    startDate.setDate(1)
    startDate.setHours(0, 0, 0, 0)

    // Get leads with value (won deals)
    const wonLeads = await prisma.lead.findMany({
      where: {
        organizationId,
        status: 'WON',
        value: { not: null },
        updatedAt: { gte: startDate },
      },
      select: {
        value: true,
        updatedAt: true,
      },
    })

    // Get campaign revenue
    const campaignsWithRevenue = await prisma.campaign.findMany({
      where: {
        organizationId,
        revenue: { gt: 0 },
        createdAt: { gte: startDate },
      },
      select: {
        revenue: true,
        createdAt: true,
      },
    })

    // Pre-fill months
    const monthlyRevenue: Record<string, { month: string; dealRevenue: number; campaignRevenue: number; totalRevenue: number; deals: number }> = {}
    const current = new Date(startDate)
    const now = new Date()
    while (current <= now) {
      const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
      monthlyRevenue[key] = {
        month: key,
        dealRevenue: 0,
        campaignRevenue: 0,
        totalRevenue: 0,
        deals: 0,
      }
      current.setMonth(current.getMonth() + 1)
    }

    // Aggregate lead revenue by month
    wonLeads.forEach((lead) => {
      const key = `${lead.updatedAt.getFullYear()}-${String(lead.updatedAt.getMonth() + 1).padStart(2, '0')}`
      if (monthlyRevenue[key]) {
        monthlyRevenue[key].dealRevenue += lead.value || 0
        monthlyRevenue[key].deals += 1
      }
    })

    // Aggregate campaign revenue by month
    campaignsWithRevenue.forEach((campaign) => {
      const key = `${campaign.createdAt.getFullYear()}-${String(campaign.createdAt.getMonth() + 1).padStart(2, '0')}`
      if (monthlyRevenue[key]) {
        monthlyRevenue[key].campaignRevenue += campaign.revenue || 0
      }
    })

    // Calculate totals
    const result = Object.values(monthlyRevenue).map((m) => ({
      ...m,
      totalRevenue: m.dealRevenue + m.campaignRevenue,
    }))

    const grandTotal = result.reduce((sum, m) => sum + m.totalRevenue, 0)

    res.json({
      success: true,
      data: {
        monthly: result,
        totalRevenue: grandTotal,
        totalDeals: wonLeads.length,
      },
    })
  } catch (error: unknown) {
    logger.error('Error fetching revenue timeline:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue timeline data',
      error: getErrorMessage(error),
    })
  }
}

/**
 * 5.10 — Get real dashboard alerts
 * Queries: stale leads (no activity 7+ days), overdue tasks, 
 * underperforming campaigns, follow-ups due today
 */
export const getDashboardAlerts = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const userId = req.user!.userId

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Run all alert queries in parallel
    const [
      staleLeads,
      overdueTasks,
      underperformingCampaigns,
      tasksDueToday,
      unreadMessages,
    ] = await Promise.all([
      // Leads with no recent activity (7+ days)
      prisma.lead.findMany({
        where: {
          organizationId,
          status: { notIn: ['WON', 'LOST'] },
          OR: [
            { lastContactAt: { lt: sevenDaysAgo } },
            { lastContactAt: null },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          status: true,
          lastContactAt: true,
          value: true,
        },
        take: 10,
        orderBy: { value: 'desc' },
      }),

      // Overdue tasks
      prisma.task.findMany({
        where: {
          organizationId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          dueDate: { lt: today },
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          priority: true,
          lead: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        take: 10,
        orderBy: { dueDate: 'asc' },
      }),

      // Campaigns with below-average open rates (< 15%)
      prisma.campaign.findMany({
        where: {
          organizationId,
          status: { in: ['ACTIVE', 'COMPLETED'] },
          sent: { gt: 10 },
        },
        select: {
          id: true,
          name: true,
          sent: true,
          opened: true,
          clicked: true,
        },
      }),

      // Tasks due today
      prisma.task.findMany({
        where: {
          organizationId,
          assignedToId: userId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          dueDate: { gte: today, lt: tomorrow },
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          priority: true,
          lead: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        take: 10,
        orderBy: { priority: 'asc' },
      }),

      // Unread inbound messages
      prisma.message.count({
        where: {
          organizationId,
          direction: 'INBOUND',
          readAt: null,
        },
      }),
    ])

    // Build alerts array
    const alerts: Array<{
      type: 'warning' | 'info' | 'urgent' | 'success'
      category: string
      title: string
      description: string
      count?: number
      data?: any
    }> = []

    // Stale leads alert
    if (staleLeads.length > 0) {
      alerts.push({
        type: 'warning',
        category: 'leads',
        title: `${staleLeads.length} lead${staleLeads.length > 1 ? 's' : ''} need${staleLeads.length === 1 ? 's' : ''} attention`,
        description: `${staleLeads.length} active lead${staleLeads.length > 1 ? 's haven\'t' : ' hasn\'t'} been contacted in over 7 days`,
        count: staleLeads.length,
        data: staleLeads.slice(0, 5),
      })
    }

    // Overdue tasks alert
    if (overdueTasks.length > 0) {
      alerts.push({
        type: 'urgent',
        category: 'tasks',
        title: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
        description: `You have ${overdueTasks.length} task${overdueTasks.length > 1 ? 's' : ''} past their due date`,
        count: overdueTasks.length,
        data: overdueTasks.slice(0, 5),
      })
    }

    // Underperforming campaigns
    const lowPerformers = underperformingCampaigns.filter((c) => {
      const openRate = calcOpenRate(c.opened, c.sent)
      return openRate < 15
    })
    if (lowPerformers.length > 0) {
      alerts.push({
        type: 'info',
        category: 'campaigns',
        title: `${lowPerformers.length} campaign${lowPerformers.length > 1 ? 's' : ''} underperforming`,
        description: `${lowPerformers.length} campaign${lowPerformers.length > 1 ? 's have' : ' has'} below-average open rates (<15%)`,
        count: lowPerformers.length,
        data: lowPerformers.slice(0, 5).map((c) => ({
          id: c.id,
          name: c.name,
          openRate: calcOpenRate(c.opened, c.sent),
        })),
      })
    }

    // Tasks due today
    if (tasksDueToday.length > 0) {
      alerts.push({
        type: 'info',
        category: 'tasks',
        title: `${tasksDueToday.length} task${tasksDueToday.length > 1 ? 's' : ''} due today`,
        description: `You have ${tasksDueToday.length} task${tasksDueToday.length > 1 ? 's' : ''} to complete today`,
        count: tasksDueToday.length,
        data: tasksDueToday.slice(0, 5),
      })
    }

    // Unread messages
    if (unreadMessages > 0) {
      alerts.push({
        type: 'info',
        category: 'messages',
        title: `${unreadMessages} unread message${unreadMessages > 1 ? 's' : ''}`,
        description: `You have ${unreadMessages} unread inbound message${unreadMessages > 1 ? 's' : ''}`,
        count: unreadMessages,
      })
    }

    // No alerts — good news!
    if (alerts.length === 0) {
      alerts.push({
        type: 'success',
        category: 'general',
        title: 'All clear!',
        description: 'No urgent items need your attention right now.',
      })
    }

    // Sort: urgent first, then warning, then info, then success
    const priority = { urgent: 0, warning: 1, info: 2, success: 3 }
    alerts.sort((a, b) => priority[a.type] - priority[b.type])

    res.json({
      success: true,
      data: { alerts },
    })
  } catch (error: unknown) {
    logger.error('Error fetching dashboard alerts:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard alerts',
      error: getErrorMessage(error),
    })
  }
}

/**
 * GET /api/analytics/pipeline-metrics
 * Returns average time-in-stage for each pipeline stage based on Activity records
 */
export async function getPipelineMetrics(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId

    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Organization required' })
    }

    const stages = ['NEW', 'CONTACTED', 'NURTURING', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']

    // Get status change activities to compute time-in-stage
    const statusChanges = await prisma.activity.findMany({
      where: {
        organizationId,
        type: { in: ['STATUS_CHANGED', 'STAGE_CHANGED'] },
        leadId: { not: null },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        leadId: true,
        metadata: true,
        createdAt: true,
      },
    })

    // Also get lead creation activities
    const leadCreations = await prisma.activity.findMany({
      where: {
        organizationId,
        type: 'LEAD_CREATED',
        leadId: { not: null },
      },
      select: {
        leadId: true,
        createdAt: true,
      },
    })

    // Build timeline per lead: creation -> status changes
    const leadTimelines: Record<string, { status: string; at: Date }[]> = {}

    for (const creation of leadCreations) {
      if (creation.leadId) {
        leadTimelines[creation.leadId] = [{ status: 'NEW', at: creation.createdAt }]
      }
    }

    for (const change of statusChanges) {
      if (!change.leadId) continue
      const meta = change.metadata as any
      const toStatus = meta?.toStatus || meta?.newStatus || meta?.status
      if (!toStatus) continue

      if (!leadTimelines[change.leadId]) {
        leadTimelines[change.leadId] = []
      }
      leadTimelines[change.leadId].push({ status: toStatus.toUpperCase(), at: change.createdAt })
    }

    // Calculate average time per stage
    const stageDurations: Record<string, number[]> = {}
    stages.forEach(s => { stageDurations[s] = [] })

    for (const timeline of Object.values(leadTimelines)) {
      if (timeline.length < 1) continue
      // Sort by time
      timeline.sort((a, b) => a.at.getTime() - b.at.getTime())

      for (let i = 0; i < timeline.length; i++) {
        const current = timeline[i]
        const next = timeline[i + 1]
        if (!next) {
          // Still in this stage — use time from entry to now
          const daysInStage = (Date.now() - current.at.getTime()) / (1000 * 60 * 60 * 24)
          if (stageDurations[current.status] && daysInStage < 365) {
            stageDurations[current.status].push(daysInStage)
          }
        } else {
          const daysInStage = (next.at.getTime() - current.at.getTime()) / (1000 * 60 * 60 * 24)
          if (stageDurations[current.status]) {
            stageDurations[current.status].push(daysInStage)
          }
        }
      }
    }

    const metrics = stages.map(stage => {
      const durations = stageDurations[stage]
      const avgDays = durations.length > 0
        ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
        : 0
      return { stage, avgDays, count: durations.length }
    })

    res.json({ success: true, data: { metrics } })
  } catch (error: unknown) {
    logger.error('Error fetching pipeline metrics:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pipeline metrics',
      error: getErrorMessage(error),
    })
  }
}

/**
 * Phase 8.9: GET /api/analytics/device-breakdown
 * Aggregate device type data from EMAIL_OPENED / EMAIL_CLICKED activities
 * that have deviceType in their metadata (captured from SendGrid webhooks)
 */
export async function getDeviceBreakdown(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Organization required' })
    }

    const campaignId = req.query.campaignId as string | undefined

    const activities = await prisma.activity.findMany({
      where: {
        organizationId,
        type: { in: ['EMAIL_OPENED', 'EMAIL_CLICKED'] },
      },
      select: { metadata: true },
    })

    // Aggregate by device type
    const deviceCounts: Record<string, number> = { Desktop: 0, Mobile: 0, Tablet: 0, Unknown: 0 }
    const browserCounts: Record<string, number> = {}
    const osCounts: Record<string, number> = {}

    for (const activity of activities) {
      const meta = activity.metadata as any
      if (!meta) continue

      // Filter by campaign if specified
      if (campaignId && meta.campaignId !== campaignId) continue

      const deviceType = meta.deviceType || 'Unknown'
      deviceCounts[deviceType] = (deviceCounts[deviceType] || 0) + 1

      if (meta.browser) {
        browserCounts[meta.browser] = (browserCounts[meta.browser] || 0) + 1
      }
      if (meta.os) {
        osCounts[meta.os] = (osCounts[meta.os] || 0) + 1
      }
    }

    const total = Object.values(deviceCounts).reduce((a, b) => a + b, 0)

    res.json({
      success: true,
      data: {
        devices: Object.entries(deviceCounts)
          .filter(([, count]) => count > 0)
          .map(([name, count]) => ({
            name,
            count,
            percentage: calcRate(count, total),
          })),
        browsers: Object.entries(browserCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([name, count]) => ({ name, count })),
        operatingSystems: Object.entries(osCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([name, count]) => ({ name, count })),
        total,
      },
    })
  } catch (error: unknown) {
    logger.error('Error fetching device breakdown:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch device breakdown', error: getErrorMessage(error) })
  }
}

/**
 * Phase 8.9: GET /api/analytics/geographic
 * Aggregate geographic data from EMAIL_OPENED / EMAIL_CLICKED activities
 */
export async function getGeographicBreakdown(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Organization required' })
    }

    const campaignId = req.query.campaignId as string | undefined

    const activities = await prisma.activity.findMany({
      where: {
        organizationId,
        type: { in: ['EMAIL_OPENED', 'EMAIL_CLICKED'] },
      },
      select: { metadata: true },
    })

    const countryCounts: Record<string, number> = {}
    const regionCounts: Record<string, number> = {}
    const cityCounts: Record<string, number> = {}

    for (const activity of activities) {
      const meta = activity.metadata as any
      if (!meta?.country || meta.country === 'Unknown') continue
      if (campaignId && meta.campaignId !== campaignId) continue

      countryCounts[meta.country] = (countryCounts[meta.country] || 0) + 1

      if (meta.region && meta.region !== 'Unknown') {
        const regionKey = `${meta.country}-${meta.region}`
        regionCounts[regionKey] = (regionCounts[regionKey] || 0) + 1
      }

      if (meta.city && meta.city !== 'Unknown') {
        cityCounts[meta.city] = (cityCounts[meta.city] || 0) + 1
      }
    }

    const total = Object.values(countryCounts).reduce((a, b) => a + b, 0)

    res.json({
      success: true,
      data: {
        countries: Object.entries(countryCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 20)
          .map(([name, count]) => ({
            name,
            count,
            percentage: calcRate(count, total),
          })),
        regions: Object.entries(regionCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 20)
          .map(([name, count]) => ({ name, count })),
        cities: Object.entries(cityCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 20)
          .map(([name, count]) => ({ name, count })),
        total,
      },
    })
  } catch (error: unknown) {
    logger.error('Error fetching geographic breakdown:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch geographic breakdown', error: getErrorMessage(error) })
  }
}

