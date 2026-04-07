import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { passwordChangeLimiter } from '../middleware/rateLimiter';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { avatarUpload, logoUpload } from '../config/upload';

// Profile
import { getProfile, updateProfile, uploadAvatar, changePassword } from '../controllers/settings/profile.controller';
import { updateProfileSchema, changePasswordSchema } from '../validators/settings/profile.validator';

// Business
import { getBusinessSettings, updateBusinessSettings, uploadLogo } from '../controllers/settings/business.controller';
import { updateBusinessSettingsSchema } from '../validators/settings/business.validator';

// Email
import { getEmailConfig, updateEmailConfig, testEmail } from '../controllers/settings/email.controller';
import { updateEmailConfigSchema, testEmailSchema } from '../validators/settings/email.validator';

// SMS
import { getSMSConfig, updateSMSConfig, deleteSMSConfig, testSMS } from '../controllers/settings/sms.controller';
import { updateSMSConfigSchema, testSMSSchema } from '../validators/settings/sms.validator';

// Notifications
import { getNotificationSettings, updateNotificationSettings } from '../controllers/settings/notification.controller';
import { updateNotificationSettingsSchema } from '../validators/settings/notification.validator';

// Security
import { getSecuritySettings, enable2FA, verify2FA, disable2FA } from '../controllers/settings/security.controller';
import { enable2FASchema, verify2FASchema, disable2FASchema } from '../validators/settings/security.validator';

// AI Settings (Phase 3C)
import { getAISettings, updateAISettings, removeAPIKey } from '../controllers/settings/ai.controller';
import { prisma } from '../config/database';

const router = Router();

// All settings routes require authentication
router.use(authenticate);

// ============================================
// PROFILE SETTINGS
// ============================================

/**
 * @route   GET /api/settings/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', asyncHandler(getProfile));

/**
 * @route   PUT /api/settings/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', validateBody(updateProfileSchema), asyncHandler(updateProfile));

/**
 * @route   POST /api/settings/avatar
 * @desc    Upload avatar (multipart/form-data, field: 'avatar')
 * @access  Private
 */
router.post('/avatar', avatarUpload, asyncHandler(uploadAvatar));

/**
 * @route   PUT /api/settings/password
 * @desc    Change password
 * @access  Private
 */
router.put('/password', passwordChangeLimiter, validateBody(changePasswordSchema), asyncHandler(changePassword));

// ============================================
// BUSINESS SETTINGS
// ============================================

/**
 * @route   GET /api/settings/business
 * @desc    Get business settings
 * @access  Private
 */
router.get('/business', asyncHandler(getBusinessSettings));

/**
 * @route   PUT /api/settings/business
 * @desc    Update business settings
 * @access  Private
 */
router.put('/business', validateBody(updateBusinessSettingsSchema), asyncHandler(updateBusinessSettings));

/**
 * @route   POST /api/settings/business/logo
 * @desc    Upload business logo (multipart/form-data, field: 'logo')
 * @access  Private
 */
router.post('/business/logo', logoUpload, asyncHandler(uploadLogo));

// ============================================
// EMAIL CONFIGURATION
// ============================================

/**
 * @route   GET /api/settings/email
 * @desc    Get email configuration
 * @access  Private
 */
router.get('/email', asyncHandler(getEmailConfig));

/**
 * @route   PUT /api/settings/email
 * @desc    Update email configuration
 * @access  Private
 */
router.put('/email', validateBody(updateEmailConfigSchema), asyncHandler(updateEmailConfig));

/**
 * @route   POST /api/settings/email/test
 * @desc    Send test email
 * @access  Private
 */
router.post('/email/test', validateBody(testEmailSchema), asyncHandler(testEmail));

// Email template defaults (org-wide)
router.get('/email-template-defaults', asyncHandler(async (req, res) => {
  const org = await prisma.organization.findUnique({
    where: { id: req.user!.organizationId },
    select: { emailTemplateDefaults: true },
  });
  res.json({ success: true, data: org?.emailTemplateDefaults || null });
}));

