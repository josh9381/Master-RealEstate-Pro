/**
 * Email Service
 * Handles sending emails via SendGrid with tracking and template support
 */

import sgMail from '@sendgrid/mail';
import Handlebars from 'handlebars';
import { prisma } from '../config/database';
import { decryptForUser } from '../utils/encryption';
import { logger } from '../lib/logger';

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@realestate.com';
const FROM_NAME = process.env.FROM_NAME || 'RealEstate Pro';
const APP_URL = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
const UNSUBSCRIBE_EMAIL = process.env.UNSUBSCRIBE_EMAIL || `unsubscribe@${FROM_EMAIL.split('@')[1] || 'realestate.com'}`;

// #105: Default daily email sending limit per org (configurable via env)
const DAILY_EMAIL_LIMIT = parseInt(process.env.DAILY_EMAIL_LIMIT || '1000', 10);

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

/**
 * Get email configuration for a user
 * Falls back to environment variables if no user config exists
 */
async function getEmailConfig(userId?: string) {
  // If no userId provided, use environment variables
  if (!userId) {
    return {
      apiKey: SENDGRID_API_KEY,
      fromEmail: FROM_EMAIL,
      fromName: FROM_NAME,
      mode: 'environment' as const
    };
  }

  // Try to get user's config from database
  try {
    const config = await prisma.emailConfig.findUnique({
      where: { userId }
    });

    // If user has config with API key, use it
    if (config?.apiKey) {
      try {
        return {
          apiKey: decryptForUser(userId, config.apiKey),
          fromEmail: config.fromEmail || FROM_EMAIL,
          fromName: config.fromName || FROM_NAME,
          mode: 'database' as const
        };
      } catch (decryptError) {
        logger.error({ error: decryptError }, '[EMAIL] Failed to decrypt user credentials');
        // Fall through to environment variables
      }
    }

    // Fall back to environment variables
    return {
      apiKey: SENDGRID_API_KEY,
      fromEmail: FROM_EMAIL,
      fromName: FROM_NAME,
      mode: 'environment' as const
    };
  } catch (error) {
    logger.error({ error }, 'Error fetching email config');
    // Fall back to environment variables on error
    return {
      apiKey: SENDGRID_API_KEY,
      fromEmail: FROM_EMAIL,
      fromName: FROM_NAME,
      mode: 'environment' as const
    };
  }
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
  from?: {
    email: string;
    name?: string;
  };
  replyTo?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type?: string;
  }>;
  leadId?: string;
  campaignId?: string;
  userId?: string; // User ID to fetch custom config
  organizationId: string; // Organization ID for multi-tenancy
  trackOpens?: boolean;
  trackClicks?: boolean;
  skipSuppressionCheck?: boolean; // For transactional emails that must go out regardless
}

/**
 * #102/#103: Check if an email address is on the suppression list (bounced or spam-reported)
 */
export async function isEmailSuppressed(email: string, organizationId: string): Promise<boolean> {
  const suppression = await prisma.emailSuppression.findUnique({
    where: { organizationId_email: { organizationId, email: email.toLowerCase() } },
  });
  return !!suppression;
}

/**
 * #102/#103: Add an email address to the suppression list
 */
export async function suppressEmail(email: string, organizationId: string, reason: string): Promise<void> {
  await prisma.emailSuppression.upsert({
    where: { organizationId_email: { organizationId, email: email.toLowerCase() } },
    update: { reason },
    create: {
      email: email.toLowerCase(),
      reason,
      organizationId,
    },
  });
  logger.info({ email, organizationId, reason }, '[EMAIL] Address added to suppression list');
}

/**
 * #105: Check daily sending limit for an organization
 * Returns { allowed: boolean, sent: number, limit: number }
 */
