import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { sensitiveLimiter } from '../middleware/rateLimiter';
import { enforcePlanLimit } from '../middleware/planLimits';
import {
  createLeadSchema,
  updateLeadSchema,
  leadIdSchema,
  listLeadsQuerySchema,
  bulkDeleteLeadsSchema,
  bulkUpdateLeadsSchema,
  mergeLeadsSchema,
} from '../validators/lead.validator';
import {
  uploadDocuments,
  getDocuments,
  deleteDocument,
} from '../controllers/document.controller';
import { documentUpload } from '../config/upload';
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
  previewImport,
  checkImportDuplicates,
  mergeLeads,
  scanDuplicates,
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

const router = Router();

// CSV import multer config with fileFilter (#97)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB (increased for Excel files)
  fileFilter: (_req, file, cb) => {
    // Accept CSV, Excel, and vCard files
    const allowedMimes = [
      'text/csv', 'application/vnd.ms-excel', 'text/plain',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/vcard', 'text/x-vcard', // .vcf
    ];
    const allowedExts = ['.csv', '.xlsx', '.xls', '.vcf'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV, Excel (.xlsx/.xls), and vCard (.vcf) files are allowed') as any, false);
    }
  },
});

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
 * @route   POST /api/leads/import/preview
 * @desc    Parse file and return headers + preview rows for column mapping
 * @access  Private
 */
router.post('/import/preview', upload.single('file'), asyncHandler(previewImport));

/**
 * @route   POST /api/leads/import/duplicates
 * @desc    Check for duplicates in uploaded file before importing
 * @access  Private
 */
router.post('/import/duplicates', upload.single('file'), asyncHandler(checkImportDuplicates));

/**
 * @route   POST /api/leads/import
 * @desc    Import leads from CSV/Excel/vCard file
 * @access  Private
 */
router.post('/import', upload.single('file'), asyncHandler(importLeads));

/**
 * @route   POST /api/leads/merge
 * @desc    Merge multiple leads into one with field-level resolution
 * @access  Private
 */
router.post('/merge', validateBody(mergeLeadsSchema), asyncHandler(mergeLeads));
router.post('/duplicates/scan', asyncHandler(scanDuplicates));

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
  enforcePlanLimit('leads'),
  sensitiveLimiter,
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

// ─── Lead Document Routes ────────────────────────────────────────

/**
 * @route   POST /api/leads/:id/documents
 * @desc    Upload documents for a lead (max 5 per request, 20 per lead)
 * @access  Private
 */
router.post(
  '/:id/documents',
  (req, _res, next) => { req.params.leadId = req.params.id; next(); },
  documentUpload,
  asyncHandler(uploadDocuments)
);

/**
 * @route   GET /api/leads/:id/documents
 * @desc    Get all documents for a lead
 * @access  Private
 */
router.get(
  '/:id/documents',
  (req, _res, next) => { req.params.leadId = req.params.id; next(); },
  asyncHandler(getDocuments)
);

/**
 * @route   DELETE /api/leads/:id/documents/:documentId
 * @desc    Delete a document from a lead
 * @access  Private
 */
router.delete(
  '/:id/documents/:documentId',
  (req, _res, next) => { req.params.leadId = req.params.id; next(); },
  asyncHandler(deleteDocument)
);

export default router;
