import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import { enforcePlanLimit } from '../middleware/planLimits';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignStats,
  updateCampaignMetrics,
  pauseCampaign,
  sendCampaign,
  sendCampaignNow,
  rescheduleCampaign,
  getCampaignPreview,
  getCampaignTemplates,
  getCampaignTemplate,
  createCampaignFromTemplate,
  duplicateCampaign,
  archiveCampaign,
  unarchiveCampaign,
  getCampaignAnalytics,
  trackOpen,
  trackClick,
  trackConversionEvent,
  getLinkStats,
  getTimeline,
  compareCampaignsEndpoint,
  getTopPerformers,
} from '../controllers/campaign.controller';
import {
  createCampaignSchema,
  updateCampaignSchema,
  campaignIdSchema,
  listCampaignsQuerySchema,
  updateCampaignMetricsSchema,
  sendCampaignSchema,
} from '../validators/campaign.validator';
import { sensitiveLimiter } from '../middleware/rateLimiter';
import { compileEmailBlocks } from '../utils/mjmlCompiler';
import { attachmentUpload, getUploadUrl } from '../config/upload';
import prisma from '../config/database';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/campaigns/stats
 * @desc    Get campaign statistics
 * @access  Private
 */
router.get('/stats', asyncHandler(getCampaignStats));

/**
 * @route   POST /api/campaigns/compile-email
 * @desc    Compile email blocks JSON to final HTML via MJML (for preview)
 * @access  Private
 */
router.post('/compile-email', asyncHandler(async (req, res) => {
  const { content, subject, previewText } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'content is required' });
  }
  const result = compileEmailBlocks(content);
  res.json({
    html: result.html,
    errors: result.errors,
    subject: subject || '',
    previewText: previewText || '',
  });
}));

/**
 * @route   POST /api/campaigns/upload-attachments
 * @desc    Upload email attachments for a campaign (max 5 files, 10MB each)
 * @access  Private
 */
router.post('/upload-attachments', attachmentUpload, asyncHandler(async (req: any, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  const attachments = files.map(f => ({
    filename: f.originalname,
    path: `attachments/${f.filename}`,
    url: getUploadUrl(`attachments/${f.filename}`),
    size: f.size,
    type: f.mimetype,
  }));
  res.json({ attachments });
}));

/**
 * @route   GET /api/campaigns/templates
 * @desc    Get all campaign templates
 * @access  Private
 */
router.get('/templates', asyncHandler(getCampaignTemplates));

/**
 * @route   GET /api/campaigns/templates/:templateId
 * @desc    Get a single campaign template by ID
 * @access  Private
 */
router.get('/templates/:templateId', asyncHandler(getCampaignTemplate));

/**
 * @route   POST /api/campaigns/from-template/:templateId
 * @desc    Create a campaign from a template
 * @access  Private
 */
router.post('/from-template/:templateId', asyncHandler(createCampaignFromTemplate));

/**
 * @route   GET /api/campaigns/top-performers
 * @desc    Get top performing campaigns
 * @access  Private
 */
router.get('/top-performers', asyncHandler(getTopPerformers));

/**
 * @route   POST /api/campaigns/compare
 * @desc    Compare multiple campaigns
 * @access  Private
 */
router.post('/compare', asyncHandler(compareCampaignsEndpoint));

/**
 * @route   GET /api/campaigns/:id/stats
 * @desc    Get per-campaign statistics
 * @access  Private
 */
router.get('/:id/stats', validateParams(campaignIdSchema), asyncHandler(async (req: any, res: any) => {
  const campaign = await prisma.campaign.findFirst({
    where: { id: req.params.id, organizationId: req.user!.organizationId }
  });
  if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
  res.json({
    success: true,
    data: {
      sent: campaign.sent,
      delivered: campaign.delivered,
      opened: campaign.opened,
      clicked: campaign.clicked,
      converted: campaign.converted,
      bounced: campaign.bounced,
      revenue: campaign.revenue,
      roi: campaign.roi,
    }
  });
}));

