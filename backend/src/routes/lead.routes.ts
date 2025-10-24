import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { sensitiveLimiter } from '../middleware/rateLimiter';
import {
  createLeadSchema,
  updateLeadSchema,
  leadIdSchema,
  listLeadsQuerySchema,
  bulkDeleteLeadsSchema,
  bulkUpdateLeadsSchema,
} from '../validators/lead.validator';
import {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  bulkDeleteLeads,
  bulkUpdateLeads,
  getLeadStats,
} from '../controllers/lead.controller';

const router = Router();

// All lead routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/leads/stats
 * @desc    Get lead statistics
 * @access  Private
 */
router.get('/stats', asyncHandler(getLeadStats));

/**
 * @route   GET /api/leads
 * @desc    Get all leads with filtering and pagination
 * @access  Private
 */
router.get(
  '/',
  validateQuery(listLeadsQuerySchema),
  asyncHandler(getLeads)
);

/**
 * @route   GET /api/leads/:id
 * @desc    Get a single lead by ID
 * @access  Private
 */
router.get(
  '/:id',
  validateParams(leadIdSchema),
  asyncHandler(getLead)
);

/**
 * @route   POST /api/leads
 * @desc    Create a new lead
 * @access  Private
 */
router.post(
  '/',
  validateBody(createLeadSchema),
  sensitiveLimiter, // Limit lead creation
  asyncHandler(createLead)
);

/**
 * @route   PUT /api/leads/:id
 * @desc    Update a lead
 * @access  Private
 */
router.put(
  '/:id',
  validateParams(leadIdSchema),
  validateBody(updateLeadSchema),
  asyncHandler(updateLead)
);

/**
 * @route   DELETE /api/leads/:id
 * @desc    Delete a lead
 * @access  Private
 */
router.delete(
  '/:id',
  validateParams(leadIdSchema),
  sensitiveLimiter, // Limit deletions
  asyncHandler(deleteLead)
);

/**
 * @route   POST /api/leads/bulk-delete
 * @desc    Bulk delete leads
 * @access  Private
 */
router.post(
  '/bulk-delete',
  validateBody(bulkDeleteLeadsSchema),
  sensitiveLimiter, // Limit bulk operations
  asyncHandler(bulkDeleteLeads)
);

/**
 * @route   POST /api/leads/bulk-update
 * @desc    Bulk update leads
 * @access  Private
 */
router.post(
  '/bulk-update',
  validateBody(bulkUpdateLeadsSchema),
  asyncHandler(bulkUpdateLeads)
);

export default router;