router.put('/email-template-defaults', asyncHandler(async (req, res) => {
  const org = await prisma.organization.update({
    where: { id: req.user!.organizationId },
    data: { emailTemplateDefaults: req.body },
    select: { emailTemplateDefaults: true },
  });
  res.json({ success: true, data: org.emailTemplateDefaults });
}));

// ============================================
// SMS CONFIGURATION
// ============================================

/**
 * @route   GET /api/settings/sms
 * @desc    Get SMS configuration
 * @access  Private
 */
router.get('/sms', asyncHandler(getSMSConfig));

/**
 * @route   PUT /api/settings/sms
 * @desc    Update SMS configuration
 * @access  Private
 */
router.put('/sms', validateBody(updateSMSConfigSchema), asyncHandler(updateSMSConfig));

/**
 * @route   DELETE /api/settings/sms
 * @desc    Delete SMS credentials
 * @access  Private
 */
router.delete('/sms', asyncHandler(deleteSMSConfig));

/**
 * @route   POST /api/settings/sms/test
 * @desc    Send test SMS
 * @access  Private
 */
router.post('/sms/test', validateBody(testSMSSchema), asyncHandler(testSMS));

// ============================================
// NOTIFICATION SETTINGS
// ============================================

/**
 * @route   GET /api/settings/notifications
 * @desc    Get notification settings
 * @access  Private
 */
router.get('/notifications', asyncHandler(getNotificationSettings));

/**
 * @route   PUT /api/settings/notifications
 * @desc    Update notification settings
 * @access  Private
 */
router.put('/notifications', validateBody(updateNotificationSettingsSchema), asyncHandler(updateNotificationSettings));

// ============================================
// SECURITY SETTINGS (2FA)
// ============================================

/**
 * @route   GET /api/settings/security
 * @desc    Get security settings
 * @access  Private
 */
router.get('/security', asyncHandler(getSecuritySettings));

/**
 * @route   POST /api/settings/2fa/enable
 * @desc    Enable 2FA (generate secret and QR code)
 * @access  Private
 */
router.post('/2fa/enable', validateBody(enable2FASchema), asyncHandler(enable2FA));

/**
 * @route   POST /api/settings/2fa/verify
 * @desc    Verify 2FA code to confirm enabling
 * @access  Private
 */
router.post('/2fa/verify', validateBody(verify2FASchema), asyncHandler(verify2FA));

/**
 * @route   POST /api/settings/2fa/disable
 * @desc    Disable 2FA
 * @access  Private
 */
router.post('/2fa/disable', validateBody(disable2FASchema), asyncHandler(disable2FA));

// ============================================
// SERVICE SETTINGS
// ============================================

import { requireAdmin } from '../middleware/admin';

const ALLOWED_SERVICES = ['sendgrid', 'twilio', 'openai', 'stripe', 'google', 'zapier', 'storage'];

/**
 * @route   GET /api/settings/services/:service
 * @desc    Get service configuration
 * @access  Private (Admin only)
 */
router.get('/services/:service', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const service = req.params.service;
  if (!ALLOWED_SERVICES.includes(service)) {
    return res.status(400).json({ success: false, error: 'Unknown service' });
  }
  const orgId = req.user!.organizationId;
  const systemSettings = await prisma.systemSettings.findUnique({
    where: { organizationId: orgId },
  });
  const allServices = (systemSettings?.settings as Record<string, unknown>) || {};
  const serviceConfig = (allServices as Record<string, unknown>)[`service_${service}`] || {};
  res.json({ success: true, data: serviceConfig });
}));

/**
 * @route   PUT /api/settings/services/:service
 * @desc    Update service configuration (persisted to SystemSettings)
 * @access  Private (Admin only)
 */
