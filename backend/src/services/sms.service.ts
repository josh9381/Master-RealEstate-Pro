/**
 * SMS Service
 * Handles sending SMS via Twilio with tracking and template support
 */

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

        console.log(`[SMS] Using user's Twilio credentials (userId: ${userId})`);
        
        return {
          accountSid,
          authToken,
          phoneNumber: config.phoneNumber || TWILIO_PHONE_NUMBER,
          client,
          mode: 'database' as const
        };
      } catch (decryptError) {
        console.error('[SMS] Failed to decrypt user credentials:', decryptError);
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
    console.error('Error fetching SMS config:', error);
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
  mediaUrl?: string[]; // For MMS
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an SMS via Twilio
 */
export async function sendSMS(options: SMSOptions): Promise<SMSResult> {
  const { to, message, leadId, campaignId, userId, mediaUrl } = options;

  try {
    // Get SMS configuration (database or environment)
    const config = await getSMSConfig(userId);

    // Check if Twilio is configured
    if (!config.client) {
      console.warn('[SMS] Twilio not configured, using mock mode');
      return mockSMSSend(options);
    }

    console.log(`[SMS] Using config from ${config.mode} (userId: ${userId || 'none'})`);

    // Validate phone number format
    const cleanedPhone = to.replace(/[\s-()]/g, '');
    if (!/^\+?[1-9]\d{1,14}$/.test(cleanedPhone)) {
      throw new Error('Invalid phone number format');
    }

    // SMS character limit (160 for standard SMS)
    if (message.length > 1600) {
      // Twilio will split into multiple messages
      console.warn(`[SMS] Message length (${message.length}) exceeds standard SMS size`);
    }

    // Send SMS via Twilio
    const twilioMessage = await config.client.messages.create({
      body: message,
      to: cleanedPhone,
      from: config.phoneNumber,
      ...(mediaUrl && mediaUrl.length > 0 ? { mediaUrl } : {}),
    });

    console.log('[SMS] Sent successfully:', {
      to: cleanedPhone,
      messageId: twilioMessage.sid,
    });

    // Create message record in database
    await createMessageRecord({
      type: 'SMS',
      direction: 'OUTBOUND',
      body: message,
      fromAddress: config.phoneNumber,
      toAddress: cleanedPhone,
      status: twilioMessage.status === 'queued' || twilioMessage.status === 'sent' ? 'SENT' : 'PENDING',
      externalId: twilioMessage.sid,
      provider: 'twilio',
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
      messageId: twilioMessage.sid,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SMS] Send failed:', errorMessage);

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
      ...options,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SMS] Template send failed:', errorMessage);
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
  }>,
  campaignId?: string,
  userId?: string
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
  const { to, message, leadId } = options;

  console.log('[SMS] MOCK MODE - SMS not actually sent:');
  console.log('To:', to);
  console.log('Message:', message.substring(0, 100) + (message.length > 100 ? '...' : ''));

  // Create message record
  const smsMessage = await createMessageRecord({
    type: 'SMS',
    direction: 'OUTBOUND',
    body: message,
    fromAddress: TWILIO_PHONE_NUMBER || '+1234567890',
    toAddress: to,
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
    console.error('[SMS] Failed to create message record:', error);
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
      console.warn('[SMS] Webhook: Missing MessageSid');
      return;
    }

    // Find message by external ID
    const message = await prisma.message.findFirst({
      where: { externalId: MessageSid as string },
    });

    if (!message) {
      console.warn('[SMS] Webhook: Message not found:', MessageSid);
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
      await prisma.activity.create({
        data: {
          type: 'SMS_DELIVERED',
          title: 'SMS Delivered',
          description: `SMS delivered to lead`,
          leadId: message.leadId,
          userId: 'system',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadata: event as any,
        },
      });
    }

    console.log('[SMS] Webhook processed:', { MessageSid, MessageStatus, newStatus });
  } catch (error) {
    console.error('[SMS] Webhook processing failed:', error);
  }
}
