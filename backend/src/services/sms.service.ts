/**
 * SMS Service
 * Handles sending SMS via Twilio with tracking and template support
 */

import { logger } from '../lib/logger'
import twilio from 'twilio';
import Handlebars from 'handlebars';
import { prisma } from '../config/database';
import { decryptForUser } from '../utils/encryption';

// Initialize Twilio
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

let twilioClient: ReturnType<typeof twilio> | null = null;

if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

/**
 * Get SMS configuration for a user
 * Falls back to environment variables if no user config exists
 */
async function getSMSConfig(userId?: string) {
  // If no userId provided, use environment variables
  if (!userId) {
    return {
      accountSid: TWILIO_ACCOUNT_SID,
      authToken: TWILIO_AUTH_TOKEN,
      phoneNumber: TWILIO_PHONE_NUMBER,
      client: twilioClient,
      mode: 'environment' as const
    };
  }

  // Try to get user's config from database
  try {
    const config = await prisma.sMSConfig.findUnique({
      where: { userId }
    });

    // If user has config with credentials, use it
    if (config?.accountSid && config?.authToken) {
      try {
        const accountSid = decryptForUser(userId, config.accountSid);
        const authToken = decryptForUser(userId, config.authToken);
        const client = twilio(accountSid, authToken);

        logger.info(`[SMS] Using user's Twilio credentials (userId: ${userId})`);
        
        return {
          accountSid,
          authToken,
          phoneNumber: config.phoneNumber || TWILIO_PHONE_NUMBER,
          client,
          mode: 'database' as const
        };
      } catch (decryptError) {
        logger.error('[SMS] Failed to decrypt user credentials:', decryptError);
        // Fall through to environment variables
      }
    }

    // Fall back to environment variables
    return {
      accountSid: TWILIO_ACCOUNT_SID,
      authToken: TWILIO_AUTH_TOKEN,
      phoneNumber: TWILIO_PHONE_NUMBER,
      client: twilioClient,
      mode: 'environment' as const
    };
  } catch (error) {
    logger.error('Error fetching SMS config:', error);
    // Fall back to environment variables on error
    return {
      accountSid: TWILIO_ACCOUNT_SID,
      authToken: TWILIO_AUTH_TOKEN,
      phoneNumber: TWILIO_PHONE_NUMBER,
      client: twilioClient,
      mode: 'environment' as const
    };
  }
}

export interface SMSOptions {
  to: string;
  message: string;
  leadId?: string;
  campaignId?: string;
  userId?: string; // User ID to fetch custom config
  organizationId: string; // Organization ID for multi-tenancy
  mediaUrl?: string[]; // For MMS
  skipRateLimit?: boolean; // Skip per-phone rate limit (e.g., for system notifications)
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/** Max SMS messages per phone number per day (prevents spam) */
const SMS_PER_PHONE_DAILY_LIMIT = parseInt(process.env.SMS_PER_PHONE_DAILY_LIMIT || '10', 10);

/**
 * Check per-phone-number daily rate limit
 */
async function checkPerPhoneRateLimit(phone: string, organizationId: string): Promise<{ allowed: boolean; sent: number }> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const sent = await prisma.message.count({
    where: {
      type: 'SMS',
      direction: 'OUTBOUND',
      toAddress: phone,
      organizationId,
      createdAt: { gte: startOfDay },
      status: { in: ['SENT', 'PENDING', 'DELIVERED'] },
    },
  });

  return { allowed: sent < SMS_PER_PHONE_DAILY_LIMIT, sent };
}

/**
 * Send an SMS via Twilio
 */
