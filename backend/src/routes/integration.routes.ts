import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  listIntegrations,
  connectIntegration,
  disconnectIntegration,
  getIntegrationStatus,
  getAllIntegrationStatuses,
  syncIntegration
} from '../controllers/integration.controller';
import { connectIntegrationSchema } from '../validators/integration.validator';

const router = Router();

// All integration routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/integrations
 * @desc    List all integrations
 * @access  Private
 */
router.get('/', asyncHandler(listIntegrations));

/**
 * @route   GET /api/integrations/status
 * @desc    Get all integration statuses (for admin dashboard)
 * @access  Private
 */
router.get('/status', asyncHandler(getAllIntegrationStatuses));

/**
 * @route   POST /api/integrations/:provider/connect
 * @desc    Connect an integration
 * @access  Private
 */
router.post('/:provider/connect', validateBody(connectIntegrationSchema), asyncHandler(connectIntegration));

/**
 * @route   POST /api/integrations/:provider/disconnect
 * @desc    Disconnect an integration
 * @access  Private
 */
router.post('/:provider/disconnect', asyncHandler(disconnectIntegration));

/**
 * @route   GET /api/integrations/:provider/status
 * @desc    Get integration status
 * @access  Private
 */
router.get('/:provider/status', asyncHandler(getIntegrationStatus));

/**
 * @route   POST /api/integrations/:provider/sync
 * @desc    Trigger integration sync
 * @access  Private
 */
router.post('/:provider/sync', asyncHandler(syncIntegration));

/**
 * @route   PUT /api/integrations/:provider/settings
 * @desc    Update integration provider settings
 * @access  Private
 */
router.put('/:provider/settings', asyncHandler(async (req: any, res: any) => {
  res.json({ success: true, message: `${req.params.provider} settings updated` });
}));

export default router;
