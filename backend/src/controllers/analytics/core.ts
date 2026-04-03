/* eslint-disable @typescript-eslint/no-explicit-any */
import { getErrorMessage } from '../../utils/errors'
import { logger } from '../../lib/logger'
import { Request, Response } from 'express'
import { prisma } from '../../config/database'
import {
  calcRateClamped, calcOpenRate, calcClickRate, calcConversionRate,
  calcDeliveryRate, calcCompletionRate, calcLeadConversionRate,
} from '../../utils/metricsCalculator'

// Get overall dashboard statistics
export const getDashboardStats = async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId  // CRITICAL: Get organization ID
  const { startDate, endDate, source, status, priority } = req.query

  // Build date filter
  const dateFilter: Record<string, any> = {}
  if (startDate) dateFilter.gte = new Date(startDate as string)
  if (endDate) dateFilter.lte = new Date(endDate as string)

  const whereDate = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}
  const orgFilter = { organizationId }  // Filter by organization
  const whereDateOrg = { ...whereDate, ...orgFilter }  // Combine filters

  // Build lead-specific filters (source, status)
  const leadFilter: Record<string, unknown> = { ...orgFilter }
  if (source && source !== 'all') leadFilter.source = { equals: source as string, mode: 'insensitive' }
  if (status && status !== 'all') leadFilter.status = (status as string).toUpperCase()
  const leadDateFilter = { ...whereDate, ...leadFilter }

  // Build task-specific filters (priority)
  const taskFilter: Record<string, unknown> = { organizationId }
  if (priority && priority !== 'all') taskFilter.priority = (priority as string).toUpperCase()

  // Calculate previous period for comparison
  let previousPeriodConversionRate: number | null = null
  if (startDate && endDate) {
    const start = new Date(startDate as string)
    const end = new Date(endDate as string)
    const periodMs = end.getTime() - start.getTime()
    const prevStart = new Date(start.getTime() - periodMs)
    const prevEnd = new Date(start.getTime())
    previousPeriodConversionRate = await calculateLeadConversionRate(organizationId, { gte: prevStart, lte: prevEnd })
  }

  // Fetch all statistics in parallel
  const [
    // Lead stats
    totalLeads,
    newLeads,
    leadsByStatus,
    leadConversionRate,
    
    // Campaign stats
    totalCampaigns,
    activeCampaigns,
    campaignPerformance,
    
    // Task stats
    totalTasks,
    completedTasks,
    overdueTasks,
    tasksDueToday,
    
    // Activity stats
    totalActivities,
    recentActivities
  ] = await Promise.all([
    // Leads — apply source/status filters
    prisma.lead.count({ where: leadFilter }),
    prisma.lead.count({ where: leadDateFilter }),
    prisma.lead.groupBy({
      by: ['status'],
      where: leadFilter,
      _count: true
    }),
    calculateLeadConversionRate(organizationId, Object.keys(dateFilter).length > 0 ? dateFilter : undefined),
    
    // Campaigns
    prisma.campaign.count({ where: orgFilter }),
    prisma.campaign.count({ where: { status: 'ACTIVE', organizationId } }),
    calculateCampaignPerformance(organizationId, Object.keys(dateFilter).length > 0 ? dateFilter : undefined),
    
    // Tasks — apply priority filter
    prisma.task.count({ where: taskFilter }),
    prisma.task.count({ where: { ...taskFilter, status: 'COMPLETED' } }),
    prisma.task.count({
      where: {
        ...taskFilter,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { lt: new Date() }
      }
    }),
    prisma.task.count({
      where: {
        ...taskFilter,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }
    }),
    
    // Activities
    prisma.activity.count({ where: whereDateOrg }),
    prisma.activity.findMany({
      where: orgFilter,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })
  ])

  // Format lead stats by status
  const leadStats = leadsByStatus.reduce((acc, item) => {
    acc[item.status] = item._count
    return acc
  }, {} as Record<string, number>)

  // Calculate task completion rate
  const taskCompletionRate = calcCompletionRate(completedTasks, totalTasks)

  res.json({
    success: true,
    data: {
      overview: {
        totalLeads,
        newLeads,
        totalCampaigns,
        activeCampaigns,
        totalTasks,
        totalActivities
      },
      leads: {
        total: totalLeads,
        new: newLeads,
        byStatus: leadStats,
        conversionRate: leadConversionRate,
        previousConversionRate: previousPeriodConversionRate
      },
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns,
        performance: campaignPerformance
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        overdue: overdueTasks,
        dueToday: tasksDueToday,
        completionRate: taskCompletionRate
      },
      activities: {
        total: totalActivities,
        recent: recentActivities
      }
    }
  })
}

