import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
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
} from '../validators/campaign.validator';
import { sensitiveLimiter } from '../middleware/rateLimiter';
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
router.get('/:id/stats', asyncHandler(async (req: any, res: any) => {
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
router.get('/:id/execution-status', asyncHandler(async (req: any, res: any) => {
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
  const isMockMode = !process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY === '';

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
router.post('/:id/recipients', asyncHandler(async (req: any, res: any) => {
  const { leadIds } = req.body;
  const campaign = await prisma.campaign.findFirst({
    where: { id: req.params.id, organizationId: req.user!.organizationId }
  });
  if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

  const currentCount = campaign.audience || 0;
  await prisma.campaign.update({
    where: { id: req.params.id },
    data: { audience: currentCount + (leadIds?.length || 0) }
  });
  res.json({ success: true, data: { added: leadIds.length } });
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
  asyncHandler(trackConversionEvent)
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
