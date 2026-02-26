import { Router } from 'express';
import { prisma } from '../config/database';
import { decrypt } from '../utils/encryption';
import {
  trackEmailOpen,
  trackEmailClick,
} from '../services/campaignAnalytics.service';
import { suppressEmail } from '../services/email.service';
import { parseUserAgent } from '../utils/useragent';
import { lookupGeo } from '../utils/geoip';
import { webhookLimiter } from '../middleware/rateLimiter';
import { verifyTwilioSignature, verifySendGridSignature } from '../middleware/webhookAuth';
import { logger } from '../lib/logger';
import {
  twilioSmsWebhookSchema,
  twilioStatusWebhookSchema,
  sendgridWebhookSchema,
  sendgridInboundSchema,
} from '../validators/webhook.validator';

const router = Router();

// Apply webhook rate limiter to all webhook routes (#90)
router.use(webhookLimiter);

/** Extract bare email address from "Display Name <email@domain.com>" or plain "email@domain.com" */
function parseEmailAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return match ? match[1].trim().toLowerCase() : raw.trim().toLowerCase();
}

/** Create a notification for a user in an org about an inbound message */
async function createInboundNotification(
  userId: string,
  organizationId: string,
  type: 'INBOUND_EMAIL' | 'INBOUND_SMS',
  title: string,
  message: string,
  link = '/communication'
): Promise<void> {
  await prisma.notification.create({
    data: {
      id: `notif_inbound_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      userId,
      organizationId,
      type,
      title,
      message,
      link,
    },
  });
}

/**
 * Handle Twilio SMS webhook - User-specific route (secure)
 * POST /api/webhooks/twilio/sms/:userId
 * #95: Zod-validated. #96: Signature-verified.
 */
router.post('/twilio/sms/:userId', verifyTwilioSignature, async (req, res) => {
  try {
    // Validate payload shape (#95)
    const parseResult = twilioSmsWebhookSchema.safeParse(req.body);
    if (!parseResult.success) {
      logger.warn({ issues: parseResult.error.issues }, '[WEBHOOK] Invalid Twilio SMS payload');
      return res.status(400).send('Invalid payload');
    }

    const { userId } = req.params;
    logger.info({ body: req.body }, '[WEBHOOK] Twilio SMS received');
    logger.info({ userId }, '[WEBHOOK] Twilio SMS user');
    
    const { MessageSid, From, To, Body, NumMedia } = parseResult.data;
    
    // Find SMS config for this user
    const config = await prisma.sMSConfig.findUnique({
      where: { 
        userId,
        isActive: true
      },
      include: {
        user: {
          select: {
            organizationId: true
          }
        }
      }
    });
    
    if (!config) {
      logger.warn({ userId }, '[WEBHOOK] No config found for user');
      return res.status(404).send('User configuration not found');
    }
    
    // Try to find if this is from an existing lead
    const lead = await prisma.lead.findFirst({
      where: {
        phone: From
      }
    });
    
    // Create inbound message
    const message = await prisma.message.create({
      data: {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: 'SMS',
        direction: 'INBOUND',
        status: 'DELIVERED',
        fromAddress: From,
        toAddress: To,
        body: Body,
        leadId: lead?.id || null,
        organizationId: lead?.organizationId || config.user?.organizationId || 'clz0000000000000000000000',
        threadId: MessageSid, // Use MessageSid as thread ID for grouping
        externalId: MessageSid,
        provider: 'twilio',
        metadata: {
          numMedia: NumMedia || '0',
          webhook: true,
          userId: config.userId
        }
      }
    });
    
    logger.info({ messageId: message.id }, '[WEBHOOK] Inbound SMS saved');

    // Create notification for the user who owns this SMS config (#83)
    try {
      const leadName = lead
        ? `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim() || From
        : From;
      const orgId = lead?.organizationId || config.user?.organizationId;
      if (orgId && orgId !== 'clz0000000000000000000000') {
        await createInboundNotification(
          config.userId,
          orgId,
          'INBOUND_SMS',
          `New SMS from ${leadName}`,
          Body.length > 100 ? Body.substring(0, 97) + '…' : Body,
        );
      }
    } catch (notifErr) {
      logger.error({ error: notifErr }, '[WEBHOOK] Failed to create SMS notification');
    }

    // Respond to Twilio with TwiML (optional - for auto-reply)
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <!-- Message received successfully -->
</Response>`);
    
  } catch (error) {
    logger.error({ error }, '[WEBHOOK] Error processing SMS');
    // Still return 200 to prevent Twilio from retrying
    res.status(200).send('OK');
  }
});

/**
 * Twilio Status Callback - Updates message delivery status
 * POST /api/webhooks/twilio/status
 * #95: Zod-validated. #96: Signature-verified.
 */
router.post('/twilio/status', verifyTwilioSignature, async (req, res) => {
  try {
    // Validate payload shape (#95)
    const parseResult = twilioStatusWebhookSchema.safeParse(req.body);
    if (!parseResult.success) {
      logger.warn({ issues: parseResult.error.issues }, '[WEBHOOK] Invalid Twilio status payload');
      return res.status(400).send('Invalid payload');
    }

    logger.info({ body: req.body }, '[WEBHOOK] Twilio status update');
    
    const { MessageSid, MessageStatus, ErrorCode } = parseResult.data;
    
    // Find message by externalId (MessageSid)
    const message = await prisma.message.findFirst({
      where: { externalId: MessageSid }
    });
    
    if (!message) {
      logger.warn({ MessageSid }, '[WEBHOOK] Message not found');
      return res.status(200).send('OK');
    }
    
    // Map Twilio status to our status
    let newStatus: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED' = 'SENT';
    let deliveredAt = null;
    let failedAt = null;
    
    switch (MessageStatus) {
      case 'delivered':
        newStatus = 'DELIVERED';
        deliveredAt = new Date();
        break;
      case 'sent':
        newStatus = 'SENT';
        break;
      case 'failed':
      case 'undelivered':
        newStatus = 'FAILED';
        failedAt = new Date();
        break;
      default:
        newStatus = 'PENDING';
    }
    
    // Update message status
    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: newStatus,
        ...(deliveredAt && { deliveredAt }),
        ...(failedAt && { failedAt }),
        ...(ErrorCode && { 
          metadata: {
            ...((message.metadata as any) || {}),
            errorCode: ErrorCode
          }
        })
      }
    });
    
    logger.info({ MessageSid, MessageStatus, newStatus }, '[WEBHOOK] Status updated');
    res.status(200).send('OK');
    
  } catch (error) {
    logger.error({ error }, '[WEBHOOK] Error updating status');
    res.status(200).send('OK');
  }
});

/**
 * SendGrid Email Webhook - Receives email events (opens, clicks, bounces)
 * POST /api/webhooks/sendgrid
 * #95: Zod-validated. #96: Signature-verified.
 * 
 * Phase 5.11: Now integrates with campaignAnalytics.service for 
 * lead score updates and campaign counter increments.
 */
router.post('/sendgrid', verifySendGridSignature, async (req, res) => {
  try {
    // Validate payload shape (#95)
    const parseResult = sendgridWebhookSchema.safeParse(req.body);
    if (!parseResult.success) {
      logger.warn({ issues: parseResult.error.issues }, '[WEBHOOK] Invalid SendGrid payload');
      return res.status(400).send('Invalid payload');
    }

    logger.info('[WEBHOOK] SendGrid event received');
    
    const events = Array.isArray(req.body) ? req.body : [req.body];
    
    for (const event of events) {
      const { event: eventType, sg_message_id, email, url } = event;
      
      if (!sg_message_id) continue;

      // Phase 8.9: Parse device/geo info from SendGrid event data
      // SendGrid includes useragent and ip in open/click events
      const userAgent = event.useragent || event.user_agent || null;
      const ip = event.ip || null;
      let deviceInfo: { deviceType: string; browser: string; os: string } | null = null;
      let geoInfo: { country: string; region: string; city: string } | null = null;

      if (eventType === 'open' || eventType === 'click') {
        if (userAgent) {
          deviceInfo = parseUserAgent(userAgent);
        }
        if (ip) {
          geoInfo = lookupGeo(ip);
        }
      }
      
      // Find message by externalId
      const message = await prisma.message.findFirst({
        where: { externalId: sg_message_id },
        select: {
          id: true,
          leadId: true,
          organizationId: true,
          metadata: true,
          status: true,
        },
      });
      
      if (!message) {
        logger.warn({ sg_message_id }, '[WEBHOOK] Email message not found');
        continue;
      }
      
      // Update message status based on event type
      const updates: any = {};
      
      switch (eventType) {
        case 'delivered':
          updates.status = 'DELIVERED';
          updates.deliveredAt = new Date();
          break;
        case 'open':
          updates.status = 'OPENED';
          updates.readAt = new Date();
          break;
        case 'click':
          updates.status = 'CLICKED';
          break;
        case 'bounce':
        case 'dropped':
          updates.status = 'BOUNCED';
          updates.bouncedAt = new Date();
          // #102: Add bounced address to suppression list
          if (email && message.organizationId) {
            try { await suppressEmail(email, message.organizationId, 'bounce'); } catch (e) {
              logger.error({ error: e, email }, '[WEBHOOK] Failed to suppress bounced email');
            }
          }
          break;
        case 'spamreport':
          updates.status = 'FAILED';
          updates.spamComplaintAt = new Date();
          // #103: Add to suppression list AND opt-out the lead
          if (email && message.organizationId) {
            try { await suppressEmail(email, message.organizationId, 'spamreport'); } catch (e) {
              logger.error({ error: e, email }, '[WEBHOOK] Failed to suppress spam-reported email');
            }
          }
          if (message.leadId) {
            try {
              await prisma.lead.update({
                where: { id: message.leadId },
                data: { emailOptIn: false, emailOptOutAt: new Date(), emailOptOutReason: 'spam_complaint' },
              });
            } catch (e) {
              logger.error({ error: e, leadId: message.leadId }, '[WEBHOOK] Failed to opt-out lead after spam report');
            }
          }
          break;
      }
      
      if (Object.keys(updates).length > 0) {
        await prisma.message.update({
          where: { id: message.id },
          data: updates
        });
        
        logger.info({ sg_message_id, eventType }, '[WEBHOOK] Email status updated');
      }

      // Phase 5.11: Wire to campaign analytics tracking
      // Check if this message is associated with a campaign via Activity records or metadata
      const metadata = (message.metadata as Record<string, any>) || {};
      const campaignId = metadata?.campaignId;

      if (campaignId && message.leadId && message.organizationId) {
        try {
          switch (eventType) {
            case 'open':
              await trackEmailOpen(
                campaignId,
                message.leadId,
                message.id,
                message.organizationId
              );
              logger.info({ campaignId, leadId: message.leadId }, '[WEBHOOK] Campaign open tracked');
              break;

            case 'click':
              await trackEmailClick(
                campaignId,
                message.leadId,
                message.id,
                url || '',
                message.organizationId
              );
              logger.info({ campaignId, leadId: message.leadId }, '[WEBHOOK] Campaign click tracked');
              break;
          }
        } catch (trackError) {
          // Don't fail the webhook if campaign tracking fails
          logger.error({ error: trackError }, '[WEBHOOK] Campaign analytics tracking error');
        }
      } else if (campaignId) {
        logger.warn({ campaignId, leadId: message.leadId, orgId: message.organizationId }, '[WEBHOOK] Missing leadId or orgId for campaign tracking');
      }

      // Phase 8.9: Store device/geo data as Activity metadata
      if ((eventType === 'open' || eventType === 'click') && message.organizationId) {
        try {
          await prisma.activity.create({
            data: {
              id: `act_webhook_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
              type: eventType === 'open' ? 'EMAIL_OPENED' : 'EMAIL_CLICKED',
              title: eventType === 'open' ? 'Email Opened' : 'Email Link Clicked',
              description: eventType === 'open'
                ? `Email opened${deviceInfo ? ` on ${deviceInfo.deviceType}` : ''}${geoInfo && geoInfo.country !== 'Unknown' ? ` from ${geoInfo.country}` : ''}`
                : `Email link clicked: ${url || 'unknown'}`,
              organizationId: message.organizationId,
              leadId: message.leadId || undefined,
              metadata: {
                messageId: message.id,
                campaignId: campaignId || null,
                eventType,
                email: email || null,
                url: url || null,
                ...(deviceInfo && {
                  deviceType: deviceInfo.deviceType,
                  browser: deviceInfo.browser,
                  os: deviceInfo.os,
                }),
                ...(geoInfo && {
                  country: geoInfo.country,
                  region: geoInfo.region,
                  city: geoInfo.city,
                }),
                ...(ip && { ip }),
              },
            },
          });
        } catch (activityError) {
          // Don't fail webhook if activity creation fails
          logger.error({ error: activityError }, '[WEBHOOK] Activity creation error');
        }
      }
    }
    
    res.status(200).send('OK');
    
  } catch (error) {
    logger.error({ error }, '[WEBHOOK] Error processing SendGrid event');
    res.status(200).send('OK');
  }
});

