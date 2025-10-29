import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { NotFoundError, ForbiddenError } from '../middleware/errorHandler';
import type { CampaignStatus, CampaignType } from '@prisma/client';

/**
 * Get all campaigns with filtering and pagination
 * GET /api/campaigns
 */
export const getCampaigns = async (req: Request, res: Response) => {
  // Get validated query parameters
  const validatedQuery = (req as any).validatedQuery || req.query;
  const {
    page = 1,
    limit = 20,
    status,
    type,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = validatedQuery;

  // Build where clause
  const where: any = {};

  if (status) where.status = status as CampaignStatus;
  if (type) where.type = type as CampaignType;

  // Search in name and subject
  if (search) {
    where.OR = [
      { name: { contains: search as string } },
      { subject: { contains: search as string } },
    ];
  }

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Build orderBy
  const orderBy = {
    [sortBy as string]: sortOrder,
  };

  // Execute queries
  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        _count: {
          select: {
            activities: true,
          },
        },
      },
      skip,
      take,
      orderBy,
    }),
    prisma.campaign.count({ where }),
  ]);

  // Calculate metrics for each campaign
  const campaignsWithMetrics = campaigns.map(campaign => ({
    ...campaign,
    metrics: {
      openRate: campaign.sent > 0 ? ((campaign.opened / campaign.sent) * 100).toFixed(2) : '0.00',
      clickRate: campaign.sent > 0 ? ((campaign.clicked / campaign.sent) * 100).toFixed(2) : '0.00',
      conversionRate: campaign.sent > 0 ? ((campaign.converted / campaign.sent) * 100).toFixed(2) : '0.00',
      bounceRate: campaign.sent > 0 ? ((campaign.bounced / campaign.sent) * 100).toFixed(2) : '0.00',
    },
  }));

  res.json({
    success: true,
    data: {
      campaigns: campaignsWithMetrics,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
};

/**
 * Get single campaign by ID
 * GET /api/campaigns/:id
 */
export const getCampaign = async (req: Request, res: Response) => {
  const { id } = req.params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
      },
      tags: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      activities: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      },
      _count: {
        select: {
          activities: true,
        },
      },
    },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign not found');
  }

  // Calculate metrics
  const metrics = {
    openRate: campaign.sent > 0 ? ((campaign.opened / campaign.sent) * 100).toFixed(2) : '0.00',
    clickRate: campaign.sent > 0 ? ((campaign.clicked / campaign.sent) * 100).toFixed(2) : '0.00',
    conversionRate: campaign.sent > 0 ? ((campaign.converted / campaign.sent) * 100).toFixed(2) : '0.00',
    bounceRate: campaign.sent > 0 ? ((campaign.bounced / campaign.sent) * 100).toFixed(2) : '0.00',
    roi: campaign.spent && campaign.spent > 0 && campaign.revenue
      ? (((campaign.revenue - campaign.spent) / campaign.spent) * 100).toFixed(2)
      : null,
  };

  res.json({
    success: true,
    data: {
      campaign: {
        ...campaign,
        metrics,
      },
    },
  });
};

/**
 * Create new campaign
 * POST /api/campaigns
 */
export const createCampaign = async (req: Request, res: Response) => {
  const { name, type, status, subject, body, previewText, startDate, endDate, budget, audience, isABTest, abTestData, tagIds } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    throw new ForbiddenError('User authentication required');
  }

  // Create the campaign
  const campaign = await prisma.campaign.create({
    data: {
      name,
      type,
      status: status || 'DRAFT',
      subject: subject || null,
      body: body || null,
      previewText: previewText || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      budget: budget || null,
      audience: audience || null,
      isABTest: isABTest || false,
      abTestData: abTestData || null,
      createdById: userId,
      ...(tagIds && tagIds.length > 0 && {
        tags: {
          connect: tagIds.map((id: string) => ({ id })),
        },
      }),
    },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
      },
      tags: true,
    },
  });

  res.status(201).json({
    success: true,
    data: { campaign },
    message: 'Campaign created successfully',
  });
};

/**
 * Update campaign
 * PUT /api/campaigns/:id
 */
export const updateCampaign = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    throw new ForbiddenError('User authentication required');
  }

  // Check if campaign exists
  const existingCampaign = await prisma.campaign.findUnique({
    where: { id },
  });

  if (!existingCampaign) {
    throw new NotFoundError('Campaign not found');
  }

  // Process date fields
  const processedData: any = { ...updateData };
  if (updateData.startDate !== undefined) {
    processedData.startDate = updateData.startDate ? new Date(updateData.startDate) : null;
  }
  if (updateData.endDate !== undefined) {
    processedData.endDate = updateData.endDate ? new Date(updateData.endDate) : null;
  }

  // Calculate ROI if revenue and spent are available
  if (processedData.revenue !== undefined || processedData.spent !== undefined) {
    const revenue = processedData.revenue ?? existingCampaign.revenue ?? 0;
    const spent = processedData.spent ?? existingCampaign.spent ?? 0;
    if (spent > 0) {
      processedData.roi = ((revenue - spent) / spent) * 100;
    }
  }

  // Update the campaign
  const campaign = await prisma.campaign.update({
    where: { id },
    data: processedData,
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
      },
      tags: true,
    },
  });

  res.json({
    success: true,
    data: { campaign },
    message: 'Campaign updated successfully',
  });
};

