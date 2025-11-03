import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { UnauthorizedError } from '../../middleware/errorHandler';
import { encrypt, decrypt } from '../../utils/encryption';
import { sendSMS } from '../../services/sms.service';

/**
 * Get SMS configuration
 * GET /api/settings/sms
 */
export async function getSMSConfig(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  let config = await prisma.sMSConfig.findUnique({
    where: { userId: req.user.userId }
  });

  // Create default config if it doesn't exist
  if (!config) {
    config = await prisma.sMSConfig.create({
      data: {
        userId: req.user.userId,
        provider: 'twilio'
      }
    });
  }

  // Mask sensitive fields
  const safeConfig = {
    ...config,
    accountSid: config.accountSid ? '••••••••' + (decrypt(config.accountSid).slice(-4)) : null,
    authToken: config.authToken ? '••••••••' : null
  };

  res.status(200).json({
    success: true,
    data: { config: safeConfig }
  });
}

/**
 * Update SMS configuration
 * PUT /api/settings/sms
 */
export async function updateSMSConfig(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const {
    provider,
    accountSid,
    authToken,
    phoneNumber,
    isActive
  } = req.body;

  // Encrypt sensitive fields
  const encryptedAccountSid = accountSid ? encrypt(accountSid) : undefined;
  const encryptedAuthToken = authToken ? encrypt(authToken) : undefined;

  const config = await prisma.sMSConfig.upsert({
    where: { userId: req.user.userId },
    update: {
      ...(provider && { provider }),
      ...(encryptedAccountSid && { accountSid: encryptedAccountSid }),
      ...(encryptedAuthToken && { authToken: encryptedAuthToken }),
      ...(phoneNumber !== undefined && { phoneNumber }),
      ...(isActive !== undefined && { isActive })
    },
    create: {
      userId: req.user.userId,
      provider: provider || 'twilio',
      accountSid: encryptedAccountSid,
      authToken: encryptedAuthToken,
      phoneNumber,
      isActive: isActive ?? false
    }
  });

  // Mask sensitive data
  const safeConfig = {
    ...config,
    accountSid: config.accountSid ? '••••••••' : null,
    authToken: config.authToken ? '••••••••' : null
  };

  res.status(200).json({
    success: true,
    message: 'SMS configuration updated successfully',
    data: { config: safeConfig }
  });
}

/**
 * Send test SMS
 * POST /api/settings/sms/test
 */
export async function testSMS(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { to, message } = req.body;

  // Get user's SMS config
  const config = await prisma.sMSConfig.findUnique({
    where: { userId: req.user.userId }
  });

  if (!config) {
    throw new Error('SMS configuration not found. Please configure SMS settings first.');
  }

  if (!config.accountSid || !config.authToken || !config.phoneNumber) {
    throw new Error('SMS configuration incomplete. Please add Twilio credentials and phone number.');
  }

  // Validate phone number
  if (!to) {
    throw new Error('Recipient phone number is required');
  }

  const testMessage = message || `Test SMS from Master RealEstate Pro CRM. Your SMS configuration is working correctly! Provider: ${config.provider}`;

  // Send actual test SMS using the SMS service
  const result = await sendSMS({
    to,
    message: testMessage,
    userId: req.user.userId // Pass userId for config lookup
  });

  if (!result.success) {
    throw new Error(`Failed to send test SMS: ${result.error}`);
  }

  res.status(200).json({
    success: true,
    message: result.messageId?.startsWith('mock_') 
      ? 'Test SMS sent successfully (mock mode - no credentials configured)'
      : 'Test SMS sent successfully! Check your phone.',
    data: {
      to,
      from: config.phoneNumber,
      message: testMessage,
      provider: config.provider,
      messageId: result.messageId,
      mode: result.messageId?.startsWith('mock_') ? 'mock' : 'production'
    }
  });
}
