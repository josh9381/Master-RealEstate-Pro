import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  createEmailTemplateSchema,
  updateEmailTemplateSchema,
  emailTemplateIdSchema,
  listEmailTemplatesQuerySchema,
} from '../validators/email-template.validator';
import {
  getEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  duplicateEmailTemplate,
  getEmailTemplateCategories,
} from '../controllers/email-template.controller';

const router = Router();

// All email template routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/email-templates/categories
 * @desc    Get list of all template categories
 * @access  Private
 */
router.get('/categories', asyncHandler(getEmailTemplateCategories));

/**
 * @route   GET /api/email-templates
 * @desc    Get all email templates with filtering and pagination
 * @access  Private
 */
router.get(
  '/',
  validateQuery(listEmailTemplatesQuerySchema),
  asyncHandler(getEmailTemplates)
);

/**
 * @route   GET /api/email-templates/:id
 * @desc    Get single email template by ID
 * @access  Private
 */
router.get(
  '/:id',
  validateParams(emailTemplateIdSchema),
  asyncHandler(getEmailTemplate)
);

/**
 * @route   POST /api/email-templates
 * @desc    Create a new email template
 * @access  Private
 */
router.post(
  '/',
  validateBody(createEmailTemplateSchema),
  asyncHandler(createEmailTemplate)
);

/**
 * @route   PUT /api/email-templates/:id
 * @desc    Update an email template
 * @access  Private
 */
router.put(
  '/:id',
  validateParams(emailTemplateIdSchema),
  validateBody(updateEmailTemplateSchema),
  asyncHandler(updateEmailTemplate)
);

/**
 * @route   DELETE /api/email-templates/:id
 * @desc    Delete an email template
 * @access  Private
 */
router.delete(
  '/:id',
  validateParams(emailTemplateIdSchema),
  asyncHandler(deleteEmailTemplate)
);

/**
 * @route   POST /api/email-templates/:id/duplicate
 * @desc    Duplicate an email template
 * @access  Private
 */
router.post(
  '/:id/duplicate',
  validateParams(emailTemplateIdSchema),
  asyncHandler(duplicateEmailTemplate)
);

export default router;
