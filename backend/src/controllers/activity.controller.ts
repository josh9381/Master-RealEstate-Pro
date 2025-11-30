import { Request, Response } from 'express'
import { prisma } from '../config/database'
import { NotFoundError } from '../middleware/errorHandler'
import { createActivitySchema, updateActivitySchema, getActivitiesSchema } from '../validators/activity.validator'
import { getActivitiesFilter, getRoleFilterFromRequest } from '../utils/roleFilters'

// Get all activities with filtering and pagination
export const getActivities = async (req: Request, res: Response) => {
  const validated = getActivitiesSchema.parse(req.query)
  
  const {
    type,
    leadId,
    campaignId,
    userId,
    startDate,
    endDate,
    page = 1,
    limit = 50
  } = validated

  // Build where clause with role-based filtering
  const roleFilter = getRoleFilterFromRequest(req)
  const where: any = getActivitiesFilter(roleFilter)
  
  if (type) where.type = type
  if (leadId) where.leadId = leadId
  if (campaignId) where.campaignId = campaignId
  if (userId) where.userId = userId
  
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = new Date(startDate)
    if (endDate) where.createdAt.lte = new Date(endDate)
  }

  const skip = (page - 1) * limit

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true
          }
        },
        campaign: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.activity.count({ where })
  ])

  res.json({
    success: true,
    data: {
      activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  })
}

// Get activity statistics
export const getActivityStats = async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query

  const where: any = {
    organizationId: req.user!.organizationId  // CRITICAL: Filter by organization
  }
  
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = new Date(startDate as string)
    if (endDate) where.createdAt.lte = new Date(endDate as string)
  }

  const [
    total,
    byType,
    recentActivities
  ] = await Promise.all([
    prisma.activity.count({ where }),
    prisma.activity.groupBy({
      by: ['type'],
      where,
      _count: true
    }),
    prisma.activity.findMany({
      where,
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
        }
      }
    })
  ])

  // Format type statistics
  const typeStats = byType.reduce((acc, item) => {
    acc[item.type] = item._count
    return acc
  }, {} as Record<string, number>)

  res.json({
    success: true,
    data: {
      total,
      byType: typeStats,
      recentActivities
    }
  })
}

// Get single activity
export const getActivity = async (req: Request, res: Response) => {
  const { id } = req.params

  const activity = await prisma.activity.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      },
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          status: true,
          company: true
        }
      },
      campaign: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true
        }
      }
    }
  })

  if (!activity) {
    throw new NotFoundError('Activity not found')
  }

  res.json({
    success: true,
    data: activity
  })
}

// Create activity (manual logging)
export const createActivity = async (req: Request, res: Response) => {
  const validated = createActivitySchema.parse(req.body)
  const userId = req.user!.userId

  // Verify lead exists if leadId provided
  if (validated.leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: validated.leadId } })
    if (!lead) {
      throw new NotFoundError('Lead not found')
    }
  }

  // Verify campaign exists if campaignId provided
  if (validated.campaignId) {
    const campaign = await prisma.campaign.findUnique({ where: { id: validated.campaignId } })
    if (!campaign) {
      throw new NotFoundError('Campaign not found')
    }
  }

  const activity = await prisma.activity.create({
    data: {
      type: validated.type,
      title: validated.title,
      description: validated.description,
      leadId: validated.leadId,
      campaignId: validated.campaignId,
      metadata: validated.metadata as any,
      userId,
      organizationId: req.user!.organizationId
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      },
      lead: {
        select: {
          id: true,
          firstName: true,
            lastName: true,
          email: true,
          status: true
        }
      },
      campaign: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true
        }
      }
    }
  })

  res.status(201).json({
    success: true,
    data: activity,
    message: 'Activity created successfully'
  })
}

// Update activity
export const updateActivity = async (req: Request, res: Response) => {
  const { id } = req.params
  const validated = updateActivitySchema.parse(req.body)

  const activity = await prisma.activity.findUnique({ where: { id } })
  if (!activity) {
    throw new NotFoundError('Activity not found')
  }

  const updateData: any = {}
  if (validated.title !== undefined) updateData.title = validated.title
  if (validated.description !== undefined) updateData.description = validated.description
  if (validated.metadata !== undefined) updateData.metadata = validated.metadata

  const updated = await prisma.activity.update({
    where: { id },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      },
      lead: {
        select: {
          id: true,
          firstName: true,
            lastName: true,
          email: true,
          status: true
        }
      },
      campaign: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true
        }
      }
    }
  })

  res.json({
    success: true,
    data: updated,
    message: 'Activity updated successfully'
  })
}

// Delete activity
export const deleteActivity = async (req: Request, res: Response) => {
  const { id } = req.params

  const activity = await prisma.activity.findUnique({ where: { id } })
  if (!activity) {
    throw new NotFoundError('Activity not found')
  }

  await prisma.activity.delete({ where: { id } })

  res.json({
    success: true,
    message: 'Activity deleted successfully'
  })
}

// Get activities for a specific lead
export const getLeadActivities = async (req: Request, res: Response) => {
  const { leadId } = req.params
  const { page = 1, limit = 20 } = req.query

  const pageNum = Number(page)
  const limitNum = Number(limit)
  const skip = (pageNum - 1) * limitNum

  // Verify lead exists and belongs to user's organization
  const lead = await prisma.lead.findUnique({ 
    where: { id: leadId },
    select: { id: true, organizationId: true }
  })
  
  if (!lead) {
    throw new NotFoundError('Lead not found')
  }
  
  if (lead.organizationId !== req.user!.organizationId) {
    throw new NotFoundError('Lead not found')  // Don't reveal it exists in another org
  }

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where: { 
        leadId,
        organizationId: req.user!.organizationId  // CRITICAL: Filter by organization
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        campaign: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    }),
    prisma.activity.count({ where: { leadId } })
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

// Get activities for a specific campaign
export const getCampaignActivities = async (req: Request, res: Response) => {
  const { campaignId } = req.params
  const { page = 1, limit = 20 } = req.query

  const pageNum = Number(page)
  const limitNum = Number(limit)
  const skip = (pageNum - 1) * limitNum

  // Verify campaign exists and belongs to user's organization
  const campaign = await prisma.campaign.findUnique({ 
    where: { id: campaignId },
    select: { id: true, organizationId: true }
  })
  
  if (!campaign) {
    throw new NotFoundError('Campaign not found')
  }
  
  if (campaign.organizationId !== req.user!.organizationId) {
    throw new NotFoundError('Campaign not found')  // Don't reveal it exists in another org
  }

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where: { 
        campaignId,
        organizationId: req.user!.organizationId  // CRITICAL: Filter by organization
      },
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
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    }),
    prisma.activity.count({ where: { campaignId } })
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
