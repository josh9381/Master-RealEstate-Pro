import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { UnauthorizedError } from '../../middleware/errorHandler';
import { encrypt, decrypt } from '../../utils/encryption';
import { sendEmail } from '../../services/email.service';

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

  if (!config) {
    throw new Error('Email configuration not found. Please configure email settings first.');
  }

  if (!config.apiKey && !config.smtpHost) {
    throw new Error('Email configuration incomplete. Please add SendGrid API key or SMTP settings.');
  }

  // Use recipient email or user's from email as fallback
  const testRecipient = to || config.fromEmail;
  const testSubject = subject || 'Test Email from Master RealEstate Pro';
  const testMessage = message || `
    <h2>Test Email Successful!</h2>
    <p>This is a test email from your Master RealEstate Pro CRM.</p>
    <p><strong>Configuration:</strong></p>
    <ul>
      <li>Provider: ${config.provider}</li>
      <li>From: ${config.fromName || 'CRM'} &lt;${config.fromEmail}&gt;</li>
      <li>Status: ${config.isActive ? 'Active' : 'Inactive'}</li>
    </ul>
    <p>If you received this email, your email configuration is working correctly!</p>
  `;

  // Send actual test email using the email service
  const result = await sendEmail({
    to: testRecipient || '',
    subject: testSubject,
    html: testMessage,
    userId: req.user.userId // Pass userId for config lookup
  });

  if (!result.success) {
    throw new Error(`Failed to send test email: ${result.error}`);
  }

  res.status(200).json({
    success: true,
    message: result.messageId?.startsWith('mock_') 
      ? 'Test email sent successfully (mock mode - no API key configured)'
      : 'Test email sent successfully! Check your inbox.',
    data: {
      to: testRecipient,
      from: config.fromEmail,
      subject: testSubject,
      provider: config.provider,
      messageId: result.messageId,
      mode: result.messageId?.startsWith('mock_') ? 'mock' : 'production'
    }
  });
}
