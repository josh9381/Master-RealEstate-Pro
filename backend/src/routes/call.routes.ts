import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import { validate } from '../middleware/validate';
import {
  logCall,
  getCalls,
  getCall,
  updateCall,
  deleteCall,
  getCallStats,
} from '../controllers/call.controller';
import {
  logCallSchema,
  updateCallSchema,
  callIdSchema,
  listCallsQuerySchema,
} from '../validators/call.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/calls/stats
 * @desc    Get call statistics (by outcome, direction, avg duration)
 * @access  Private
 */
router.get(
  '/stats',
  validate({ query: listCallsQuerySchema.pick({ leadId: true }) }),
  asyncHandler(getCallStats)
);

/**
 * @route   GET /api/calls
 * @desc    List calls (optionally filtered by leadId, direction, outcome)
 * @access  Private
 */
router.get(
  '/',
  validate({ query: listCallsQuerySchema }),
  asyncHandler(getCalls)
);

/**
 * @route   POST /api/calls
 * @desc    Log a manual call
 * @access  Private
 */
router.post(
  '/',
  validateBody(logCallSchema),
  asyncHandler(logCall)
);

/**
 * @route   GET /api/calls/:id
 * @desc    Get a single call by ID
 * @access  Private
 */
router.get(
  '/:id',
  validateParams(callIdSchema),
  asyncHandler(getCall)
);

/**
 * @route   PATCH /api/calls/:id
 * @desc    Update a call log
 * @access  Private
 */
router.patch(
  '/:id',
  validateParams(callIdSchema),
  validateBody(updateCallSchema),
  asyncHandler(updateCall)
);

/**
 * @route   DELETE /api/calls/:id
 * @desc    Delete a call log
 * @access  Private
 */
router.delete(
  '/:id',
  validateParams(callIdSchema),
  asyncHandler(deleteCall)
);

export default router;
