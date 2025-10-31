import { Request, Response } from 'express'
import { prisma } from '../config/database'

// Get overall dashboard statistics
export const getDashboardStats = async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const { startDate, endDate } = req.query

  // Build date filter
  const dateFilter: any = {}
  if (startDate) dateFilter.gte = new Date(startDate as string)
  if (endDate) dateFilter.lte = new Date(endDate as string)

  const whereDate = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}

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
    prisma.lead.count(),
    prisma.lead.count({ where: whereDate }),
    prisma.lead.groupBy({
      by: ['status'],
      _count: true
    }),
    calculateLeadConversionRate(),
    
    // Campaigns
    prisma.campaign.count(),
    prisma.campaign.count({ where: { status: 'ACTIVE' } }),
    calculateCampaignPerformance(),
    
    // Tasks
    prisma.task.count(),
    prisma.task.count({ where: { status: 'COMPLETED' } }),
    prisma.task.count({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { lt: new Date() }
      }
    }),
    prisma.task.count({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }
    }),
    
    // Activities
    prisma.activity.count({ where: whereDate }),
    prisma.activity.findMany({
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
            name: true
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
  const { startDate, endDate, groupBy = 'status' } = req.query

  const dateFilter: any = {}
  if (startDate) dateFilter.gte = new Date(startDate as string)
  if (endDate) dateFilter.lte = new Date(endDate as string)

  const whereDate = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}

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
    calculateLeadConversionRate(whereDate),
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
        name: true,
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
  const { startDate, endDate } = req.query

  const dateFilter: any = {}
  if (startDate) dateFilter.gte = new Date(startDate as string)
  if (endDate) dateFilter.lte = new Date(endDate as string)

  const whereDate = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}

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
    calculateCampaignPerformance(whereDate),
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

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [
    totalTasks,
    tasksByStatus,
    tasksByPriority,
    completedToday,
    dueToday,
    overdue,
    completionRate
  ] = await Promise.all([
    prisma.task.count(),
    prisma.task.groupBy({
      by: ['status'],
      _count: true
    }),
    prisma.task.groupBy({
      by: ['priority'],
      _count: true
    }),
    prisma.task.count({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: today }
      }
    }),
    prisma.task.count({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: {
          gte: today,
          lt: tomorrow
        }
      }
    }),
    prisma.task.count({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { lt: today }
      }
    }),
    calculateTaskCompletionRate()
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
  const { limit = 20, page = 1 } = req.query
  
  const limitNum = Number(limit)
  const pageNum = Number(page)
  const skip = (pageNum - 1) * limitNum

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
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
            name: true,
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
    prisma.activity.count()
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
async function calculateLeadConversionRate(where: any = {}) {
  const [totalLeads, convertedLeads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.count({ where: { ...where, status: 'WON' } })
  ])
  
  return totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0
}

// Helper: Calculate campaign performance
async function calculateCampaignPerformance(where: any = {}) {
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
async function calculateTaskCompletionRate() {
  const [total, completed] = await Promise.all([
    prisma.task.count(),
    prisma.task.count({ where: { status: 'COMPLETED' } })
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
      where: whereDate,
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