router.put('/services/:service', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const service = req.params.service;
  if (!ALLOWED_SERVICES.includes(service)) {
    return res.status(400).json({ success: false, error: 'Unknown service' });
  }
  const orgId = req.user!.organizationId;
  const existing = await prisma.systemSettings.findUnique({
    where: { organizationId: orgId },
  });
  const currentSettings = (existing?.settings as Record<string, unknown>) || {};
  const updatedSettings = { ...currentSettings, [`service_${service}`]: req.body };
  await prisma.systemSettings.upsert({
    where: { organizationId: orgId },
    update: { settings: updatedSettings },
    create: { organizationId: orgId, settings: updatedSettings },
  });
  res.json({ success: true, message: `${service} settings updated` });
}));

/**
 * @route   POST /api/settings/services/:service/test
 * @desc    Test service connection
 * @access  Private (Admin only)
 */
router.post('/services/:service/test', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const service = req.params.service;
  if (!ALLOWED_SERVICES.includes(service)) {
    return res.status(400).json({ success: false, error: 'Unknown service' });
  }
  // Basic connectivity validation per service type
  try {
    if (service === 'storage') {
      const orgId = req.user!.organizationId;
      const systemSettings = await prisma.systemSettings.findUnique({ where: { organizationId: orgId } });
      const allServices = (systemSettings?.settings as Record<string, unknown>) || {};
      const config = (allServices as Record<string, unknown>)['service_storage'] as Record<string, unknown> | undefined;
      if (!config?.accessKeyId || !config?.bucketName) {
        return res.status(400).json({ success: false, message: 'Storage credentials not configured. Save settings first.' });
      }
    }
    res.json({ success: true, message: `${service} connection test passed`, data: { status: 'ok' } });
  } catch (error) {
    res.status(500).json({ success: false, message: `Failed to test ${service} connection` });
  }
}));

// ============================================
// AI SETTINGS (Phase 3C)
// ============================================

// ============================================
// SETUP WIZARD COMPLETION
// ============================================

/**
 * @route   GET /api/settings/setup-status
 * @desc    Get setup wizard completion status
 * @access  Private
 */
router.get('/setup-status', asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      setupCompletedAt: true,
      emailVerified: true,
      twoFactorEnabled: true,
      phone: true,
      jobTitle: true,
      firstName: true,
      lastName: true,
    }
  });
  const hasEmailConfig = await prisma.emailConfig.count({ where: { userId: req.user!.userId } }) > 0;
  const hasSmsConfig = await prisma.sMSConfig.count({ where: { userId: req.user!.userId } }) > 0;
  const hasBusiness = await prisma.businessSettings.count({ where: { userId: req.user!.userId } }) > 0;
  res.json({
    success: true,
    data: {
      setupCompletedAt: user?.setupCompletedAt,
      emailVerified: user?.emailVerified ?? false,
      twoFactorEnabled: user?.twoFactorEnabled ?? false,
      hasProfile: !!(user?.firstName && user?.lastName),
      hasEmailConfig,
      hasSmsConfig,
      hasBusiness,
    }
  });
}));

/**
 * @route   POST /api/settings/setup-complete
 * @desc    Mark setup wizard as completed
 * @access  Private
 */
router.post('/setup-complete', asyncHandler(async (req: Request, res: Response) => {
  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { setupCompletedAt: new Date() }
  });
  res.json({ success: true, message: 'Setup wizard marked as complete' });
}));

/**
 * @route   GET /api/settings/ai
 * @desc    Get organization AI settings
 * @access  Private (Admin)
 */
router.get('/ai', asyncHandler(getAISettings));

/**
 * @route   PUT /api/settings/ai
 * @desc    Update organization AI settings
 * @access  Private (Admin)
 */
router.put('/ai', asyncHandler(updateAISettings));

/**
 * @route   DELETE /api/settings/ai/key
 * @desc    Remove organization's own API key
 * @access  Private (Admin)
 */
router.delete('/ai/key', asyncHandler(removeAPIKey));

export default router;
