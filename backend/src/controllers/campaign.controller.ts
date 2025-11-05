import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { NotFoundError, ForbiddenError } from '../middleware/errorHandler';
import type { CampaignStatus, CampaignType } from '@prisma/client';
import { executeCampaign } from '../services/campaign-executor.service';
import { getAllTemplates, getTemplateById } from '../data/campaign-templates';

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
    includeArchived = false,
  } = validatedQuery;

  // Build where clause
  const where: any = {};

  if (status) where.status = status as CampaignStatus;
  if (type) where.type = type as CampaignType;
  
  // By default, exclude archived campaigns unless specifically requested
  if (!includeArchived) {
    where.isArchived = false;
  }

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
  const { leadIds, filters } = req.body;
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

  // Execute the campaign (actually send messages)
  console.log(`[CAMPAIGN] Starting execution for campaign: ${existingCampaign.name}`);
  
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

  // Get campaign
  const campaign = await prisma.campaign.findUnique({
    where: { id },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign not found');
  }

  // Only allow sending scheduled campaigns
  if (campaign.status !== 'SCHEDULED') {
    res.status(400).json({
      success: false,
      message: `Cannot send campaign with status ${campaign.status}. Only SCHEDULED campaigns can be sent now.`,
    });
    return;
  }

  console.log(`[CAMPAIGN] Manually triggering scheduled campaign: ${campaign.name}`);

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

  // Update campaign status
  await prisma.campaign.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      endDate: new Date(),
    },
  });

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

  // Get campaign
  const campaign = await prisma.campaign.findUnique({
    where: { id },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign not found');
  }

  // Only allow rescheduling scheduled campaigns
  if (campaign.status !== 'SCHEDULED') {
    res.status(400).json({
      success: false,
      message: `Cannot reschedule campaign with status ${campaign.status}. Only SCHEDULED campaigns can be rescheduled.`,
    });
    return;
  }

  // Update campaign start date
  const updatedCampaign = await prisma.campaign.update({
    where: { id },
    data: {
      startDate: newStartDate,
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

  console.log(
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

  // Get campaign with tags
  const campaign = await prisma.campaign.findUnique({
    where: { id },
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
  let leads: any[] = [];
  
  // Build where clause for leads
  const where: any = {};
  
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

  // Get all matching leads
  leads = await prisma.lead.findMany({
    where,
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

  const recipientCount = leads.length;

  // Calculate cost estimates
  let unitCost = 0;
  if (campaign.type === 'EMAIL') unitCost = 0.01;
  if (campaign.type === 'SMS') unitCost = 0.10;
  if (campaign.type === 'PHONE') unitCost = 0.50;

  const totalCost = recipientCount * unitCost;

  // Status breakdown
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
      // Use handlebars to render template with first lead's data
      const Handlebars = require('handlebars');
      const bodyTemplate = Handlebars.compile(campaign.body);
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
          firstName: campaign.user.firstName,
          lastName: campaign.user.lastName,
          email: campaign.user.email,
        },
        currentDate: new Date().toLocaleDateString(),
        currentTime: new Date().toLocaleTimeString(),
      };

      messagePreview = {
        subject: subjectTemplate ? subjectTemplate(templateData) : campaign.subject || '',
        body: bodyTemplate(templateData),
      };
    } catch (error) {
      console.error('[CAMPAIGN] Error rendering preview template:', error);
      // Keep default preview if template rendering fails
    }
  }

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
  const userId = (req as any).user?.id;
  const { name } = req.body; // Optional custom name

  if (!userId) {
    throw new ForbiddenError('User authentication required');
  }

  // Get original campaign
  const originalCampaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      tags: true,
    },
  });

  if (!originalCampaign) {
    throw new NotFoundError('Campaign not found');
  }

  // Create duplicate campaign
  const duplicatedCampaign = await prisma.campaign.create({
    data: {
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

  const campaign = await prisma.campaign.findUnique({
    where: { id },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign not found');
  }

  const updatedCampaign = await prisma.campaign.update({
    where: { id },
    data: {
      isArchived: true,
      archivedAt: new Date(),
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
    message: 'Campaign archived successfully',
  });
};

/**
 * Unarchive a campaign
 * POST /api/campaigns/:id/unarchive
 */
export const unarchiveCampaign = async (req: Request, res: Response) => {
  const { id } = req.params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
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
    await trackEmailOpen(id, leadId, messageId);

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
    await trackEmailClick(id, leadId, messageId, url);

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
    await trackConversion(id, leadId, value);

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

  try {
    const comparison = await compareCampaigns(campaignIds);

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
    const topCampaigns = await getTopPerformingCampaigns(limit, metric);

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
