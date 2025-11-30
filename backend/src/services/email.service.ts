/**
 * Email Service
 * Handles sending emails via SendGrid with tracking and template support
 */

import sgMail from '@sendgrid/mail';
import Handlebars from 'handlebars';
import { prisma } from '../config/database';
import { decryptForUser } from '../utils/encryption';

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@realestate.com';
const FROM_NAME = process.env.FROM_NAME || 'RealEstate Pro';

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
        console.error('[EMAIL] Failed to decrypt user credentials:', decryptError);
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
    console.error('Error fetching email config:', error);
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
    // Get email configuration (database or environment)
    const config = await getEmailConfig(userId);

    // Check if SendGrid is configured
    if (!config.apiKey) {
      console.warn('[EMAIL] SendGrid API key not configured, using mock mode');
      return mockEmailSend(options);
    }

    // Set API key for this request
    sgMail.setApiKey(config.apiKey);

    console.log(`[EMAIL] Using config from ${config.mode} (userId: ${userId || 'none'})`);

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
    console.log('[EMAIL] Sent successfully:', {
      to,
      subject,
      messageId: response.headers['x-message-id'],
    });

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
    console.error('[EMAIL] Send failed:', errorMessage);

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
    console.error('[EMAIL] Template send failed:', errorMessage);
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
  const { to, subject, html, text, leadId } = options;

  console.log('[EMAIL] MOCK MODE - Email not actually sent:');
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('Body preview:', (html || text || '').substring(0, 100) + '...');

  // Create message record
  const message = await createMessageRecord({
    type: 'EMAIL',
    direction: 'OUTBOUND',
    subject,
    body: html || text || '',
    fromAddress: FROM_EMAIL,
    toAddress: Array.isArray(to) ? to.join(', ') : to,
    status: 'DELIVERED', // Mock mode treats as immediately delivered
    provider: 'mock',
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
    console.error('[EMAIL] Failed to create message record:', error);
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
      console.warn('[EMAIL] Webhook: Message not found:', sg_message_id);
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
      case 'dropped':
        await prisma.message.update({
          where: { id: message.id },
          data: { status: 'BOUNCED' },
        });
        break;

      default:
        console.log('[EMAIL] Webhook: Unknown event type:', eventType);
    }
  } catch (error) {
    console.error('[EMAIL] Webhook processing failed:', error);
  }
}
