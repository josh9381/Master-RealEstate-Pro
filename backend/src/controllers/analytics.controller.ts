import { Request, Response } from 'express'
import { prisma } from '../config/database'

// Get overall dashboard statistics
export const getDashboardStats = async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const organizationId = req.user!.organizationId  // CRITICAL: Get organization ID
  const { startDate, endDate } = req.query

  // Build date filter
  const dateFilter: any = {}
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

  const dateFilter: any = {}
  if (startDate) dateFilter.gte = new Date(startDate as string)
  if (endDate) dateFilter.lte = new Date(endDate as string)

  const whereDate = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter, organizationId } : { organizationId }

  const [
    totalLeads,
    leadsByStatus,
    leadsBySource,
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

  res.json({
    success: true,
    data: {
      total: totalLeads,
      byStatus,
      bySource,
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

  const dateFilter: any = {}
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
  const dateFilter: any = {}
  if (startDate) dateFilter.gte = new Date(startDate as string)
  if (endDate) dateFilter.lte = new Date(endDate as string)
  const hasDateFilter = Object.keys(dateFilter).length > 0

  const orgWhere: any = { organizationId }
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
  const dateFilter: any = {}
  if (startDate) dateFilter.gte = new Date(startDate as string)
  if (endDate) dateFilter.lte = new Date(endDate as string)
  const hasDateFilter = Object.keys(dateFilter).length > 0

  const orgWhere: any = { organizationId: req.user!.organizationId }
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
    deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
    openRate: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
    clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
    conversionRate: sent > 0 ? Math.round((converted / sent) * 100) : 0,
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
    const dateFilter: any = {}
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
        conversionRate = Math.round((stage.count / stages[index - 1].count) * 100)
      }
      return {
        ...stage,
        conversionRate,
        percentage: totalLeads > 0 ? Math.round((stage.count / totalLeads) * 100) : 0
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
  } catch (error: any) {
    console.error('Error fetching conversion funnel:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversion funnel analytics',
      error: error.message
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
  } catch (error: any) {
    console.error('Error fetching monthly performance:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly performance data',
      error: error.message,
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
  } catch (error: any) {
    console.error('Error fetching hourly engagement:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hourly engagement data',
      error: error.message,
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

    const dateFilter: any = {}
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
        const leadWhere: any = { assignedToId: user.id, organizationId }
        const activityWhere: any = { userId: user.id, organizationId }
        const taskWhere: any = { assignedToId: user.id, organizationId }

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
  } catch (error: any) {
    console.error('Error fetching team performance:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team performance data',
      error: error.message,
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
  } catch (error: any) {
    console.error('Error fetching revenue timeline:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue timeline data',
      error: error.message,
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
  } catch (error: any) {
    console.error('Error fetching dashboard alerts:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard alerts',
      error: error.message,
    })
  }
}

/**
 * GET /api/analytics/pipeline-metrics
 * Returns average time-in-stage for each pipeline stage based on Activity records
 */
export async function getPipelineMetrics(req: any, res: any) {
  try {
    const organizationId = req.user?.organizationId

    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Organization required' })
    }

    const stages = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']

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
  } catch (error: any) {
    console.error('Error fetching pipeline metrics:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pipeline metrics',
      error: error.message,
    })
  }
}

/**
 * Phase 8.9: GET /api/analytics/device-breakdown
 * Aggregate device type data from EMAIL_OPENED / EMAIL_CLICKED activities
 * that have deviceType in their metadata (captured from SendGrid webhooks)
 */
export async function getDeviceBreakdown(req: any, res: any) {
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
  } catch (error: any) {
    console.error('Error fetching device breakdown:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch device breakdown', error: error.message })
  }
}

/**
 * Phase 8.9: GET /api/analytics/geographic
 * Aggregate geographic data from EMAIL_OPENED / EMAIL_CLICKED activities
 */
export async function getGeographicBreakdown(req: any, res: any) {
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
  } catch (error: any) {
    console.error('Error fetching geographic breakdown:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch geographic breakdown', error: error.message })
  }
}
