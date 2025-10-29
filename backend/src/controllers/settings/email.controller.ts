import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { UnauthorizedError } from '../../middleware/errorHandler';
import { encrypt, decrypt } from '../../utils/encryption';

/**
 * Get email configuration
 * GET /api/settings/email
 */
export async function getEmailConfig(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  let config = await prisma.emailConfig.findUnique({
    where: { userId: req.user.userId }
  });

  // Create default config if it doesn't exist
  if (!config) {
    config = await prisma.emailConfig.create({
      data: {
        userId: req.user.userId,
        provider: 'sendgrid'
      }
    });
  }

  // Decrypt sensitive fields before sending (but mask them for security)
  const safeConfig = {
    ...config,
    apiKey: config.apiKey ? '••••••••' + (decrypt(config.apiKey).slice(-4)) : null,
    smtpPassword: config.smtpPassword ? '••••••••' : null
  };

  res.status(200).json({
    success: true,
    data: { config: safeConfig }
  });
}

/**
 * Update email configuration
 * PUT /api/settings/email
 */
export async function updateEmailConfig(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const {
    provider,
    apiKey,
    fromEmail,
    fromName,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPassword,
    isActive
  } = req.body;

  // Encrypt sensitive fields
  const encryptedApiKey = apiKey ? encrypt(apiKey) : undefined;
  const encryptedSmtpPassword = smtpPassword ? encrypt(smtpPassword) : undefined;

  const config = await prisma.emailConfig.upsert({
    where: { userId: req.user.userId },
    update: {
      ...(provider && { provider }),
      ...(encryptedApiKey && { apiKey: encryptedApiKey }),
      ...(fromEmail !== undefined && { fromEmail }),
      ...(fromName !== undefined && { fromName }),
      ...(smtpHost !== undefined && { smtpHost }),
      ...(smtpPort !== undefined && { smtpPort }),
      ...(smtpUser !== undefined && { smtpUser }),
      ...(encryptedSmtpPassword && { smtpPassword: encryptedSmtpPassword }),
      ...(isActive !== undefined && { isActive })
    },
    create: {
      userId: req.user.userId,
      provider: provider || 'sendgrid',
      apiKey: encryptedApiKey,
      fromEmail,
      fromName,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword: encryptedSmtpPassword,
      isActive: isActive ?? false
    }
  });

  // Mask sensitive data in response
  const safeConfig = {
    ...config,
    apiKey: config.apiKey ? '••••••••' : null,
    smtpPassword: config.smtpPassword ? '••••••••' : null
  };

  res.status(200).json({
    success: true,
    message: 'Email configuration updated successfully',
    data: { config: safeConfig }
  });
}

/**
 * Send test email
 * POST /api/settings/email/test
 */
export async function testEmail(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { to, subject, message } = req.body;

  // Get user's email config
  const config = await prisma.emailConfig.findUnique({
    where: { userId: req.user.userId }
  });

  if (!config || !config.isActive) {
    throw new Error('Email configuration not found or not active');
  }

  // TODO: Integrate with actual email service (SendGrid/SMTP)
  // For now, just return success
  console.log('Test email would be sent to:', to);
  console.log('Subject:', subject || 'Test Email from Master RealEstate Pro');
  console.log('Message:', message || 'This is a test email.');

  res.status(200).json({
    success: true,
    message: 'Test email sent successfully (mock mode)',
    data: {
      to,
      from: config.fromEmail,
      subject: subject || 'Test Email',
      provider: config.provider
    }
  });
}