export async function checkDailySendingLimit(organizationId: string): Promise<{ allowed: boolean; sent: number; limit: number }> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const sent = await prisma.message.count({
    where: {
      organizationId,
      type: 'EMAIL',
      direction: 'OUTBOUND',
      createdAt: { gte: startOfDay },
    },
  });

  return { allowed: sent < DAILY_EMAIL_LIMIT, sent, limit: DAILY_EMAIL_LIMIT };
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email via SendGrid
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const {
    to,
    subject,
    html,
    text,
    from,
    replyTo,
    attachments,
    leadId,
    campaignId,
    userId,
    organizationId,
    trackOpens = true,
    trackClicks = true,
  } = options;

  try {
    // #102: Check suppression list before sending (unless skipped for transactional emails)
    if (!options.skipSuppressionCheck) {
      const recipients = Array.isArray(to) ? to : [to];
      for (const recipient of recipients) {
        if (await isEmailSuppressed(recipient, organizationId)) {
          logger.warn({ to: recipient, organizationId }, '[EMAIL] Recipient is on suppression list, skipping');
          return { success: false, error: `Email to ${recipient} suppressed (bounced or spam-reported)` };
        }
      }

      // Also check lead-level emailOptIn
      if (leadId) {
        const lead = await prisma.lead.findUnique({
          where: { id: leadId },
          select: { emailOptIn: true },
        });
        if (lead && !lead.emailOptIn) {
          logger.warn({ leadId, organizationId }, '[EMAIL] Lead has opted out of emails, skipping');
          return { success: false, error: 'Lead has opted out of emails' };
        }
      }
    }

    // #105: Check daily sending limit
    const limitCheck = await checkDailySendingLimit(organizationId);
    if (!limitCheck.allowed) {
      logger.warn({ organizationId, sent: limitCheck.sent, limit: limitCheck.limit }, '[EMAIL] Daily sending limit reached');
      return { success: false, error: `Daily email limit reached (${limitCheck.sent}/${limitCheck.limit}). Try again tomorrow.` };
    }

    // Get email configuration (database or environment)
    const config = await getEmailConfig(userId);

    // Check if SendGrid is configured
    if (!config.apiKey) {
      logger.warn('[EMAIL] SendGrid API key not configured, using mock mode');
      return mockEmailSend(options);
    }

    // Set API key for this request
    sgMail.setApiKey(config.apiKey);

    logger.info({ mode: config.mode, userId: userId || 'none' }, '[EMAIL] Using config');

    // #101: Build unsubscribe URL for List-Unsubscribe header (RFC 8058)
    const unsubscribeUrl = leadId
      ? `${APP_URL}/api/unsubscribe/${leadId}`
      : `${APP_URL}/api/unsubscribe`;

    // Prepare email message
    const message = {
      to: Array.isArray(to) ? to : [to],
      from: from || {
        email: config.fromEmail,
        name: config.fromName,
      },
      subject,
      html: html || '',
      text: text || '',
      trackingSettings: {
        clickTracking: { enable: trackClicks },
        openTracking: { enable: trackOpens },
      },
      // #101: List-Unsubscribe headers (required by Gmail/Yahoo since Feb 2024)
      headers: {
        'List-Unsubscribe': `<mailto:${UNSUBSCRIBE_EMAIL}>, <${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    };

    // Add optional fields
    if (replyTo) {
      Object.assign(message, { replyTo });
    }
    if (attachments && attachments.length > 0) {
      Object.assign(message, { attachments });
    }

    // Custom headers for tracking
    Object.assign(message, {
      customArgs: {
        leadId: leadId || '',
        campaignId: campaignId || '',
        sentAt: new Date().toISOString(),
      },
    });

    // Send via SendGrid
    const [response] = await sgMail.send(message as never);

    // Log success
    logger.info({ to, subject, messageId: response.headers['x-message-id'] }, '[EMAIL] Sent successfully');

    // Create message record in database
    const createdMessage = await createMessageRecord({
      type: 'EMAIL',
      direction: 'OUTBOUND',
      subject,
      body: html || text || '',
      fromAddress: typeof from === 'string' ? from : from?.email || FROM_EMAIL,
      toAddress: Array.isArray(to) ? to.join(', ') : to,
      status: 'SENT',
      externalId: response.headers['x-message-id'],
      provider: 'sendgrid',
      organizationId,
      leadId,
      metadata: {
        trackOpens,
        trackClicks,
        campaignId,
      },
    });

    return {
      success: true,
      messageId: createdMessage?.id || response.headers['x-message-id'],
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage }, '[EMAIL] Send failed');

    // Log failed message
    await createMessageRecord({
      type: 'EMAIL',
      direction: 'OUTBOUND',
      subject,
      body: html || text || '',
      fromAddress: typeof from === 'string' ? from : from?.email || FROM_EMAIL,
      toAddress: Array.isArray(to) ? to.join(', ') : to,
      status: 'FAILED',
      provider: 'sendgrid',
      organizationId,
      leadId,
      metadata: {
        error: errorMessage,
      },
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send email using template
 */
export async function sendTemplateEmail(
  templateId: string,
  to: string | string[],
  data: Record<string, unknown>,
  options?: Partial<EmailOptions>
): Promise<EmailResult> {
  try {
    // Get template from database
    const template = await prisma.emailTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error(`Email template ${templateId} not found`);
    }

    if (!template.isActive) {
      throw new Error(`Email template ${templateId} is not active`);
    }

    // Compile template with Handlebars
    const compiledSubject = Handlebars.compile(template.subject);
    const compiledBody = Handlebars.compile(template.body);

    const subject = compiledSubject(data);
    const html = compiledBody(data);

    // Update template usage
    await prisma.emailTemplate.update({
      where: { id: templateId },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    // Send email
    return await sendEmail({
      to,
      subject,
      html,
      organizationId: options?.organizationId || 'clz0000000000000000000000',
      ...options,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage }, '[EMAIL] Template send failed');
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Bulk send emails (for campaigns)
 */
export async function sendBulkEmails(
  emails: Array<{
    to: string;
    subject: string;
    html: string;
    leadId?: string;
  }>,
  campaignId?: string,
  userId?: string,
  organizationId?: string
): Promise<{ success: number; failed: number }> {
  const results = {
    success: 0,
    failed: 0,
  };

  for (const email of emails) {
    const result = await sendEmail({
      ...email,
      campaignId,
      userId,
      organizationId: organizationId || 'clz0000000000000000000000',
      trackOpens: true,
      trackClicks: true,
    });

    if (result.success) {
      results.success++;
    } else {
      results.failed++;
    }

    // Add small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Mock email sending (when SendGrid not configured)
 */
async function mockEmailSend(options: EmailOptions): Promise<EmailResult> {
  const { to, subject, html, text, leadId, organizationId } = options;

  logger.info({ to, subject, bodyPreview: (html || text || '').substring(0, 100) }, '[EMAIL] MOCK MODE - Email not actually sent');

  // #104: Create message record with PENDING status (not DELIVERED) to avoid inflating analytics
  const message = await createMessageRecord({
    type: 'EMAIL',
    direction: 'OUTBOUND',
    subject,
    body: html || text || '',
    fromAddress: FROM_EMAIL,
    toAddress: Array.isArray(to) ? to.join(', ') : to,
    status: 'PENDING', // #104: Mock mode should NOT mark as delivered — prevents inflated analytics
    provider: 'mock',
    organizationId,
    leadId,
    metadata: {
      mockMode: true,
      sentAt: new Date().toISOString(),
    },
  });

  return {
    success: true,
    messageId: `mock_${Date.now()}`, // Always use mock_ prefix for mode detection
  };
}

/**
 * Create message record in database
 */
async function createMessageRecord(data: Record<string, unknown>) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await prisma.message.create({ data: data as any });
  } catch (error) {
    logger.error({ error }, '[EMAIL] Failed to create message record');
    return null;
  }
}

/**
 * Handle SendGrid webhook events (opens, clicks, bounces)
 */
export async function handleWebhookEvent(event: Record<string, unknown>) {
  try {
    const { event: eventType, sg_message_id } = event;

    // Find message by external ID
    const message = await prisma.message.findFirst({
      where: { externalId: String(sg_message_id) },
    });

    if (!message) {
      logger.warn({ sg_message_id }, '[EMAIL] Webhook: Message not found');
      return;
    }

    // Update message status based on event
    switch (eventType) {
      case 'delivered':
        await prisma.message.update({
          where: { id: message.id },
          data: { status: 'DELIVERED' },
        });
        break;

      case 'open':
        await prisma.message.update({
          where: { id: message.id },
          data: { status: 'OPENED', readAt: new Date() },
        });

        // Create activity for email open
        if (message.leadId) {
          const lead = await prisma.lead.findUnique({
            where: { id: message.leadId },
            select: { organizationId: true }
          });
          
          if (lead) {
            await prisma.activity.create({
              data: {
                type: 'EMAIL_OPENED',
                title: 'Email Opened',
                description: `Lead opened email: ${message.subject}`,
                leadId: message.leadId,
                userId: 'system',
                organizationId: lead.organizationId,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                metadata: event as any,
              },
            });
          }
        }
        break;

      case 'click':
        await prisma.message.update({
          where: { id: message.id },
          data: { status: 'CLICKED' },
        });

        // Create activity for email click
        if (message.leadId) {
          const lead = await prisma.lead.findUnique({
            where: { id: message.leadId },
            select: { organizationId: true }
          });
          
          if (lead) {
            await prisma.activity.create({
              data: {
                type: 'EMAIL_CLICKED',
                title: 'Email Link Clicked',
                description: `Lead clicked link in email: ${message.subject}`,
                leadId: message.leadId,
                userId: 'system',
                organizationId: lead.organizationId,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                metadata: event as any,
              },
            });
          }
        }
        break;

      case 'bounce':
      case 'dropped': {
        await prisma.message.update({
          where: { id: message.id },
          data: { status: 'BOUNCED' },
        });

        // #102: Add bounced address to suppression list
        const bouncedEmail = (event.email as string) || message.toAddress;
        if (bouncedEmail && message.organizationId) {
          await suppressEmail(bouncedEmail, message.organizationId, 'bounce');
        }
        break;
      }

      case 'spamreport': {
        await prisma.message.update({
          where: { id: message.id },
          data: { status: 'FAILED', spamComplaintAt: new Date() },
        });

        // #103: Add to suppression list AND opt-out the lead
        const spamEmail = (event.email as string) || message.toAddress;
        if (spamEmail && message.organizationId) {
          await suppressEmail(spamEmail, message.organizationId, 'spamreport');
        }
        if (message.leadId) {
          await prisma.lead.update({
            where: { id: message.leadId },
            data: { emailOptIn: false, emailOptOutAt: new Date(), emailOptOutReason: 'spam_complaint' },
          });
          logger.info({ leadId: message.leadId }, '[EMAIL] Lead opted out due to spam complaint');
        }
        break;
      }

      default:
        logger.info({ eventType }, '[EMAIL] Webhook: Unknown event type');
    }
  } catch (error) {
    logger.error({ error }, '[EMAIL] Webhook processing failed');
  }
}
