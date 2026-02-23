import { Router } from 'express';
import multer from 'multer';
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
  countFilteredLeads,
  recalculateLeadScore,
  batchRecalculateScores,
  recalculateAllScores,
  getLeadsByScore,
  importLeads,
} from '../controllers/lead.controller';
import {
  addTagsToLead,
  removeTagFromLead,
} from '../controllers/tag.controller';
import { addTagsToLeadSchema } from '../validators/tag.validator';
import {
  getNotesForLead,
  createNote,
} from '../controllers/note.controller';
import { createNoteSchema, leadIdParamSchema } from '../validators/note.validator';
import {
  getTasksForLead,
} from '../controllers/task.controller';
import {
  getActivities,
} from '../controllers/activity.controller';
import prisma from '../config/database';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// All lead routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/leads/stats
 * @desc    Get lead statistics
 * @access  Private
 */
router.get('/stats', asyncHandler(getLeadStats));

/**
 * @route   POST /api/leads/count-filtered
 * @desc    Count leads matching advanced filters
 * @access  Private
 */
router.post('/count-filtered', asyncHandler(countFilteredLeads));

/**
 * @route   POST /api/leads/import
 * @desc    Import leads from CSV file
 * @access  Private
 */
router.post('/import', upload.single('file'), asyncHandler(importLeads));

/**
 * @route   POST /api/leads/merge
 * @desc    Merge multiple leads into one
 * @access  Private
 */
router.post('/merge', asyncHandler(async (req, res) => {
  const { primaryLeadId, secondaryLeadIds } = req.body;
  const orgId = req.user!.organizationId;

  // Verify all leads belong to the org
  const leads = await prisma.lead.findMany({
    where: { id: { in: [primaryLeadId, ...secondaryLeadIds] }, organizationId: orgId }
  });
  if (leads.length !== secondaryLeadIds.length + 1) {
    return res.status(400).json({ success: false, message: 'One or more leads not found' });
  }

  // Move related records to primary lead
  await prisma.$transaction([
    prisma.note.updateMany({ where: { leadId: { in: secondaryLeadIds } }, data: { leadId: primaryLeadId } }),
    prisma.task.updateMany({ where: { leadId: { in: secondaryLeadIds } }, data: { leadId: primaryLeadId } }),
    prisma.activity.updateMany({ where: { leadId: { in: secondaryLeadIds } }, data: { leadId: primaryLeadId } }),
    prisma.lead.deleteMany({ where: { id: { in: secondaryLeadIds } } })
  ]);

  const merged = await prisma.lead.findUnique({ where: { id: primaryLeadId } });
  res.json({ success: true, data: merged });
}));

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
 * @route   PATCH /api/leads/:id
 * @desc    Update a lead
 * @access  Private
 */
router.patch(
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

/**
 * @route   POST /api/leads/:leadId/tags
 * @desc    Add tags to a lead
 * @access  Private
 */
router.post(
  '/:leadId/tags',
  validateBody(addTagsToLeadSchema),
  asyncHandler(addTagsToLead)
);

/**
 * @route   DELETE /api/leads/:leadId/tags/:tagId
 * @desc    Remove tag from a lead
 * @access  Private
 */
router.delete(
  '/:leadId/tags/:tagId',
  asyncHandler(removeTagFromLead)
);

/**
 * @route   GET /api/leads/:leadId/notes
 * @desc    Get all notes for a lead
 * @access  Private
 */
router.get(
  '/:leadId/notes',
  validateParams(leadIdParamSchema),
  asyncHandler(getNotesForLead)
);

/**
 * @route   POST /api/leads/:leadId/notes
 * @desc    Create a note for a lead
 * @access  Private
 */
router.post(
  '/:leadId/notes',
  validateParams(leadIdParamSchema),
  validateBody(createNoteSchema),
  asyncHandler(createNote)
);

/**
 * @route   GET /api/leads/:leadId/tasks
 * @desc    Get all tasks for a lead
 * @access  Private
 */
router.get(
  '/:leadId/tasks',
  validateParams(leadIdParamSchema),
  asyncHandler(getTasksForLead)
);

/**
 * @route   GET /api/leads/:leadId/activities
 * @desc    Get all activities for a lead
 * @access  Private
 */
router.get(
  '/:leadId/activities',
  validateParams(leadIdParamSchema),
  asyncHandler(async (req, res) => {
    // Reuse getActivities function by adding leadId to query
    req.query.leadId = req.params.leadId;
    return getActivities(req, res);
  })
);

/**
 * @route   POST /api/leads/:id/score
 * @desc    Recalculate score for a single lead
 * @access  Private
 */
router.post(
  '/:id/score',
  validateParams(leadIdParamSchema),
  asyncHandler(recalculateLeadScore)
);

/**
 * @route   POST /api/leads/scores/batch
 * @desc    Batch recalculate scores for multiple leads
 * @access  Private
 */
router.post(
  '/scores/batch',
  asyncHandler(batchRecalculateScores)
);

/**
 * @route   POST /api/leads/scores/all
 * @desc    Recalculate scores for all leads
 * @access  Private
 */
router.post(
  '/scores/all',
  asyncHandler(recalculateAllScores)
);

/**
 * @route   GET /api/leads/scores/:category
 * @desc    Get leads by score category (HOT, WARM, COOL, COLD)
 * @access  Private
 */
router.get(
  '/scores/:category',
  asyncHandler(getLeadsByScore)
);

export default router;
