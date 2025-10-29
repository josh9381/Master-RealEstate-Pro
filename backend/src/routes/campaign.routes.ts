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
} from '../controllers/campaign.controller';
import {
  createCampaignSchema,
  updateCampaignSchema,
  campaignIdSchema,
  listCampaignsQuerySchema,
  updateCampaignMetricsSchema,
} from '../validators/campaign.validator';
import { sensitiveLimiter } from '../middleware/rateLimiter';

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
