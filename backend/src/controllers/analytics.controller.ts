import { getErrorMessage } from '../utils/errors'
import { logger } from '../lib/logger'
import { Request, Response } from 'express'
import { prisma } from '../config/database'

// Get overall dashboard statistics
export const getDashboardStats = async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const organizationId = req.user!.organizationId  // CRITICAL: Get organization ID
  const { startDate, endDate } = req.query

  // Build date filter
  const dateFilter: Record<string, any> = {}
  if (startDate) dateFilter.gte = new Date(startDate as string)
  if (endDate) dateFilter.lte = new Date(endDate as string)

  const whereDate = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}
  const orgFilter = { organizationId }  // Filter by organization
  const whereDateOrg = { ...whereDate, ...orgFilter }  // Combine filters

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
    // Leads
    prisma.lead.count({ where: orgFilter }),
    prisma.lead.count({ where: whereDateOrg }),
    prisma.lead.groupBy({
      by: ['status'],
      where: orgFilter,
      _count: true
    }),
    calculateLeadConversionRate(organizationId),
    
    // Campaigns
    prisma.campaign.count({ where: orgFilter }),
    prisma.campaign.count({ where: { status: 'ACTIVE', organizationId } }),
    calculateCampaignPerformance(organizationId),
    
    // Tasks
    prisma.task.count({ where: { organizationId } }),
    prisma.task.count({ where: { status: 'COMPLETED', organizationId } }),
    prisma.task.count({
      where: {
        organizationId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { lt: new Date() }
      }
    }),
    prisma.task.count({
      where: {
        organizationId,
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
  const taskCompletionRate = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0

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
        conversionRate: leadConversionRate
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
  const { startDate, endDate, groupBy = 'status' } = req.query

  const dateFilter: Record<string, any> = {}
  if (startDate) dateFilter.gte = new Date(startDate as string)
  if (endDate) dateFilter.lte = new Date(endDate as string)

  const whereDate = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter, organizationId } : { organizationId }

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
    calculateLeadConversionRate(organizationId),
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

  res.json({
    success: true,
    data: {
      total: totalLeads,
      byStatus,
      bySource,
      wonBySource,
      conversionRate,
      averageScore: Math.round(averageLeadScore._avg.score || 0),
      topLeads
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
    calculateCampaignPerformance(organizationId),
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
        revenue: true
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
  const userId = req.user!.userId
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
  
  const limitNum = Number(limit)
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
async function calculateLeadConversionRate(organizationId: string) {
  const where = { organizationId }
  const [totalLeads, convertedLeads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.count({ where: { ...where, status: 'WON' } })
  ])
  
  return totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0
}

// Helper: Calculate campaign performance
async function calculateCampaignPerformance(organizationId: string) {
  const where = { organizationId }
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
    deliveryRate: sent > 0 ? Math.min(Math.round((delivered / sent) * 100), 100) : 0,
    openRate: delivered > 0 ? Math.min(Math.round((opened / delivered) * 100), 100) : 0,
    clickRate: opened > 0 ? Math.min(Math.round((clicked / opened) * 100), 100) : 0,
    conversionRate: sent > 0 ? Math.min(Math.round((converted / sent) * 100), 100) : 0,
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
  
  return total > 0 ? Math.round((completed / total) * 100) : 0
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
    const overallConversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0

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
        conversionRate = Math.min(Math.round((stage.count / stages[index - 1].count) * 100), 100)
      }
      return {
        ...stage,
        conversionRate,
        percentage: totalLeads > 0 ? Math.min(Math.round((stage.count / totalLeads) * 100), 100) : 0
      }
    })

    res.json({
      success: true,
      data: {
        stages: stagesWithRates,
        lost: funnelData.lost,
        totalLeads,
        wonLeads,
        lostLeads: funnelData.lost,
        overallConversionRate,
        lostRate: totalLeads > 0 ? Math.round((funnelData.lost / totalLeads) * 100) : 0
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
      openRate: m.delivered > 0 ? Math.round((m.opened / m.delivered) * 100) : 0,
      clickRate: m.opened > 0 ? Math.round((m.clicked / m.opened) * 100) : 0,
      conversionRate: m.sent > 0 ? Math.round((m.converted / m.sent) * 100) : 0,
      deliveryRate: m.sent > 0 ? Math.round((m.delivered / m.sent) * 100) : 0,
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
          totalActivities,
          completedTasks,
          totalTasks,
        ] = await Promise.all([
          prisma.lead.count({ where: leadWhere }),
          prisma.lead.count({ where: { ...leadWhere, status: 'WON' } }),
          prisma.activity.count({ where: activityWhere }),
          prisma.task.count({ where: { ...taskWhere, status: 'COMPLETED' } }),
          prisma.task.count({ where: taskWhere }),
        ])

        const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0
        const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

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
      const openRate = c.sent > 0 ? (c.opened / c.sent) * 100 : 0
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
          openRate: c.sent > 0 ? Math.round((c.opened / c.sent) * 100) : 0,
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
            percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
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
            percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
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
        return touchpoints.map((tp, i) => ({
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

    // Step 1: Get all WON leads in date range (these are our "conversions")
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
          credit: Math.round(c.credit * 1000) / 1000,
        })),
      })
    }

    res.json({
      success: true,
      data: {
        model,
        conversions: wonLeads.length,
        totalRevenue: totalAttributedRevenue,
        bySource: Object.entries(sourceCredits)
          .sort(([, a], [, b]) => b.revenue - a.revenue)
          .map(([name, data]) => ({ name, ...data, credit: Math.round(data.credit * 100) / 100 })),
        byCampaign: Object.entries(campaignCredits)
          .sort(([, a], [, b]) => b.revenue - a.revenue)
          .map(([id, data]) => ({ campaignId: id, ...data, credit: Math.round(data.credit * 100) / 100 })),
        byChannel: Object.entries(channelCredits)
          .sort(([, a], [, b]) => b.revenue - a.revenue)
          .map(([name, data]) => ({ name, ...data, credit: Math.round(data.credit * 1000) / 1000 })),
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
          credit: credits[i] ? Math.round(credits[i].credit * 1000) / 1000 : 0,
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
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 1000) / 10
    }

    const currentRevenueVal = currentRevenue._sum.value || 0
    const previousRevenueVal = previousRevenue._sum.value || 0
    const currentConvRate = currentLeads > 0 ? (currentWon / currentLeads) * 100 : 0
    const previousConvRate = previousLeads > 0 ? (previousWon / previousLeads) * 100 : 0

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
            current: Math.round(currentConvRate * 10) / 10,
            previous: Math.round(previousConvRate * 10) / 10,
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
        conversionRate: data.total > 0 ? Math.round((data.won / data.total) * 1000) / 10 : 0,
        avgDealSize: data.values.length > 0 ? Math.round(data.revenue / data.values.length) : 0,
        // ROI = revenue per lead (since we don't track ad spend, this is revenue efficiency)
        revenuePerLead: data.total > 0 ? Math.round(data.revenue / data.total) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)

    const totals = {
      totalLeads: leads.length,
      totalWon: results.reduce((s, r) => s + r.wonLeads, 0),
      totalRevenue: results.reduce((s, r) => s + r.revenue, 0),
      overallConversionRate: leads.length > 0
        ? Math.round((results.reduce((s, r) => s + r.wonLeads, 0) / leads.length) * 1000) / 10
        : 0,
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
          completionRate: total > 0 ? Math.round((completed / total) * 1000) / 10 : 0,
          avgResponseHours,
        },
        byPriority: Object.entries(byPriority).map(([priority, data]) => ({
          priority,
          ...data,
          completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 1000) / 10 : 0,
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
