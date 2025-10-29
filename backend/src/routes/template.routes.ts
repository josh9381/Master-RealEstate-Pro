import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { validateBody, validateQuery } from '../middleware/validate'
import { asyncHandler } from '../utils/asyncHandler'
import {
  createEmailTemplateSchema,
  updateEmailTemplateSchema,
  createSMSTemplateSchema,
  updateSMSTemplateSchema,
} from '../validators/template.validator'
import {
  getEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  useEmailTemplate,
  getEmailTemplateStats,
} from '../controllers/emailTemplate.controller'
import {
  getSMSTemplates,
  getSMSTemplate,
  createSMSTemplate,
  updateSMSTemplate,
  deleteSMSTemplate,
  useSMSTemplate,
  getSMSTemplateStats,
} from '../controllers/smsTemplate.controller'

const router = Router()

// All template routes require authentication
router.use(authenticate)

/**
 * Email Templates
 */

// Get email template stats
router.get('/email/stats', asyncHandler(getEmailTemplateStats))

// Get all email templates
router.get('/email', asyncHandler(getEmailTemplates))

// Get single email template
router.get('/email/:id', asyncHandler(getEmailTemplate))

// Create email template
router.post(
  '/email',
  validateBody(createEmailTemplateSchema),
  asyncHandler(createEmailTemplate)
)

// Update email template
router.put(
  '/email/:id',
  validateBody(updateEmailTemplateSchema),
  asyncHandler(updateEmailTemplate)
)

// Delete email template
router.delete('/email/:id', asyncHandler(deleteEmailTemplate))

// Use email template (increment usage)
router.post('/email/:id/use', asyncHandler(useEmailTemplate))

/**
 * SMS Templates
 */

// Get SMS template stats
router.get('/sms/stats', asyncHandler(getSMSTemplateStats))

// Get all SMS templates
router.get('/sms', asyncHandler(getSMSTemplates))

// Get single SMS template
router.get('/sms/:id', asyncHandler(getSMSTemplate))

// Create SMS template
router.post(
  '/sms',
  validateBody(createSMSTemplateSchema),
  asyncHandler(createSMSTemplate)
)

// Update SMS template
router.put(
  '/sms/:id',
  validateBody(updateSMSTemplateSchema),
  asyncHandler(updateSMSTemplate)
)

// Delete SMS template
router.delete('/sms/:id', asyncHandler(deleteSMSTemplate))

// Use SMS template (increment usage)
router.post('/sms/:id/use', asyncHandler(useSMSTemplate))

export default router