/**
 * Delete campaign
 * DELETE /api/campaigns/:id
 */
export const deleteCampaign = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  if (!userId) {
    throw new ForbiddenError('User authentication required');
  }

  // Check if campaign exists
  const campaign = await prisma.campaign.findUnique({
    where: { id },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign not found');
  }

  // Delete the campaign
  await prisma.campaign.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: 'Campaign deleted successfully',
  });
};

/**
 * Get campaign statistics
 * GET /api/campaigns/stats
 */
export const getCampaignStats = async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  // Get campaign counts by status
  const byStatus = await prisma.campaign.groupBy({
    by: ['status'],
    _count: {
      id: true,
    },
    ...(userId && { where: { createdById: userId } }),
  });

  // Get campaign counts by type
  const byType = await prisma.campaign.groupBy({
    by: ['type'],
    _count: {
      id: true,
    },
    ...(userId && { where: { createdById: userId } }),
  });

  // Get aggregate metrics
  const aggregates = await prisma.campaign.aggregate({
    _sum: {
      sent: true,
      delivered: true,
      opened: true,
      clicked: true,
      converted: true,
      revenue: true,
      spent: true,
    },
    _avg: {
      budget: true,
    },
    _count: {
      id: true,
    },
    ...(userId && { where: { createdById: userId } }),
  });

  // Calculate overall rates
  const totalSent = aggregates._sum.sent || 0;
  const overallMetrics = {
    openRate: totalSent > 0 ? (((aggregates._sum.opened || 0) / totalSent) * 100).toFixed(2) : '0.00',
    clickRate: totalSent > 0 ? (((aggregates._sum.clicked || 0) / totalSent) * 100).toFixed(2) : '0.00',
    conversionRate: totalSent > 0 ? (((aggregates._sum.converted || 0) / totalSent) * 100).toFixed(2) : '0.00',
    totalRevenue: aggregates._sum.revenue || 0,
    totalSpent: aggregates._sum.spent || 0,
    averageBudget: aggregates._avg.budget || 0,
  };

  res.json({
    success: true,
    data: {
      stats: {
        total: aggregates._count.id,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        byType: byType.reduce((acc, item) => {
          acc[item.type] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        metrics: overallMetrics,
      },
    },
  });
};

/**
 * Update campaign metrics
 * PATCH /api/campaigns/:id/metrics
 */
export const updateCampaignMetrics = async (req: Request, res: Response) => {
  const { id } = req.params;
  const metrics = req.body;

  // Check if campaign exists
  const existingCampaign = await prisma.campaign.findUnique({
    where: { id },
  });

  if (!existingCampaign) {
    throw new NotFoundError('Campaign not found');
  }

  // Update metrics
  const campaign = await prisma.campaign.update({
    where: { id },
    data: metrics,
  });

  res.json({
    success: true,
    data: { campaign },
    message: 'Campaign metrics updated successfully',
  });
};

/**
 * Pause a campaign
 * POST /api/campaigns/:id/pause
 */
export const pauseCampaign = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  if (!userId) {
    throw new ForbiddenError('User authentication required');
  }

  // Check if campaign exists
  const existingCampaign = await prisma.campaign.findUnique({
    where: { id },
  });

  if (!existingCampaign) {
    throw new NotFoundError('Campaign not found');
  }

  // Update campaign status to PAUSED
  const campaign = await prisma.campaign.update({
    where: { id },
    data: { status: 'PAUSED' },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
      },
      tags: true,
    },
  });

  res.json({
    success: true,
    data: { campaign },
    message: 'Campaign paused successfully',
  });
};

/**
 * Send/Launch a campaign
 * POST /api/campaigns/:id/send
 */
export const sendCampaign = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  if (!userId) {
    throw new ForbiddenError('User authentication required');
  }

  // Check if campaign exists
  const existingCampaign = await prisma.campaign.findUnique({
    where: { id },
  });

  if (!existingCampaign) {
    throw new NotFoundError('Campaign not found');
  }

  // Update campaign status to ACTIVE and set start date if not set
  const updateData: any = { 
    status: 'ACTIVE',
  };
  
  if (!existingCampaign.startDate) {
    updateData.startDate = new Date();
  }

  const campaign = await prisma.campaign.update({
    where: { id },
    data: updateData,
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
      },
      tags: true,
    },
  });

  res.json({
    success: true,
    data: { campaign },
    message: 'Campaign sent successfully',
  });
};