/**
 * @route   GET /api/campaigns/:id/execution-status
 * @desc    Get real-time campaign execution progress
 * @access  Private
 */
router.get('/:id/execution-status', validateParams(campaignIdSchema), asyncHandler(async (req: any, res: any) => {
  const campaign = await prisma.campaign.findFirst({
    where: { id: req.params.id, organizationId: req.user!.organizationId },
    select: {
      id: true,
      name: true,
      status: true,
      sent: true,
      delivered: true,
      opened: true,
      clicked: true,
      bounced: true,
      audience: true,
      startDate: true,
      updatedAt: true,
      isABTest: true,
    },
  });
  if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

  // Calculate execution phase
  const totalRecipients = campaign.audience || 0;
  const totalSent = campaign.sent || 0;
  let phase: 'queued' | 'sending' | 'completed' | 'draft' | 'paused' = 'draft';
  let progress = 0;

  if (campaign.status === 'SENDING') {
    phase = 'sending';
    progress = totalRecipients > 0 ? Math.round((totalSent / totalRecipients) * 100) : 0;
  } else if (campaign.status === 'ACTIVE' || campaign.status === 'COMPLETED') {
    phase = 'completed';
    progress = 100;
  } else if (campaign.status === 'SCHEDULED') {
    phase = 'queued';
    progress = 0;
  } else if (campaign.status === 'PAUSED') {
    phase = 'paused';
    progress = totalRecipients > 0 ? Math.round((totalSent / totalRecipients) * 100) : 0;
  }

  // Check if SENDGRID_API_KEY or TWILIO env vars are configured
  const isMockMode = !process.env.SENDGRID_API_KEY?.trim();

  res.json({
    success: true,
    data: {
      campaignId: campaign.id,
      name: campaign.name,
      phase,
      progress,
      totalRecipients,
      totalSent,
      delivered: campaign.delivered || 0,
      bounced: campaign.bounced || 0,
      isABTest: campaign.isABTest,
      isMockMode,
      startedAt: campaign.startDate,
      lastUpdated: campaign.updatedAt,
    }
  });
}));

/**
 * @route   POST /api/campaigns/:id/recipients
 * @desc    Add recipients to a campaign
 * @access  Private
 */
router.post('/:id/recipients', validateParams(campaignIdSchema), asyncHandler(async (req: any, res: any) => {
  const { leadIds } = req.body;
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ success: false, message: 'leadIds must be a non-empty array' });
  }
  const campaign = await prisma.campaign.findFirst({
    where: { id: req.params.id, organizationId: req.user!.organizationId }
  });
  if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

  // Verify leads belong to the same org and filter out duplicates
  const existingLeads = await prisma.campaignLead.findMany({
    where: { campaignId: req.params.id, leadId: { in: leadIds } },
    select: { leadId: true },
  });
  const existingSet = new Set(existingLeads.map(l => l.leadId));
  const newLeadIds = leadIds.filter((id: string) => !existingSet.has(id));

  if (newLeadIds.length > 0) {
    await prisma.campaign.update({
      where: { id: req.params.id },
      data: { audience: { increment: newLeadIds.length } }
    });
  }
  res.json({ success: true, data: { added: newLeadIds.length, duplicatesSkipped: leadIds.length - newLeadIds.length } });
}));

/**
 * @route   GET /api/campaigns
 * @desc    Get all campaigns with filtering and pagination
 * @access  Private
 */
router.get(
  '/',
  validateQuery(listCampaignsQuerySchema),
  asyncHandler(getCampaigns)
);

/**
 * @route   GET /api/campaigns/:id
 * @desc    Get a single campaign by ID
 * @access  Private
 */
router.get(
  '/:id',
  validateParams(campaignIdSchema),
  asyncHandler(getCampaign)
);

/**
 * @route   POST /api/campaigns
 * @desc    Create a new campaign
 * @access  Private
 */