/**
 * SendGrid Inbound Parse webhook — receives emails sent to the app's inbound email address
 * POST /api/webhooks/sendgrid/inbound
 * #95: Zod-validated.
 *
 * SendGrid sends form-encoded fields:
 *   from     — sender "Display Name <email@domain.com>" or plain "email@domain.com"
 *   to       — recipient email address
 *   subject  — email subject
 *   text     — plain-text body
 *   html     — html body (fallback when text is empty)
 *   envelope — JSON string { from: string, to: string[] }
 *
 * #79: Store inbound email as Message (direction INBOUND)
 * #83: Create Notification for the recipient user
 */
router.post('/sendgrid/inbound', async (req, res) => {
  // Always respond 200 quickly so SendGrid doesn't retry
  res.status(200).send('OK');

  try {
    // Validate payload (#95)
    const parseResult = sendgridInboundSchema.safeParse(req.body);
    if (!parseResult.success) {
      logger.warn({ issues: parseResult.error.issues }, '[WEBHOOK] Invalid SendGrid inbound payload');
      return;
    }

    const { from, to, subject, text, html } = parseResult.data;

    const senderEmail = parseEmailAddress(from);
    const recipientEmail = parseEmailAddress(to);

    // Extract display name from "Name <email>" or fall back to email
    const senderName = from.match(/^(.+?)\s*</) ? from.match(/^(.+?)\s*</)?.[1]?.trim() || senderEmail : senderEmail;

    const body = text.trim() || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '(empty)';

    if (!senderEmail) {
      logger.warn('[WEBHOOK] SendGrid inbound: missing from address');
      return;
    }

    // 1. Find lead by sender email
    const lead = await prisma.lead.findFirst({
      where: { email: senderEmail },
      select: { id: true, organizationId: true, firstName: true, lastName: true },
    });

    // 2. Find the recipient user via their EmailConfig or by email address match
    const emailConfig = await prisma.emailConfig.findFirst({
      where: { fromEmail: recipientEmail },
      include: { user: { select: { id: true, organizationId: true } } },
    });

    // Fall back: find a user whose own email matches the recipient
    const userByEmail = !emailConfig
      ? await prisma.user.findFirst({
          where: { email: recipientEmail },
          select: { id: true, organizationId: true },
        })
      : null;

    const recipientUser = emailConfig?.user || userByEmail;
    const organizationId = lead?.organizationId || recipientUser?.organizationId;

    if (!organizationId) {
      logger.warn({ senderEmail, recipientEmail }, '[WEBHOOK] SendGrid inbound: cannot resolve organizationId');
      return;
    }

    // 3. Create inbound Message record
    const message = await prisma.message.create({
      data: {
        id: `msg_inbound_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        type: 'EMAIL',
        direction: 'INBOUND',
        status: 'DELIVERED',
        fromAddress: senderEmail,
        toAddress: recipientEmail,
        subject,
        body,
        leadId: lead?.id || null,
        organizationId,
        provider: 'sendgrid',
        metadata: {
          webhook: true,
          inbound: true,
          senderName,
        },
      },
    });

    logger.info({ messageId: message.id, from: senderEmail, to: recipientEmail, subject }, '[WEBHOOK] Inbound email saved');

    // 4. Create Notification for the recipient user (#83)
    if (recipientUser?.id) {
      try {
        const leadName = lead
          ? `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim() || senderName
          : senderName;
        await createInboundNotification(
          recipientUser.id,
          organizationId,
          'INBOUND_EMAIL',
          `New email from ${leadName}`,
          body.length > 120 ? body.substring(0, 117) + '…' : body,
        );
      } catch (notifErr) {
        logger.error({ error: notifErr }, '[WEBHOOK] Failed to create email notification');
      }
    }
  } catch (error) {
    logger.error({ error }, '[WEBHOOK] Error processing SendGrid inbound email');
  }
});

export default router;