// Get lead analytics
export const getLeadAnalytics = async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId  // CRITICAL: Get organization ID
  const { startDate, endDate, source, status } = req.query

  const dateFilter: Record<string, unknown> = {}
  if (startDate) dateFilter.gte = new Date(startDate as string)
  if (endDate) dateFilter.lte = new Date(endDate as string)

  const baseWhere: Record<string, unknown> = { organizationId }
  if (Object.keys(dateFilter).length > 0) baseWhere.createdAt = dateFilter
  if (source && source !== 'all') baseWhere.source = { equals: source as string, mode: 'insensitive' }
  if (status && status !== 'all') baseWhere.status = (status as string).toUpperCase()

  const whereDate = baseWhere

  const [
    totalLeads,
    leadsByStatus,
    leadsBySource,
    wonLeadsBySource,
    conversionRate,
    averageLeadScore,
    topLeads
  ] = await Promise.all([
    prisma.lead.count({ where: whereDate }),
    prisma.lead.groupBy({
      by: ['status'],
      where: whereDate,
      _count: true
    }),
    prisma.lead.groupBy({
      by: ['source'],
      where: whereDate,
      _count: true
    }),
    prisma.lead.groupBy({
      by: ['source'],
      where: { ...whereDate, status: 'WON' },
      _count: true
    }),
    calculateLeadConversionRate(organizationId, Object.keys(dateFilter).length > 0 ? dateFilter : undefined),
    prisma.lead.aggregate({
      where: whereDate,
      _avg: { score: true }
    }),
    prisma.lead.findMany({
      where: whereDate,
      take: 10,
      orderBy: { score: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        score: true,
        status: true,
        value: true,
        createdAt: true
      }
    })
  ])

  // Format by status
  const byStatus = leadsByStatus.reduce((acc, item) => {
    acc[item.status] = item._count
    return acc
  }, {} as Record<string, number>)

  // Format by source
  const bySource = leadsBySource.reduce((acc, item) => {
    acc[item.source || 'Unknown'] = item._count
    return acc
  }, {} as Record<string, number>)

  // Format won leads by source (for per-source conversion rates)
  const wonBySource = wonLeadsBySource.reduce((acc, item) => {
    acc[item.source || 'Unknown'] = item._count
    return acc
  }, {} as Record<string, number>)

  // Build monthly lead trends (last 6 months)
  const trendStart = new Date()
  trendStart.setMonth(trendStart.getMonth() - 6)
  trendStart.setDate(1)
  trendStart.setHours(0, 0, 0, 0)

  const trendLeads = await prisma.lead.findMany({
    where: { organizationId, createdAt: { gte: trendStart } },
    select: { status: true, createdAt: true },
  })

  const trendMap: Record<string, { month: string; newLeads: number; qualified: number; converted: number }> = {}
  const cur = new Date(trendStart)
  const nowDate = new Date()
  while (cur <= nowDate) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`
    trendMap[key] = { month: key, newLeads: 0, qualified: 0, converted: 0 }
    cur.setMonth(cur.getMonth() + 1)
  }
  trendLeads.forEach((lead) => {
    const key = `${lead.createdAt.getFullYear()}-${String(lead.createdAt.getMonth() + 1).padStart(2, '0')}`
    if (trendMap[key]) {
      trendMap[key].newLeads++
      if (lead.status === 'QUALIFIED') trendMap[key].qualified++
      if (lead.status === 'WON') trendMap[key].converted++
    }
  })
  const trends = Object.values(trendMap)

  res.json({
    success: true,
    data: {
      total: totalLeads,
      byStatus,
      bySource,
      wonBySource,
      conversionRate,
      averageScore: Math.round(averageLeadScore._avg.score || 0),
      topLeads,
      trends
    }
  })
}

// Get campaign analytics
export const getCampaignAnalytics = async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId  // CRITICAL: Get organization ID
  const { startDate, endDate } = req.query

  const dateFilter: Record<string, any> = {}
  if (startDate) dateFilter.gte = new Date(startDate as string)
  if (endDate) dateFilter.lte = new Date(endDate as string)

  const whereDate = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter, organizationId } : { organizationId }

  const [
    totalCampaigns,
    campaignsByType,
    campaignsByStatus,
    performance,
    topCampaigns
  ] = await Promise.all([
    prisma.campaign.count({ where: whereDate }),
    prisma.campaign.groupBy({
      by: ['type'],
      where: whereDate,
      _count: true
    }),
    prisma.campaign.groupBy({
      by: ['status'],
      where: whereDate,
      _count: true
    }),
    calculateCampaignPerformance(organizationId, Object.keys(dateFilter).length > 0 ? dateFilter : undefined),
    prisma.campaign.findMany({
      where: whereDate,
      take: 10,
      orderBy: { converted: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        sent: true,
        opened: true,
        clicked: true,
        converted: true,
        revenue: true,
        roi: true,
        spent: true
      }
    })
  ])

  const byType = campaignsByType.reduce((acc, item) => {
    acc[item.type] = item._count
    return acc
  }, {} as Record<string, number>)

  const byStatus = campaignsByStatus.reduce((acc, item) => {
    acc[item.status] = item._count
    return acc
  }, {} as Record<string, number>)

  res.json({
    success: true,
    data: {
      total: totalCampaigns,
      byType,
      byStatus,
      performance,
      topCampaigns
    }
  })
}

// Get task analytics
export const getTaskAnalytics = async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId
  const { startDate, endDate } = req.query

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Build date filter for task analytics
  const dateFilter: Record<string, any> = {}
  if (startDate) dateFilter.gte = new Date(startDate as string)
  if (endDate) dateFilter.lte = new Date(endDate as string)
  const hasDateFilter = Object.keys(dateFilter).length > 0

  const orgWhere: Record<string, any> = { organizationId }
  if (hasDateFilter) {
    orgWhere.createdAt = dateFilter
  }

  const [
    totalTasks,
    tasksByStatus,
    tasksByPriority,
    completedToday,
    dueToday,
    overdue,
    completionRate
  ] = await Promise.all([
    prisma.task.count({ where: orgWhere }),
    prisma.task.groupBy({
      by: ['status'],
      where: orgWhere,
      _count: true
    }),
    prisma.task.groupBy({
      by: ['priority'],
      where: orgWhere,
      _count: true
    }),
    prisma.task.count({
      where: {
        ...orgWhere,
        status: 'COMPLETED',
        completedAt: { gte: today }
      }
    }),
    prisma.task.count({
      where: {
        ...orgWhere,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: {
          gte: today,
          lt: tomorrow
        }
      }
    }),
    prisma.task.count({
      where: {
        ...orgWhere,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { lt: today }
      }
    }),
    calculateTaskCompletionRate(organizationId)
  ])

  const byStatus = tasksByStatus.reduce((acc, item) => {
    acc[item.status] = item._count
    return acc
  }, {} as Record<string, number>)

  const byPriority = tasksByPriority.reduce((acc, item) => {
    acc[item.priority] = item._count
    return acc
  }, {} as Record<string, number>)

  res.json({
    success: true,
    data: {
      total: totalTasks,
      byStatus,
      byPriority,
      completedToday,
      dueToday,
      overdue,
      completionRate
    }
  })
}

// Get activity feed
export const getActivityFeed = async (req: Request, res: Response) => {
  const { limit = 20, page = 1, startDate, endDate } = req.query
  
  const limitNum = Math.min(Number(limit) || 20, 200)
  const pageNum = Number(page)
  const skip = (pageNum - 1) * limitNum

  // Build date filter
  const dateFilter: Record<string, any> = {}
  if (startDate) dateFilter.gte = new Date(startDate as string)
  if (endDate) dateFilter.lte = new Date(endDate as string)
  const hasDateFilter = Object.keys(dateFilter).length > 0

  const orgWhere: Record<string, any> = { organizationId: req.user!.organizationId }
  if (hasDateFilter) {
    orgWhere.createdAt = dateFilter
  }

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where: orgWhere,
      take: limitNum,
      skip,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        campaign: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    }),
    prisma.activity.count({ where: orgWhere })
  ])

  res.json({
    success: true,
    data: {
      activities,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }
  })
}

// Helper: Calculate lead conversion rate
// Uses WON / (WON + LOST) — industry-standard pipeline conversion.
async function calculateLeadConversionRate(organizationId: string, dateFilter?: Record<string, any>) {
  const where: Record<string, any> = { organizationId }
  if (dateFilter && Object.keys(dateFilter).length > 0) {
    where.createdAt = dateFilter
  }
  const [wonLeads, lostLeads] = await Promise.all([
    prisma.lead.count({ where: { ...where, status: 'WON' } }),
    prisma.lead.count({ where: { ...where, status: 'LOST' } })
  ])
  const decided = wonLeads + lostLeads
  return calcLeadConversionRate(wonLeads, decided)
}

// Helper: Calculate campaign performance
async function calculateCampaignPerformance(organizationId: string, dateFilter?: Record<string, any>) {
  const where: Record<string, any> = { organizationId }
  if (dateFilter && Object.keys(dateFilter).length > 0) {
    where.createdAt = dateFilter
  }
  const aggregate = await prisma.campaign.aggregate({
    where,
    _sum: {
      sent: true,
      delivered: true,
      opened: true,
      clicked: true,
      converted: true,
      revenue: true,
      spent: true
    },
    _avg: {
      roi: true
    }
  })

  const sent = aggregate._sum.sent || 0
  const delivered = aggregate._sum.delivered || 0
  const opened = aggregate._sum.opened || 0
  const clicked = aggregate._sum.clicked || 0
  const converted = aggregate._sum.converted || 0

  return {
    totalSent: sent,
    totalDelivered: delivered,
    totalOpened: opened,
    totalClicked: clicked,
    totalConverted: converted,
    deliveryRate: calcDeliveryRate(delivered, sent),
    openRate: calcOpenRate(opened, sent),
    clickRate: calcClickRate(clicked, sent),
    conversionRate: calcConversionRate(converted, sent),
    totalRevenue: aggregate._sum.revenue || 0,
    totalSpent: aggregate._sum.spent || 0,
    averageROI: Math.round(aggregate._avg.roi || 0)
  }
}

// Helper: Calculate task completion rate
async function calculateTaskCompletionRate(organizationId?: string) {
  const where = organizationId ? { organizationId } : {}
  const [total, completed] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.count({ where: { ...where, status: 'COMPLETED' as any } })
  ])
  
  return calcCompletionRate(completed, total)
}

// Get conversion funnel analytics
export const getConversionFunnel = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query

    // Build date filter
    const dateFilter: Record<string, any> = {}
    if (startDate) dateFilter.gte = new Date(startDate as string)
    if (endDate) dateFilter.lte = new Date(endDate as string)

    const whereDate = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}

    // Get lead counts by status (funnel stages)
    const leadsByStatus = await prisma.lead.groupBy({
      by: ['status'],
      where: { ...whereDate, organizationId: req.user!.organizationId },
      _count: true
    })

    // Map status to funnel stages
    const funnelData = {
      new: 0,
      contacted: 0,
      qualified: 0,
      proposal: 0,
      negotiation: 0,
      won: 0,
      lost: 0
    }

    leadsByStatus.forEach(item => {
      const status = item.status.toLowerCase() as keyof typeof funnelData
      if (status in funnelData) {
        funnelData[status] = item._count
      }
    })

    // Calculate conversion rates
    const totalLeads = Object.values(funnelData).reduce((sum, count) => sum + count, 0)
    const wonLeads = funnelData.won
    const decidedLeads = wonLeads + funnelData.lost
    const overallConversionRate = calcLeadConversionRate(wonLeads, decidedLeads)

    // Calculate stage-to-stage conversion rates
    const stages = [
      { name: 'New Leads', count: funnelData.new, stage: 'new' },
      { name: 'Contacted', count: funnelData.contacted, stage: 'contacted' },
      { name: 'Qualified', count: funnelData.qualified, stage: 'qualified' },
      { name: 'Proposal Sent', count: funnelData.proposal, stage: 'proposal' },
      { name: 'Negotiation', count: funnelData.negotiation, stage: 'negotiation' },
      { name: 'Won', count: funnelData.won, stage: 'won' }
    ]

    const stagesWithRates = stages.map((stage, index) => {
      let conversionRate = 0
      if (index > 0 && stages[index - 1].count > 0) {
        conversionRate = calcRateClamped(stage.count, stages[index - 1].count)
      }
      return {
        ...stage,
        conversionRate,
        percentage: calcRateClamped(stage.count, totalLeads)
      }
    })

    // Compute time-to-convert buckets from won leads
    const wonLeadRecords = await prisma.lead.findMany({
      where: {
        ...whereDate,
        organizationId: req.user!.organizationId,
        status: 'WON'
      },
      select: { createdAt: true, updatedAt: true }
    })

    const buckets: Record<string, number> = {
      '0-7 days': 0,
      '8-14 days': 0,
      '15-30 days': 0,
      '31-60 days': 0,
      '60+ days': 0
    }

    wonLeadRecords.forEach(lead => {
      const days = Math.floor(
        (new Date(lead.updatedAt).getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (days <= 7) buckets['0-7 days']++
      else if (days <= 14) buckets['8-14 days']++
      else if (days <= 30) buckets['15-30 days']++
      else if (days <= 60) buckets['31-60 days']++
      else buckets['60+ days']++
    })

    const timeToConvert = Object.entries(buckets).map(([days, count]) => ({ days, count }))

    res.json({
      success: true,
      data: {
        stages: stagesWithRates,
        lost: funnelData.lost,
        totalLeads,
        wonLeads,
        lostLeads: funnelData.lost,
        overallConversionRate,
        lostRate: calcLeadConversionRate(funnelData.lost, totalLeads),
        timeToConvert
      }
    })
  } catch (error: unknown) {
    logger.error('Error fetching conversion funnel:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversion funnel analytics',
      error: getErrorMessage(error)
    })
  }
}

// ============================================================================
// Usage Analytics — server-side aggregation
// ============================================================================

/**
 * GET /api/analytics/usage-stats
 * Aggregates activity data server-side so the frontend doesn't need to fetch
 * the full activity feed and compute metrics client-side.
 */
export const getUsageStats = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const { startDate, endDate } = req.query

    const dateFilter: Record<string, any> = {}
    if (startDate) dateFilter.gte = new Date(startDate as string)
    if (endDate) dateFilter.lte = new Date(endDate as string)
    const dateWhere = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}

    // Aggregation: count activities grouped by date and type
    const activities = await prisma.activity.findMany({
      where: { organizationId, ...dateWhere },
      select: {
        type: true,
        createdAt: true,
        userId: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    // Daily buckets
    const dailyMap: Record<string, { date: string; users: Set<string>; activities: number }> = {}
    const typeCounts: Record<string, number> = {}
    const uniqueUsers = new Set<string>()

    for (const a of activities) {
      const date = a.createdAt.toISOString().split('T')[0]
      if (!dailyMap[date]) {
        dailyMap[date] = { date, users: new Set(), activities: 0 }
      }
      dailyMap[date].activities++
      if (a.userId) {
        dailyMap[date].users.add(a.userId)
        uniqueUsers.add(a.userId)
      }

      const type = a.type || 'OTHER'
      typeCounts[type] = (typeCounts[type] || 0) + 1
    }

    const totalActivities = activities.length

    const daily = Object.values(dailyMap)
      .map(({ date, users, activities: count }) => ({
        date,
        users: users.size,
        activities: count,
      }))
      .slice(-30) // last 30 days at most

    const featureUsage = Object.entries(typeCounts)
      .map(([type, count]) => ({
        feature: type.charAt(0).toUpperCase() + type.slice(1).toLowerCase().replace(/_/g, ' '),
        usage: count,
        percentage: totalActivities > 0 ? Math.round((count / totalActivities) * 100) : 0,
      }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10)

    // Top users by activity count
    const userCounts: Record<string, number> = {}
    for (const a of activities) {
      if (a.userId) {
        userCounts[a.userId] = (userCounts[a.userId] || 0) + 1
      }
    }

    const topUserIds = Object.entries(userCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id]) => id)

    const topUserRecords = topUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: topUserIds }, organizationId },
          select: { id: true, firstName: true, lastName: true },
        })
      : []

    const userNameMap = new Map(topUserRecords.map((u) => [u.id, `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown']))

    const topUsers = topUserIds.map((id) => ({
      name: userNameMap.get(id) || 'Unknown',
      actions: userCounts[id],
    }))

    res.json({
      success: true,
      data: {
        totalActivities,
        uniqueUsers: uniqueUsers.size,
        daily,
        featureUsage,
        topUsers,
      },
    })
  } catch (error: unknown) {
    logger.error('Error fetching usage stats:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch usage statistics',
      error: getErrorMessage(error),
    })
  }
}

