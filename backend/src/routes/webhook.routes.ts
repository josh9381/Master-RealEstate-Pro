import { Router } from 'express';
import { prisma } from '../config/database';
import { decrypt } from '../utils/encryption';
import {
  trackEmailOpen,
  trackEmailClick,
} from '../services/campaignAnalytics.service';
import { parseUserAgent } from '../utils/useragent';
import { lookupGeo } from '../utils/geoip';

const router = Router();

/**
 * Handle Twilio SMS webhook - User-specific route (secure)
 * POST /api/webhooks/twilio/sms/:userId
 */
router.post('/twilio/sms/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('[WEBHOOK] Twilio SMS received:', req.body);
    console.log('[WEBHOOK] User ID:', userId);
    
    const { MessageSid, From, To, Body, NumMedia } = req.body;
    
    if (!MessageSid || !From || !To || Body === undefined) {
      console.warn('[WEBHOOK] Missing required fields');
      return res.status(400).send('Missing required fields');
    }
    
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
      console.warn('[WEBHOOK] No config found for user:', userId);
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
    
    console.log('[WEBHOOK] Inbound SMS saved:', message.id);
    
    // Respond to Twilio with TwiML (optional - for auto-reply)
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <!-- Message received successfully -->
</Response>`);
    
  } catch (error) {
    console.error('[WEBHOOK] Error processing SMS:', error);
    // Still return 200 to prevent Twilio from retrying
    res.status(200).send('OK');
  }
});

/**
 * Twilio Status Callback - Updates message delivery status
 * POST /api/webhooks/twilio/status
 */
router.post('/twilio/status', async (req, res) => {
  try {
    console.log('[WEBHOOK] Twilio status update:', req.body);
    
    const { MessageSid, MessageStatus, ErrorCode } = req.body;
    
    if (!MessageSid) {
      return res.status(400).send('Missing MessageSid');
    }
    
    // Find message by externalId (MessageSid)
    const message = await prisma.message.findFirst({
      where: { externalId: MessageSid }
    });
    
    if (!message) {
      console.warn('[WEBHOOK] Message not found:', MessageSid);
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
    
    console.log('[WEBHOOK] Status updated:', { MessageSid, MessageStatus, newStatus });
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('[WEBHOOK] Error updating status:', error);
    res.status(200).send('OK');
  }
});

/**
 * SendGrid Email Webhook - Receives email events (opens, clicks, bounces)
 * POST /api/webhooks/sendgrid
 * 
 * Phase 5.11: Now integrates with campaignAnalytics.service for 
 * lead score updates and campaign counter increments.
 */
router.post('/sendgrid', async (req, res) => {
  try {
    console.log('[WEBHOOK] SendGrid event received');
    
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
        console.warn('[WEBHOOK] Email message not found:', sg_message_id);
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
          break;
        case 'spamreport':
          updates.status = 'FAILED';
          updates.spamComplaintAt = new Date();
          break;
      }
      
      if (Object.keys(updates).length > 0) {
        await prisma.message.update({
          where: { id: message.id },
          data: updates
        });
        
        console.log('[WEBHOOK] Email status updated:', { sg_message_id, eventType });
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
              console.log('[WEBHOOK] Campaign open tracked:', { campaignId, leadId: message.leadId });
              break;

            case 'click':
              await trackEmailClick(
                campaignId,
                message.leadId,
                message.id,
                url || '',
                message.organizationId
              );
              console.log('[WEBHOOK] Campaign click tracked:', { campaignId, leadId: message.leadId });
              break;
          }
        } catch (trackError) {
          // Don't fail the webhook if campaign tracking fails
          console.error('[WEBHOOK] Campaign analytics tracking error:', trackError);
        }
      } else if (campaignId) {
        console.warn('[WEBHOOK] Missing leadId or orgId for campaign tracking:', {
          campaignId,
          leadId: message.leadId,
          orgId: message.organizationId,
        });
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
          console.error('[WEBHOOK] Activity creation error:', activityError);
        }
      }
    }
    
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('[WEBHOOK] Error processing SendGrid event:', error);
    res.status(200).send('OK');
  }
});

export default router;