export async function sendSMS(options: SMSOptions): Promise<SMSResult> {
  const { to, message, leadId, campaignId, userId, organizationId, mediaUrl, skipRateLimit } = options;

  try {
    // Check SMS opt-out / suppression before sending (#20)
    if (leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { smsOptOutAt: true, phone: true },
      });
      if (lead?.smsOptOutAt) {
        logger.warn(`[SMS] Lead ${leadId} has opted out of SMS. Blocking send.`);
        return { success: false, error: 'Lead has opted out of SMS communications' };
      }
    }

    // Per-phone-number daily rate limit to prevent SMS spam
    if (!skipRateLimit) {
      const cleanedTo = to.replace(/[\s-()]/g, '');
      const rateCheck = await checkPerPhoneRateLimit(cleanedTo, organizationId);
      if (!rateCheck.allowed) {
        logger.warn(`[SMS] Per-phone daily limit reached for ${cleanedTo} (${rateCheck.sent}/${SMS_PER_PHONE_DAILY_LIMIT})`);
        return { success: false, error: `Daily SMS limit reached for this phone number (${rateCheck.sent}/${SMS_PER_PHONE_DAILY_LIMIT})` };
      }
    }

    // Get SMS configuration (database or environment)
    const config = await getSMSConfig(userId);

    // Check if Twilio is configured
    if (!config.client) {
      logger.warn('[SMS] Twilio not configured, using mock mode');
      return mockSMSSend(options);
    }

    logger.info(`[SMS] Using config from ${config.mode} (userId: ${userId || 'none'})`);

    // Validate phone number format
    const cleanedPhone = to.replace(/[\s-()]/g, '');
    if (!/^\+?[1-9]\d{1,14}$/.test(cleanedPhone)) {
      throw new Error('Invalid phone number format');
    }

    // SMS character limit (160 for standard SMS)
    if (message.length > 1600) {
      // Twilio will split into multiple messages
      logger.warn(`[SMS] Message length (${message.length}) exceeds standard SMS size`);
    }

    // Send SMS via Twilio
    const twilioMessage = await config.client.messages.create({
      body: message,
      to: cleanedPhone,
      from: config.phoneNumber,
      ...(mediaUrl && mediaUrl.length > 0 ? { mediaUrl } : {}),
    });

    logger.info('[SMS] Sent successfully:', {
      to: cleanedPhone,
      messageId: twilioMessage.sid,
    });

    // Create message record in database
    const createdMessage = await createMessageRecord({
      type: 'SMS',
      direction: 'OUTBOUND',
      body: message,
      fromAddress: config.phoneNumber,
      toAddress: cleanedPhone,
      status: twilioMessage.status === 'queued' || twilioMessage.status === 'sent' ? 'SENT' : 'PENDING',
      externalId: twilioMessage.sid,
      provider: 'twilio',
      organizationId,
      leadId,
      metadata: {
        campaignId,
        mediaUrl,
        numSegments: twilioMessage.numSegments,
        configMode: config.mode,
      },
    });

    return {
      success: true,
      messageId: createdMessage?.id || twilioMessage.sid,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[SMS] Send failed:', errorMessage);

    // Get config for error logging (reuse if possible, or fetch again)
    const config = await getSMSConfig(userId);

    // Log failed message
    await createMessageRecord({
      type: 'SMS',
      direction: 'OUTBOUND',
      body: message,
      fromAddress: config.phoneNumber,
      toAddress: to,
      status: 'FAILED',
      provider: 'twilio',
      organizationId,
      leadId,
      metadata: {
        error: errorMessage,
        configMode: config.mode,
      },
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send SMS using template
 */
export async function sendTemplateSMS(
  templateId: string,
  to: string,
  data: Record<string, unknown>,
  options?: Partial<SMSOptions>
): Promise<SMSResult> {
  try {
    // Get template from database
    const template = await prisma.sMSTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error(`SMS template ${templateId} not found`);
    }

    if (!template.isActive) {
      throw new Error(`SMS template ${templateId} is not active`);
    }

    // Compile template with Handlebars
    const compiledBody = Handlebars.compile(template.body);
    const message = compiledBody(data);

    // Update template usage
    await prisma.sMSTemplate.update({
      where: { id: templateId },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    // Send SMS
    return await sendSMS({
      to,
      message,
      organizationId: options?.organizationId || '',
      ...options,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[SMS] Template send failed:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Bulk send SMS messages (for campaigns)
 */
export async function sendBulkSMS(
  messages: Array<{
    to: string;
    message: string;
    leadId?: string;
    mediaUrl?: string[];
  }>,
  campaignId?: string,
  userId?: string,
  organizationId?: string
): Promise<{ success: number; failed: number }> {
  const results = {
    success: 0,
    failed: 0,
  };

  for (const sms of messages) {
    const result = await sendSMS({
      ...sms,
      campaignId,
      userId,
      organizationId: organizationId || '',
    });

    if (result.success) {
      results.success++;
    } else {
      results.failed++;
    }

    // Add delay to avoid rate limiting (Twilio has rate limits)
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second between messages
  }

  return results;
}

/**
 * Mock SMS sending (when Twilio not configured)
 */
async function mockSMSSend(options: SMSOptions): Promise<SMSResult> {
  const { to, message, leadId, organizationId } = options;

  logger.info('[SMS] MOCK MODE - SMS not actually sent:');
  logger.info('To:', to);
  logger.info('Message:', message.substring(0, 100) + (message.length > 100 ? '...' : ''));

  // Create message record
  const smsMessage = await createMessageRecord({
    type: 'SMS',
    direction: 'OUTBOUND',
    body: message,
    fromAddress: TWILIO_PHONE_NUMBER || '+1234567890',
    toAddress: to,
    status: 'SENT', // Mock mode should use SENT, not DELIVERED (#21)
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
    messageId: `mock_sms_${Date.now()}`, // Always use mock_ prefix for mode detection
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
    logger.error('[SMS] Failed to create message record:', error);
    return null;
  }
}

/**
 * Handle Twilio webhook events (delivery status)
 */
export async function handleWebhookEvent(event: Record<string, unknown>) {
  try {
    const { MessageSid, MessageStatus } = event;

    if (!MessageSid) {
      logger.warn('[SMS] Webhook: Missing MessageSid');
      return;
    }

    // Find message by external ID
    const message = await prisma.message.findFirst({
      where: { externalId: MessageSid as string },
    });

    if (!message) {
      logger.warn('[SMS] Webhook: Message not found:', MessageSid);
      return;
    }

    // Update message status based on Twilio status
    let newStatus: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'OPENED' | 'CLICKED';
    switch (MessageStatus) {
      case 'delivered':
        newStatus = 'DELIVERED';
        break;
      case 'sent':
        newStatus = 'SENT';
        break;
      case 'failed':
      case 'undelivered':
        newStatus = 'FAILED';
        break;
      default:
        newStatus = 'PENDING';
    }

    await prisma.message.update({
      where: { id: message.id },
      data: { status: newStatus },
    });

    // Create activity for delivered SMS
    if (newStatus === 'DELIVERED' && message.leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: message.leadId },
        select: { organizationId: true }
      });
      
      if (lead) {
        await prisma.activity.create({
          data: {
            type: 'SMS_DELIVERED',
            title: 'SMS Delivered',
            description: `SMS delivered to lead`,
            leadId: message.leadId,
            userId: 'system',
            organizationId: lead.organizationId,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            metadata: event as any,
          },
        });
      }
    }

    logger.info('[SMS] Webhook processed:', { MessageSid, MessageStatus, newStatus });
  } catch (error) {
    logger.error('[SMS] Webhook processing failed:', error);
  }
}
