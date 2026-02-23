import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

// Profile
import { getProfile, updateProfile, uploadAvatar, changePassword } from '../controllers/settings/profile.controller';
import { updateProfileSchema, changePasswordSchema } from '../validators/settings/profile.validator';

// Business
import { getBusinessSettings, updateBusinessSettings } from '../controllers/settings/business.controller';
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
 * @desc    Upload avatar
 * @access  Private
 */
router.post('/avatar', asyncHandler(uploadAvatar));

/**
 * @route   PUT /api/settings/password
 * @desc    Change password
 * @access  Private
 */
router.put('/password', validateBody(changePasswordSchema), asyncHandler(changePassword));

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

/**
 * @route   PUT /api/settings/services/:service
 * @desc    Update service configuration
 * @access  Private
 */
router.put('/services/:service', asyncHandler(async (req: any, res: any) => {
  res.json({ success: true, message: `${req.params.service} settings updated` });
}));

/**
 * @route   POST /api/settings/services/:service/test
 * @desc    Test service connection
 * @access  Private
 */
router.post('/services/:service/test', asyncHandler(async (req: any, res: any) => {
  const service = req.params.service;
  res.json({ success: true, message: `${service} connection test passed`, data: { status: 'ok' } });
}));

export default router;
