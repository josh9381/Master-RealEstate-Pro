import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { UnauthorizedError } from '../../middleware/errorHandler';
import { encryptForUser, decryptForUser, maskSensitive } from '../../utils/encryption';
import { sendSMS } from '../../services/sms.service';
import { logAPIKeyAccess } from '../../utils/apiKeyAudit';

/**
 * Verify Twilio credentials are valid before saving
 * @param accountSid - Twilio Account SID
 * @param authToken - Twilio Auth Token
 * @returns Promise<boolean> - true if valid, false otherwise
 */
async function verifyTwilioCredentials(accountSid: string, authToken: string): Promise<boolean> {
  try {
    // Basic format validation
    if (!accountSid || !accountSid.startsWith('AC') || accountSid.length !== 34) {
      console.log('Invalid Account SID format');
      return false;
    }
    
    if (!authToken || authToken.length !== 32) {
      console.log('Invalid Auth Token format');
      return false;
    }

    // Test the credentials by making an API call
    const twilio = require('twilio')(accountSid, authToken);
    await twilio.api.v2010.accounts(accountSid).fetch();
    
    console.log('✅ Twilio credentials verified successfully');
    return true;
  } catch (error: any) {
    console.error('❌ Twilio verification failed:', error.message);
    return false;
  }
}

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

  // Return Account SID in plain text (it's just an identifier, not a secret)
  // But NEVER return the Auth Token (that's the actual secret)
  let accountSidValue = null;
  
  try {
    if (config.accountSid) {
      // Decrypt the Account SID to return it
      accountSidValue = decryptForUser(req.user.userId, config.accountSid);
      console.log(`🔐 Returning Account SID: ${accountSidValue}`);
    } else {
      console.log('⚠️ No Account SID stored for user');
    }
  } catch (error) {
    console.error('❌ Failed to decrypt Account SID:', error);
    accountSidValue = null;
  }

  // Return safe config - Account SID is OK to show, Auth Token is NOT
  const safeConfig = {
    provider: config.provider,
    accountSid: accountSidValue, // Full Account SID (it's just an identifier)
    authToken: config.authToken ? '••••••••' : null, // NEVER show auth token
    phoneNumber: config.phoneNumber,
    isActive: config.isActive,
    hasCredentials: !!(config.accountSid && config.authToken),
    createdAt: config.createdAt,
    updatedAt: config.updatedAt
  };

  // Log access to credentials
  if (config.accountSid && config.authToken) {
    await logAPIKeyAccess(req.user.userId, 'twilio', 'accessed', req);
  }

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

  // Verify credentials before saving (if both are provided)
  if (accountSid && authToken) {
    const isValid = await verifyTwilioCredentials(accountSid, authToken);
    if (!isValid) {
      res.status(400).json({
        success: false,
        error: 'Invalid Twilio credentials. Please check your Account SID and Auth Token.'
      });
      return;
    }
  }

  // Encrypt sensitive fields using per-user encryption
  const encryptedAccountSid = accountSid ? encryptForUser(req.user.userId, accountSid) : undefined;
  const encryptedAuthToken = authToken ? encryptForUser(req.user.userId, authToken) : undefined;

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

  // Return safe config with masked values
  let maskedAccountSid = null;
  if (config.accountSid) {
    try {
      const decrypted = decryptForUser(req.user.userId, config.accountSid);
      maskedAccountSid = maskSensitive(decrypted);
    } catch (error) {
      maskedAccountSid = '••••••••';
    }
  }

  const safeConfig = {
    provider: config.provider,
    accountSid: maskedAccountSid,
    authToken: config.authToken ? '••••••••' : null,
    phoneNumber: config.phoneNumber,
    isActive: config.isActive,
    hasCredentials: !!(config.accountSid && config.authToken),
    createdAt: config.createdAt,
    updatedAt: config.updatedAt
  };

  // Log credential creation/update
  if (accountSid && authToken) {
    // Check if this is a new config or update
    const existingConfig = await prisma.sMSConfig.findUnique({
      where: { userId: req.user.userId }
    });
    const action = existingConfig?.accountSid ? 'updated' : 'created';
    await logAPIKeyAccess(req.user.userId, 'twilio', action, req);
  }

  res.status(200).json({
    success: true,
    message: 'SMS configuration updated successfully',
    data: { config: safeConfig }
  });
}

/**
 * Delete SMS configuration credentials
 * DELETE /api/settings/sms
 */
export async function deleteSMSConfig(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  // Clear all encrypted credential fields
  const config = await prisma.sMSConfig.update({
    where: { userId: req.user.userId },
    data: {
      accountSid: null,
      authToken: null,
      phoneNumber: null,
      isActive: false
    }
  });

  // Log credential deletion
  await logAPIKeyAccess(req.user.userId, 'twilio', 'deleted', req);

  res.status(200).json({
    success: true,
    message: 'SMS credentials removed successfully',
    data: {
      provider: config.provider,
      credentialsCleared: true
    }
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
