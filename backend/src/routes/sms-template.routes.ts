import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  createSMSTemplateSchema,
  updateSMSTemplateSchema,
  smsTemplateIdSchema,
  listSMSTemplatesQuerySchema,
} from '../validators/sms-template.validator';
import {
  getSMSTemplates,
  getSMSTemplate,
  createSMSTemplate,
  updateSMSTemplate,
  deleteSMSTemplate,
  duplicateSMSTemplate,
  getSMSTemplateCategories,
  previewSMSTemplate,
} from '../controllers/sms-template.controller';

const router = Router();

// All SMS template routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/sms-templates/categories
 * @desc    Get list of all template categories
 * @access  Private
 */
router.get('/categories', asyncHandler(getSMSTemplateCategories));

/**
 * @route   POST /api/sms-templates/preview
 * @desc    Preview SMS with character count and cost
 * @access  Private
 */
router.post('/preview', asyncHandler(previewSMSTemplate));

/**
 * @route   GET /api/sms-templates
 * @desc    Get all SMS templates with filtering and pagination
 * @access  Private
 */
router.get(
  '/',
  validateQuery(listSMSTemplatesQuerySchema),
  asyncHandler(getSMSTemplates)
);

/**
 * @route   GET /api/sms-templates/:id
 * @desc    Get single SMS template by ID
 * @access  Private
 */
router.get(
  '/:id',
  validateParams(smsTemplateIdSchema),
  asyncHandler(getSMSTemplate)
);

/**
 * @route   POST /api/sms-templates
 * @desc    Create a new SMS template
 * @access  Private
 */
router.post(
  '/',
  validateBody(createSMSTemplateSchema),
  asyncHandler(createSMSTemplate)
);

/**
 * @route   PUT /api/sms-templates/:id
 * @desc    Update an SMS template
 * @access  Private
 */
router.put(
  '/:id',
  validateParams(smsTemplateIdSchema),
  validateBody(updateSMSTemplateSchema),
  asyncHandler(updateSMSTemplate)
);

/**
 * @route   DELETE /api/sms-templates/:id
 * @desc    Delete an SMS template
 * @access  Private
 */
router.delete(
  '/:id',
  validateParams(smsTemplateIdSchema),
  asyncHandler(deleteSMSTemplate)
);

/**
 * @route   POST /api/sms-templates/:id/duplicate
 * @desc    Duplicate an SMS template
 * @access  Private
 */
router.post(
  '/:id/duplicate',
  validateParams(smsTemplateIdSchema),
  asyncHandler(duplicateSMSTemplate)
);

export default router;