router.post(
  '/',
  validateBody(createCampaignSchema),
  enforcePlanLimit('campaigns'),
  sensitiveLimiter,
  asyncHandler(createCampaign)
);

/**
 * @route   PATCH /api/campaigns/:id
 * @desc    Update a campaign
 * @access  Private
 */
router.patch(
  '/:id',
  validateParams(campaignIdSchema),
  validateBody(updateCampaignSchema),
  asyncHandler(updateCampaign)
);

/**
 * @route   PATCH /api/campaigns/:id/metrics
 * @desc    Update campaign metrics
 * @access  Private
 */
router.patch(
  '/:id/metrics',
  validateParams(campaignIdSchema),
  validateBody(updateCampaignMetricsSchema),
  asyncHandler(updateCampaignMetrics)
);

/**
 * @route   POST /api/campaigns/:id/pause
 * @desc    Pause a campaign
 * @access  Private
 */
router.post(
  '/:id/pause',
  validateParams(campaignIdSchema),
  sensitiveLimiter,
  asyncHandler(pauseCampaign)
);

/**
 * @route   GET /api/campaigns/:id/preview
 * @desc    Preview campaign before sending (recipient count, costs, sample messages)
 * @access  Private
 */
router.get(
  '/:id/preview',
  validateParams(campaignIdSchema),
  asyncHandler(getCampaignPreview)
);

/**
 * @route   POST /api/campaigns/:id/send
 * @desc    Send/Launch a campaign
 * @access  Private
 */
router.post(
  '/:id/send',
  validateParams(campaignIdSchema),
  validateBody(sendCampaignSchema),
  sensitiveLimiter,
  asyncHandler(sendCampaign)
);

/**
 * @route   POST /api/campaigns/:id/send-now
 * @desc    Send a scheduled campaign immediately
 * @access  Private
 */
router.post(
  '/:id/send-now',
  validateParams(campaignIdSchema),
  sensitiveLimiter,
  asyncHandler(sendCampaignNow)
);

/**
 * @route   PATCH /api/campaigns/:id/reschedule
 * @desc    Reschedule a campaign to a new date/time
 * @access  Private
 */
router.patch(
  '/:id/reschedule',
  validateParams(campaignIdSchema),
  asyncHandler(rescheduleCampaign)
);

/**
 * @route   POST /api/campaigns/:id/duplicate
 * @desc    Duplicate an existing campaign
 * @access  Private
 */
router.post(
  '/:id/duplicate',
  validateParams(campaignIdSchema),
  sensitiveLimiter,
  asyncHandler(duplicateCampaign)
);

/**
 * @route   POST /api/campaigns/:id/archive
 * @desc    Archive a campaign
 * @access  Private
 */
router.post(
  '/:id/archive',
  validateParams(campaignIdSchema),
  sensitiveLimiter,
  asyncHandler(archiveCampaign)
);

/**
 * @route   POST /api/campaigns/:id/unarchive
 * @desc    Unarchive a campaign
 * @access  Private
 */
router.post(
  '/:id/unarchive',
  validateParams(campaignIdSchema),
  sensitiveLimiter,
  asyncHandler(unarchiveCampaign)
);

/**
 * @route   GET /api/campaigns/:id/analytics
 * @desc    Get campaign analytics and metrics
 * @access  Private
 */
router.get(
  '/:id/analytics',
  validateParams(campaignIdSchema),
  asyncHandler(getCampaignAnalytics)
);

/**
 * @route   GET /api/campaigns/:id/analytics/links
 * @desc    Get link click statistics for a campaign
 * @access  Private
 */
router.get(
  '/:id/analytics/links',
  validateParams(campaignIdSchema),
  asyncHandler(getLinkStats)
);

/**
 * @route   GET /api/campaigns/:id/analytics/timeline
 * @desc    Get campaign time series data
 * @access  Private
 */
