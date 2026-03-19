import { logger } from '../lib/logger'
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { NotFoundError, ForbiddenError, ValidationError } from '../middleware/errorHandler';
import type { CampaignStatus, CampaignType } from '@prisma/client';
import { executeCampaign } from '../services/campaign-executor.service';
import { getAllTemplates, getTemplateById, trackTemplateUsage } from '../data/campaign-templates';
import { getCampaignsFilter, getRoleFilterFromRequest } from '../utils/roleFilters';
import { calcOpenRate, calcClickRate, calcConversionRate, calcBounceRate, calcROI, formatRate } from '../utils/metricsCalculator';
import { compileEmailBlocks, compilePlainText } from '../utils/mjmlCompiler';

/**
 * Get all campaigns with filtering and pagination
 * GET /api/campaigns
 */
export const getCampaigns = async (req: Request, res: Response) => {
  // Get validated query parameters
  const validatedQuery = (req.validatedQuery || req.query) as Record<string, any>;
  const {
    page = 1,
    limit = 20,
    status,
    type,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeArchived = false,
  } = validatedQuery;

  // Build where clause with role-based filtering
  const roleFilter = getRoleFilterFromRequest(req);
  const where: Record<string, any> = getCampaignsFilter(roleFilter);

  if (status) {
    if (Array.isArray(status)) {
      where.status = { in: status as CampaignStatus[] };
    } else {
      where.status = status as CampaignStatus;
    }
  }
  if (type) where.type = type as CampaignType;
  
  // By default, exclude archived campaigns unless specifically requested
  if (!includeArchived) {
    where.isArchived = false;
  }

  // Search in name and subject (case-insensitive)
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { subject: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Build orderBy — whitelist allowed sort fields for safety
  const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'status', 'type', 'startDate', 'endDate', 'sent', 'opened', 'clicked', 'revenue', 'budget'];
  const safeSortBy = allowedSortFields.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
  const orderBy = {
    [safeSortBy]: sortOrder,
  };

  // Execute queries
  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      include: {
        user: {
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
    roi: campaign.roi != null ? calcROI(campaign.revenue ?? 0, campaign.spent ?? 0) : null,
    metrics: {
      openRate: formatRate(calcOpenRate(campaign.opened, campaign.sent), 2),
      clickRate: formatRate(calcClickRate(campaign.clicked, campaign.sent), 2),
      conversionRate: formatRate(calcConversionRate(campaign.converted, campaign.sent), 2),
      bounceRate: formatRate(calcBounceRate(campaign.bounced, campaign.sent), 2),
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

  // Verify campaign belongs to user's organization
  const campaign = await prisma.campaign.findFirst({
    where: { 
      id,
      organizationId: req.user!.organizationId  // CRITICAL: Verify ownership
    },
    include: {
      user: {
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
    openRate: formatRate(calcOpenRate(campaign.opened, campaign.sent), 2),
    clickRate: formatRate(calcClickRate(campaign.clicked, campaign.sent), 2),
    conversionRate: formatRate(calcConversionRate(campaign.converted, campaign.sent), 2),
    bounceRate: formatRate(calcBounceRate(campaign.bounced, campaign.sent), 2),
    roi: campaign.spent && campaign.spent > 0 && campaign.revenue
      ? formatRate(calcROI(campaign.revenue, campaign.spent), 2)
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
  const { name, type, status, subject, body, previewText, startDate, endDate, budget, audience, isABTest, abTestData, tagIds, isRecurring, frequency, recurringPattern, maxOccurrences, abTestWinnerMetric, abTestEvalHours } = req.body;
  const userId = req.user?.userId;
  const organizationId = req.user?.organizationId;

  if (!userId || !organizationId) {
    throw new ForbiddenError('User authentication required');
  }

  // SOCIAL campaign type is not yet supported
  if (type === 'SOCIAL') {
    return res.status(400).json({
      success: false,
      message: 'Social media campaigns are not yet supported. Use EMAIL or SMS.',
    });
  }

  // Create the campaign with organizationId
  const campaign = await prisma.campaign.create({
    data: {
      organizationId,  // CRITICAL: Set organization
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
      abTestWinnerMetric: isABTest ? (abTestWinnerMetric || 'open_rate') : null,
      abTestEvalHours: isABTest ? (abTestEvalHours || 24) : null,
      isRecurring: isRecurring || false,
      frequency: frequency || null,
      recurringPattern: recurringPattern || null,
      maxOccurrences: maxOccurrences || null,
      // For recurring campaigns, calculate the initial nextSendAt so the scheduler picks them up
      ...(isRecurring && startDate ? {
        nextSendAt: new Date(startDate),
      } : {}),
      createdById: userId,
      ...(tagIds && tagIds.length > 0 && {
        tags: {
          connect: tagIds.map((id: string) => ({ id })),
        },
      }),
    },
    include: {
      user: {
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
  const organizationId = req.user!.organizationId;

  if (!userId) {
    throw new ForbiddenError('User authentication required');
  }

  // Use a transaction to prevent race conditions on status transitions
  const campaign = await prisma.$transaction(async (tx) => {
    // Check if campaign exists AND belongs to this organization
    const existingCampaign = await tx.campaign.findFirst({
      where: { 
        id,
        organizationId,  // CRITICAL: Verify ownership
      },
    });

    if (!existingCampaign) {
      throw new NotFoundError('Campaign not found');
    }

    // Validate status transitions
    if (updateData.status && updateData.status !== existingCampaign.status) {
      const validTransitions: Record<string, string[]> = {
        DRAFT: ['SCHEDULED', 'ACTIVE', 'CANCELLED'],
        SCHEDULED: ['ACTIVE', 'CANCELLED', 'DRAFT'],
        ACTIVE: ['PAUSED', 'COMPLETED', 'CANCELLED'],
        SENDING: ['ACTIVE', 'PAUSED', 'CANCELLED', 'DRAFT'],
        PAUSED: ['ACTIVE', 'CANCELLED'],
        COMPLETED: [],
        CANCELLED: ['DRAFT'],
      };
      const allowed = validTransitions[existingCampaign.status] || [];
      if (!allowed.includes(updateData.status)) {
        throw new ValidationError(
          `Cannot transition from ${existingCampaign.status} to ${updateData.status}`
        );
      }
    }

    // Process date fields
    const processedData: Record<string, any> = { ...updateData };
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
        processedData.roi = calcROI(revenue, spent);
      }
    }

    // Update the campaign within the transaction
    return await tx.campaign.update({
      where: { id },
      data: processedData,
      include: {
        user: {
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

  // Check if campaign exists AND belongs to this organization
  const campaign = await prisma.campaign.findFirst({
    where: { 
      id,
      organizationId: req.user!.organizationId  // CRITICAL: Verify ownership
    },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign not found');
  }

  // Prevent deleting campaigns that have sent messages — archive instead
  if ((campaign.sent ?? 0) > 0 && !campaign.isArchived) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete a campaign that has sent messages. Archive it first.',
    });
  }

  // Soft-delete: archive the campaign instead of hard-deleting
  await prisma.campaign.update({
    where: { id },
    data: {
      isArchived: true,
      archivedAt: new Date(),
      status: 'CANCELLED',
    },
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
  const organizationId = req.user?.organizationId;

  // Get campaign counts by status
  const byStatus = await prisma.campaign.groupBy({
    by: ['status'],
    _count: {
      id: true,
    },
    ...(organizationId && { where: { organizationId } }),
  });

  // Get campaign counts by type
  const byType = await prisma.campaign.groupBy({
    by: ['type'],
    _count: {
      id: true,
    },
    ...(organizationId && { where: { organizationId } }),
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
    ...(organizationId && { where: { organizationId } }),
  });

  // Calculate overall rates
  const totalSent = aggregates._sum.sent || 0;
  const overallMetrics = {
    openRate: formatRate(calcOpenRate(aggregates._sum.opened || 0, totalSent), 2),
    clickRate: formatRate(calcClickRate(aggregates._sum.clicked || 0, totalSent), 2),
    conversionRate: formatRate(calcConversionRate(aggregates._sum.converted || 0, totalSent), 2),
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

  // Check if campaign exists AND belongs to this organization
  const existingCampaign = await prisma.campaign.findFirst({
    where: { 
      id,
      organizationId: req.user!.organizationId
    },
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

  // Check if campaign exists AND belongs to this organization
  const existingCampaign = await prisma.campaign.findFirst({
    where: { 
      id,
      organizationId: req.user!.organizationId
    },
  });

  if (!existingCampaign) {
    throw new NotFoundError('Campaign not found');
  }

  // Only allow pausing from ACTIVE, SENDING, or SCHEDULED states
  const pausableStatuses = ['ACTIVE', 'SENDING', 'SCHEDULED'];
  if (!pausableStatuses.includes(existingCampaign.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot pause a campaign with status '${existingCampaign.status}'. Only ACTIVE, SENDING, or SCHEDULED campaigns can be paused.`,
    });
  }

  // Update campaign status to PAUSED
  const campaign = await prisma.campaign.update({
    where: { id },
    data: { status: 'PAUSED' },
    include: {
      user: {
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
 * Body: { leadIds?: string[], filters?: { status?: string[], tags?: string[], minScore?: number } }
 */
export const sendCampaign = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { leadIds, filters, confirmLargeSend } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    throw new ForbiddenError('User authentication required');
  }

  // Check if campaign exists and belongs to user's org
  const existingCampaign = await prisma.campaign.findFirst({
    where: { id, organizationId: req.user!.organizationId },
    include: { tags: true },
  });

  if (!existingCampaign) {
    throw new NotFoundError('Campaign not found');
  }

  // Large campaign approval check: require explicit confirmation for >500 recipients
  const LARGE_CAMPAIGN_THRESHOLD = 500;
  if (!confirmLargeSend && (existingCampaign.audience || 0) > LARGE_CAMPAIGN_THRESHOLD) {
    res.status(200).json({
      success: false,
      requiresConfirmation: true,
      recipientCount: existingCampaign.audience,
      message: `This campaign targets ${existingCampaign.audience} recipients (threshold: ${LARGE_CAMPAIGN_THRESHOLD}). Please confirm you want to proceed.`,
    });
    return;
  }

  // Validate campaign is in a sendable state
  const sendableStatuses = ['DRAFT', 'SCHEDULED', 'PAUSED'];
  if (!sendableStatuses.includes(existingCampaign.status)) {
    res.status(400).json({
      success: false,
      message: `Cannot send campaign with status ${existingCampaign.status}. Only DRAFT, SCHEDULED, or PAUSED campaigns can be sent.`,
    });
    return;
  }

  // Execute the campaign (actually send messages)
  logger.info(`[CAMPAIGN] Starting execution for campaign: ${existingCampaign.name}`);
  
  const executionResult = await executeCampaign({
    campaignId: id,
    leadIds,
    filters,
  });

  if (!executionResult.success) {
    res.status(400).json({
      success: false,
      message: 'Campaign execution failed',
      data: executionResult,
    });
    return;
  }

  // Get updated campaign with metrics
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      user: {
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
    data: { 
      campaign,
      execution: {
        totalLeads: executionResult.totalLeads,
        sent: executionResult.sent,
        failed: executionResult.failed,
      }
    },
    message: `Campaign sent successfully to ${executionResult.sent} leads`,
  });
};

/**
 * Send a scheduled campaign immediately
 * POST /api/campaigns/:id/send-now
 */
export const sendCampaignNow = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Get campaign with ownership check
  const campaign = await prisma.campaign.findFirst({
    where: { id, organizationId: req.user!.organizationId },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign not found');
  }

  // Only allow sending scheduled or active recurring campaigns
  if (campaign.status !== 'SCHEDULED' && !(campaign.isRecurring && campaign.status === 'ACTIVE')) {
    res.status(400).json({
      success: false,
      message: `Cannot send campaign with status ${campaign.status}. Only SCHEDULED campaigns (or ACTIVE recurring) can be sent now.`,
    });
    return;
  }

  logger.info(`[CAMPAIGN] Manually triggering scheduled campaign: ${campaign.name}`);

  // Execute the campaign
  const executionResult = await executeCampaign({
    campaignId: id,
  });

  if (!executionResult.success) {
    res.status(400).json({
      success: false,
      message: 'Campaign execution failed',
      data: executionResult,
    });
    return;
  }

  // For recurring campaigns, set status to ACTIVE and calculate nextSendAt
  // For one-time campaigns, mark as COMPLETED
  if (campaign.isRecurring) {
    const { calculateNextSendDate } = await import('../services/campaign-scheduler.service');
    const newOccurrenceCount = (campaign.occurrenceCount ?? 0) + 1;
    const hasReachedMax = campaign.maxOccurrences && newOccurrenceCount >= campaign.maxOccurrences;
    const hasReachedEnd = campaign.endDate && new Date(campaign.endDate) <= new Date();

    if (hasReachedMax || hasReachedEnd) {
      await prisma.campaign.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          occurrenceCount: newOccurrenceCount,
          lastSentAt: new Date(),
          nextSendAt: null,
        },
      });
    } else {
      const nextSendAt = calculateNextSendDate(
        new Date(),
        campaign.frequency || 'weekly',
        campaign.recurringPattern as Record<string, unknown> | null
      );
      await prisma.campaign.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          occurrenceCount: newOccurrenceCount,
          lastSentAt: new Date(),
          nextSendAt,
        },
      });
    }
  } else {
    await prisma.campaign.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        endDate: new Date(),
      },
    });
  }

  res.json({
    success: true,
    data: executionResult,
    message: `Campaign sent successfully to ${executionResult.sent} leads`,
  });
};

/**
 * Reschedule a campaign
 * PATCH /api/campaigns/:id/reschedule
 */
export const rescheduleCampaign = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { startDate } = req.body;

  if (!startDate) {
    res.status(400).json({
      success: false,
      message: 'startDate is required',
    });
    return;
  }

  // Parse and validate date
  const newStartDate = new Date(startDate);
  
  if (isNaN(newStartDate.getTime())) {
    res.status(400).json({
      success: false,
      message: 'Invalid date format',
    });
    return;
  }

  // Check if date is in the future
  if (newStartDate <= new Date()) {
    res.status(400).json({
      success: false,
      message: 'Start date must be in the future',
    });
    return;
  }

  // Get campaign with ownership check
  const campaign = await prisma.campaign.findFirst({
    where: { id, organizationId: req.user!.organizationId },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign not found');
  }

  // Only allow rescheduling scheduled or paused campaigns
  if (campaign.status !== 'SCHEDULED' && campaign.status !== 'PAUSED') {
    res.status(400).json({
      success: false,
      message: `Cannot reschedule campaign with status ${campaign.status}. Only SCHEDULED or PAUSED campaigns can be rescheduled.`,
    });
    return;
  }

  // Update campaign start date and ensure it's in SCHEDULED status
  // Reset occurrence count when rescheduling recurring campaigns so they start fresh
  const updatedCampaign = await prisma.campaign.update({
    where: { id },
    data: {
      startDate: newStartDate,
      status: 'SCHEDULED',
      ...(campaign.isRecurring ? { nextSendAt: newStartDate, occurrenceCount: 0 } : {}),
    },
    include: {
      user: {
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

  logger.info(
    `[CAMPAIGN] Rescheduled campaign "${campaign.name}" to ${newStartDate.toISOString()}`
  );

  res.json({
    success: true,
    data: updatedCampaign,
    message: `Campaign rescheduled to ${newStartDate.toLocaleString()}`,
  });
};

/**
 * Get campaign preview before sending
 * GET /api/campaigns/:id/preview
 * Returns recipient count, cost estimates, status breakdown, sample recipients, and message preview
 */
export const getCampaignPreview = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  if (!userId) {
    throw new ForbiddenError('User authentication required');
  }

  // Get campaign with tags (scoped to organization)
  const campaign = await prisma.campaign.findFirst({
    where: { id, organizationId: req.user!.organizationId },
    include: {
      tags: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign not found');
  }

  // Get target leads based on campaign audience
  let leads: Record<string, any>[] = [];
  
  // Build where clause for leads — always scope to the campaign's organization
  const where: Record<string, any> = {
    organizationId: campaign.organizationId,
  };
  
  // If campaign has tags, filter by those tags
  if (campaign.tags && campaign.tags.length > 0) {
    where.tags = {
      some: {
        id: {
          in: campaign.tags.map(tag => tag.id),
        },
      },
    };
  }

  // Get all matching leads (use count + limited sample for preview)
  // First get the count efficiently
  const recipientCount = await prisma.lead.count({ where });
  
  // Then get a small sample for preview purposes
  leads = await prisma.lead.findMany({
    where,
    take: 10,
    include: {
      tags: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
  });

  // Filter leads based on campaign type (must have email for EMAIL, phone for SMS)
  if (campaign.type === 'EMAIL') {
    leads = leads.filter(lead => lead.email);
  } else if (campaign.type === 'SMS') {
    leads = leads.filter(lead => lead.phone);
  }

  // recipientCount already set from count query above

  // Calculate cost estimates
  let unitCost = 0;
  if (campaign.type === 'EMAIL') unitCost = 0.01;
  if (campaign.type === 'SMS') unitCost = 0.10;
  if (campaign.type === 'PHONE') unitCost = 0.50;

  const totalCost = recipientCount * unitCost;

  // Status breakdown from sample (approximate)
  const statusBreakdown = leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Sample recipients (first 10)
  const sampleRecipients = leads.slice(0, 10).map(lead => ({
    id: lead.id,
    name: `${lead.firstName} ${lead.lastName}`,
    email: lead.email,
    phone: lead.phone,
    status: lead.status,
    tags: lead.tags,
  }));

  // Generate message preview with first lead's data (if any leads exist)
  let messagePreview = {
    subject: campaign.subject || '',
    body: campaign.body || '',
  };

  if (leads.length > 0 && campaign.body) {
    try {
      // Compile block-based content through MJML for accurate preview
      let bodyContent = campaign.body;
      let isBlockBased = false;
      try {
        const parsed = JSON.parse(campaign.body);
        isBlockBased = parsed && parsed.__emailBlocks;
      } catch {
        // Legacy plain text/HTML content
      }

      if (isBlockBased) {
        const mjmlResult = compileEmailBlocks(campaign.body);
        if (mjmlResult.errors.length > 0) {
          logger.warn('[CAMPAIGN] MJML preview compilation warnings:', mjmlResult.errors);
        }
        bodyContent = mjmlResult.html;
      } else if (campaign.type === 'EMAIL') {
        const mjmlResult = compilePlainText(campaign.body);
        bodyContent = mjmlResult.html;
      }

      // Use handlebars to render template with first lead's data
      const Handlebars = require('handlebars');
      // Register esc helper for XSS prevention (matches executor)
      if (!Handlebars.helpers['esc']) {
        Handlebars.registerHelper('esc', (val: unknown) => {
          if (typeof val !== 'string') return val;
          return new Handlebars.SafeString(
            val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
          );
        });
      }
      const bodyTemplate = Handlebars.compile(bodyContent);
      const subjectTemplate = campaign.subject ? Handlebars.compile(campaign.subject) : null;

      const firstLead = leads[0];
      const nameParts = `${firstLead.firstName} ${firstLead.lastName}`.split(' ');
      const firstName = nameParts[0] || `${firstLead.firstName} ${firstLead.lastName}`;
      const lastName = nameParts.slice(1).join(' ') || '';

      const templateData = {
        lead: {
          name: `${firstLead.firstName} ${firstLead.lastName}`,
          firstName: firstName,
          lastName: lastName,
          email: firstLead.email,
          phone: firstLead.phone,
          company: firstLead.company,
          status: firstLead.status,
          score: firstLead.score,
        },
        user: {
          firstName: campaign.user?.firstName ?? '',
          lastName: campaign.user?.lastName ?? '',
          email: campaign.user?.email ?? '',
        },
        currentDate: new Date().toLocaleDateString(),
        currentTime: new Date().toLocaleTimeString(),
      };

      messagePreview = {
        subject: subjectTemplate ? subjectTemplate(templateData) : campaign.subject || '',
        body: bodyTemplate(templateData),
      };
    } catch (error) {
      logger.error('[CAMPAIGN] Error rendering preview template:', error);
      // Keep default preview if template rendering fails
    }
  }

  // Set Content-Security-Policy for preview endpoint
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data: https:;");

  res.json({
    success: true,
    data: {
      campaignId: id,
      campaignName: campaign.name,
      campaignType: campaign.type,
      recipientCount,
      cost: {
        perRecipient: unitCost,
        total: totalCost,
        currency: 'USD',
      },
      statusBreakdown,
      sampleRecipients,
      messagePreview,
      warnings: [
        ...(totalCost > 50 ? ['High cost campaign - total cost exceeds $50'] : []),
        ...(recipientCount > 1000 ? ['Large audience - consider throttling send rate'] : []),
        ...(recipientCount === 0 ? ['No recipients found - check your audience filters'] : []),
      ],
    },
  });
};

/**
 * Get all campaign templates
 * GET /api/campaigns/templates
 */
export const getCampaignTemplates = async (req: Request, res: Response) => {
  const { category, type, recurring } = req.query;

  let templates = getAllTemplates();

  // Filter by category if provided
  if (category && typeof category === 'string') {
    templates = templates.filter(t => t.category === category);
  }

  // Filter by type if provided
  if (type && typeof type === 'string') {
    templates = templates.filter(t => t.type === type);
  }

  // Filter by recurring if provided
  if (recurring === 'true') {
    templates = templates.filter(t => t.isRecurring);
  }

  res.json({
    success: true,
    data: {
      templates,
      total: templates.length,
    },
  });
};

/**
 * Get single campaign template by ID
 * GET /api/campaigns/templates/:templateId
 */
export const getCampaignTemplate = async (req: Request, res: Response) => {
  const { templateId } = req.params;

  const template = getTemplateById(templateId);

  if (!template) {
    throw new NotFoundError('Campaign template not found');
  }

  res.json({
    success: true,
    data: { template },
  });
};

/**
 * Create campaign from template
 * POST /api/campaigns/from-template/:templateId
 * Body: { name: string, startDate?: string, tagIds?: string[] }
 */
export const createCampaignFromTemplate = async (req: Request, res: Response) => {
  const { templateId } = req.params;
  const { name, startDate, tagIds } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    throw new ForbiddenError('User authentication required');
  }

  // Get template
  const template = getTemplateById(templateId);

  if (!template) {
    throw new NotFoundError('Campaign template not found');
  }

  // Validate template has content
  if (!template.body || template.body.trim() === '') {
    throw new ValidationError('Campaign template has no body content');
  }

  // Track usage
  trackTemplateUsage(templateId);

  // Validate recurringPattern if template is recurring
  if (template.recurringPattern) {
    const pattern = template.recurringPattern;
    if (pattern.daysOfWeek) {
      if (!Array.isArray(pattern.daysOfWeek) || pattern.daysOfWeek.some(d => typeof d !== 'number' || d < 0 || d > 6)) {
        throw new ValidationError('Invalid daysOfWeek in recurring pattern (must be 0-6)');
      }
    }
    if (pattern.dayOfMonth !== undefined) {
      if (typeof pattern.dayOfMonth !== 'number' || pattern.dayOfMonth < 1 || pattern.dayOfMonth > 31) {
        throw new ValidationError('Invalid dayOfMonth in recurring pattern (must be 1-31)');
      }
    }
    if (pattern.time !== undefined) {
      if (typeof pattern.time !== 'string' || !/^\d{2}:\d{2}$/.test(pattern.time)) {
        throw new ValidationError('Invalid time in recurring pattern (must be HH:MM format)');
      }
    }
  }

  // Validate startDate if provided
  if (startDate && isNaN(new Date(startDate).getTime())) {
    throw new ValidationError('Invalid startDate format');
  }

  // Create campaign from template
  const campaign = await prisma.campaign.create({
    data: {
      name: name || template.name,
      type: template.type,
      status: 'DRAFT',
      subject: template.subject || null,
      body: template.body,
      startDate: startDate ? new Date(startDate) : null,
      isRecurring: template.isRecurring,
      frequency: template.frequency || null,
      recurringPattern: template.recurringPattern || null,
      createdById: userId,
      organizationId: req.user!.organizationId,
      ...(tagIds && tagIds.length > 0 && {
        tags: {
          connect: tagIds.map((id: string) => ({ id })),
        },
      }),
    },
    include: {
      user: {
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
    message: `Campaign created from template: ${template.name}`,
  });
};

/**
 * Duplicate an existing campaign
 * POST /api/campaigns/:id/duplicate
 */
export const duplicateCampaign = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;
  const { name } = req.body; // Optional custom name

  if (!userId) {
    throw new ForbiddenError('User authentication required');
  }

  // Get original campaign AND verify ownership
  const originalCampaign = await prisma.campaign.findFirst({
    where: { 
      id,
      organizationId: req.user!.organizationId  // CRITICAL: Verify ownership
    },
    include: {
      tags: true,
    },
  });

  if (!originalCampaign) {
    throw new NotFoundError('Campaign not found');
  }

  // Create duplicate campaign IN SAME ORGANIZATION
  const duplicatedCampaign = await prisma.campaign.create({
    data: {
      organizationId: req.user!.organizationId,  // CRITICAL: Set organization
      name: name || `${originalCampaign.name} (Copy)`,
      type: originalCampaign.type,
      status: 'DRAFT', // Always start as draft
      subject: originalCampaign.subject,
      body: originalCampaign.body,
      previewText: originalCampaign.previewText,
      budget: originalCampaign.budget,
      isABTest: originalCampaign.isABTest,
      abTestData: originalCampaign.abTestData as any,
      isRecurring: originalCampaign.isRecurring,
      frequency: originalCampaign.frequency,
      recurringPattern: originalCampaign.recurringPattern as any,
      maxOccurrences: originalCampaign.maxOccurrences,
      createdById: userId,
      // Copy tags
      ...(originalCampaign.tags && originalCampaign.tags.length > 0 && {
        tags: {
          connect: originalCampaign.tags.map(tag => ({ id: tag.id })),
        },
      }),
      // Note: Don't copy dates, stats, or other execution-specific data
    },
    include: {
      user: {
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
    data: { campaign: duplicatedCampaign },
    message: 'Campaign duplicated successfully',
  });
};

/**
 * Archive a campaign
 * POST /api/campaigns/:id/archive
 */
export const archiveCampaign = async (req: Request, res: Response) => {
  const { id } = req.params;

  const campaign = await prisma.campaign.findFirst({
    where: { 
      id,
      organizationId: req.user!.organizationId  // CRITICAL: Verify ownership
    },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign not found');
  }

  // If campaign is actively running, pause it first
  const updateData: Record<string, any> = {
    isArchived: true,
    archivedAt: new Date(),
  };
  if (['ACTIVE', 'SENDING', 'SCHEDULED'].includes(campaign.status)) {
    updateData.status = 'PAUSED';
  }

  const updatedCampaign = await prisma.campaign.update({
    where: { id },
    data: updateData,
    include: {
      user: {
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
    data: { campaign: updatedCampaign },
    message: 'Campaign archived successfully',
  });
};

/**
 * Unarchive a campaign
 * POST /api/campaigns/:id/unarchive
 */
export const unarchiveCampaign = async (req: Request, res: Response) => {
  const { id } = req.params;

  const campaign = await prisma.campaign.findFirst({
    where: { id, organizationId: req.user!.organizationId },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign not found');
  }

  const updatedCampaign = await prisma.campaign.update({
    where: { id },
    data: {
      isArchived: false,
      archivedAt: null,
    },
    include: {
      user: {
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
    data: { campaign: updatedCampaign },
    message: 'Campaign unarchived successfully',
  });
};

/**
 * Get campaign analytics metrics
 * GET /api/campaigns/:id/analytics
 */
export const getCampaignAnalytics = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { getCampaignMetrics } = await import('../services/campaignAnalytics.service');

  // Verify campaign belongs to user's org
  const campaign = await prisma.campaign.findFirst({
    where: { id, organizationId: req.user!.organizationId },
    select: { id: true },
  });
  if (!campaign) {
    throw new NotFoundError('Campaign not found');
  }

  try {
    const metrics = await getCampaignMetrics(id);

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      message: 'Failed to get campaign analytics',
      error: err.message,
    });
  }
};

/**
 * Track email open
 * POST /api/campaigns/:id/track/open
 */
export const trackOpen = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { leadId, messageId } = req.body;
  const { trackEmailOpen } = await import('../services/campaignAnalytics.service');

  try {
    // Verify lead belongs to user's organization to prevent cross-tenant manipulation
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: req.user!.organizationId },
      select: { id: true },
    });
    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }

    await trackEmailOpen(id, leadId, messageId, req.user!.organizationId);

    res.json({
      success: true,
      message: 'Email open tracked successfully',
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      message: 'Failed to track email open',
      error: err.message,
    });
  }
};

/**
 * Track email click
 * POST /api/campaigns/:id/track/click
 */
export const trackClick = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { leadId, messageId, url } = req.body;
  const { trackEmailClick } = await import('../services/campaignAnalytics.service');

  try {
    // Verify lead belongs to user's organization to prevent cross-tenant manipulation
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: req.user!.organizationId },
      select: { id: true },
    });
    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }

    await trackEmailClick(id, leadId, messageId, url, req.user!.organizationId);

    res.json({
      success: true,
      message: 'Email click tracked successfully',
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      message: 'Failed to track email click',
      error: err.message,
    });
  }
};

/**
 * Track conversion
 * POST /api/campaigns/:id/track/conversion
 */
export const trackConversionEvent = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { leadId, value } = req.body;
  const { trackConversion } = await import('../services/campaignAnalytics.service');

  try {
    // Verify lead belongs to user's organization to prevent cross-tenant manipulation
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: req.user!.organizationId },
      select: { id: true },
    });
    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }

    await trackConversion(id, leadId, req.user!.organizationId, value);

    res.json({
      success: true,
      message: 'Conversion tracked successfully',
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      message: 'Failed to track conversion',
      error: err.message,
    });
  }
};

/**
 * Get link click statistics
 * GET /api/campaigns/:id/analytics/links
 */
export const getLinkStats = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { getLinkClickStats } = await import('../services/campaignAnalytics.service');

  // Verify campaign belongs to user's org
  const campaign = await prisma.campaign.findFirst({
    where: { id, organizationId: req.user!.organizationId },
    select: { id: true },
  });
  if (!campaign) {
    throw new NotFoundError('Campaign not found');
  }

  try {
    const stats = await getLinkClickStats(id);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      message: 'Failed to get link statistics',
      error: err.message,
    });
  }
};

/**
 * Get campaign time series data
 * GET /api/campaigns/:id/analytics/timeline
 */
export const getTimeline = async (req: Request, res: Response) => {
  const { id } = req.params;
  const days = req.query.days ? parseInt(req.query.days as string) : 30;
  const { getCampaignTimeSeries } = await import('../services/campaignAnalytics.service');

  // Verify campaign belongs to user's org
  const campaign = await prisma.campaign.findFirst({
    where: { id, organizationId: req.user!.organizationId },
    select: { id: true },
  });
  if (!campaign) {
    throw new NotFoundError('Campaign not found');
  }

  try {
    const data = await getCampaignTimeSeries(id, days);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      message: 'Failed to get campaign timeline',
      error: err.message,
    });
  }
};

/**
 * Compare multiple campaigns
 * POST /api/campaigns/compare
 */
export const compareCampaignsEndpoint = async (req: Request, res: Response) => {
  const { campaignIds } = req.body;
  const { compareCampaigns } = await import('../services/campaignAnalytics.service');

  if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
    res.status(400).json({
      success: false,
      message: 'campaignIds must be a non-empty array',
    });
    return;
  }

  // Verify all campaigns belong to the user's org
  const orgCampaigns = await prisma.campaign.findMany({
    where: { id: { in: campaignIds }, organizationId: req.user!.organizationId },
    select: { id: true },
  });
  const validIds = orgCampaigns.map(c => c.id);
  if (validIds.length === 0) {
    res.status(404).json({ success: false, message: 'No matching campaigns found' });
    return;
  }

  try {
    const comparison = await compareCampaigns(validIds, req.user!.organizationId);

    res.json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      message: 'Failed to compare campaigns',
      error: err.message,
    });
  }
};

/**
 * Get top performing campaigns
 * GET /api/campaigns/top-performers
 */
export const getTopPerformers = async (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
  const metric = (req.query.metric as 'openRate' | 'clickRate' | 'conversionRate') || 'conversionRate';
  const { getTopPerformingCampaigns } = await import('../services/campaignAnalytics.service');

  try {
    const topCampaigns = await getTopPerformingCampaigns(limit, metric, req.user!.organizationId);

    res.json({
      success: true,
      data: topCampaigns,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      message: 'Failed to get top performing campaigns',
      error: err.message,
    });
  }
};