router.get(
  '/:id/analytics/timeline',
  validateParams(campaignIdSchema),
  asyncHandler(getTimeline)
);

/**
 * @route   POST /api/campaigns/:id/track/open
 * @desc    Track email open event
 * @access  Private
 */
router.post(
  '/:id/track/open',
  validateParams(campaignIdSchema),
  sensitiveLimiter,
  asyncHandler(trackOpen)
);

/**
 * @route   POST /api/campaigns/:id/track/click
 * @desc    Track email click event
 * @access  Private
 */
router.post(
  '/:id/track/click',
  validateParams(campaignIdSchema),
  sensitiveLimiter,
  asyncHandler(trackClick)
);

/**
 * @route   POST /api/campaigns/:id/track/conversion
 * @desc    Track conversion event
 * @access  Private
 */
router.post(
  '/:id/track/conversion',
  validateParams(campaignIdSchema),
  sensitiveLimiter,
  asyncHandler(trackConversionEvent)
);

/**
 * @route   GET /api/campaigns/:id/recipients
 * @desc    Get per-recipient activity log for a campaign
 * @access  Private
 */
router.get(
  '/:id/recipients',
  validateParams(campaignIdSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page = '1', limit = '50', status } = req.query;
    const orgId = (req as any).user?.organizationId;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { campaignId: id };
    if (orgId) where.organizationId = orgId;
    if (status && typeof status === 'string') where.status = status;

    const [recipients, total] = await Promise.all([
      prisma.campaignLead.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
      prisma.campaignLead.count({ where }),
    ]);

    // Status summary counts
    const statusCounts = await prisma.campaignLead.groupBy({
      by: ['status'],
      where: { campaignId: id, ...(orgId ? { organizationId: orgId } : {}) },
      _count: { status: true },
    });

    res.json({
      success: true,
      data: {
        recipients,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        statusSummary: statusCounts.reduce((acc: any, s: any) => {
          acc[s.status] = s._count.status;
          return acc;
        }, {}),
      },
    });
  })
);

/**
 * @route   GET /api/campaigns/:id/abtest-results
 * @desc    Get A/B test per-variant stats for a campaign
 * @access  Private
 */
router.get(
  '/:id/abtest-results',
  validateParams(campaignIdSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const orgId = (req as any).user?.organizationId;

    // Find the ABTest linked to this campaign via ABTestResult
    const abTestResult = await prisma.aBTestResult.findFirst({
      where: { campaignId: id, ...(orgId ? { organizationId: orgId } : {}) },
      select: { testId: true },
    });

    if (!abTestResult) {
      return res.json({ success: true, data: null });
    }

    const { evaluateABTest } = await import('../services/ab-test-evaluator.service');

    // Get the test record
    const abTest = await prisma.aBTest.findUnique({
      where: { id: abTestResult.testId },
      select: {
        id: true,
        name: true,
        status: true,
        variantA: true,
        variantB: true,
        winnerVariant: true,
        winnerMetric: true,
        confidence: true,
        startDate: true,
        endDate: true,
        participantCount: true,
      },
    });

    if (!abTest) {
      return res.json({ success: true, data: null });
    }

    // Get the campaign to read eval settings
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: { abTestWinnerMetric: true, abTestEvalHours: true },
    });

    const metric = (campaign?.abTestWinnerMetric || 'open_rate') as 'open_rate' | 'click_rate';

    // Evaluate current state
    const evaluation = await evaluateABTest(abTestResult.testId, metric);

    res.json({
      success: true,
      data: {
        test: abTest,
        evaluation,
        evalHours: campaign?.abTestEvalHours || 24,
        winnerMetric: metric,
      },
    });
  })
);

/**
 * @route   DELETE /api/campaigns/:id
 * @desc    Delete a campaign
 * @access  Private
 */
router.delete(
  '/:id',
  validateParams(campaignIdSchema),
  sensitiveLimiter,
  asyncHandler(deleteCampaign)
);

export default router;
