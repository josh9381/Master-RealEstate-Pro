import { Router } from 'express';
import { prisma } from '../config/database';
import { decrypt } from '../utils/encryption';

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
 */
router.post('/sendgrid', async (req, res) => {
  try {
    console.log('[WEBHOOK] SendGrid event received');
    
    const events = Array.isArray(req.body) ? req.body : [req.body];
    
    for (const event of events) {
      const { event: eventType, sg_message_id, email } = event;
      
      if (!sg_message_id) continue;
      
      // Find message by externalId
      const message = await prisma.message.findFirst({
        where: { externalId: sg_message_id }
      });
      
      if (!message) {
        console.warn('[WEBHOOK] Email message not found:', sg_message_id);
        continue;
      }
      
      // Update based on event type
      const updates: any = {};
      
      switch (eventType) {
        case 'delivered':
          updates.status = 'DELIVERED';
          updates.deliveredAt = new Date();
          break;
        case 'open':
          updates.status = 'OPENED';
          updates.openedAt = new Date();
          break;
        case 'click':
          updates.status = 'CLICKED';
          updates.clickedAt = new Date();
          break;
        case 'bounce':
        case 'dropped':
          updates.status = 'BOUNCED';
          updates.bouncedAt = new Date();
          break;
        case 'spamreport':
          updates.status = 'FAILED';
          break;
      }
      
      if (Object.keys(updates).length > 0) {
        await prisma.message.update({
          where: { id: message.id },
          data: updates
        });
        
        console.log('[WEBHOOK] Email status updated:', { sg_message_id, eventType });
      }
    }
    
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('[WEBHOOK] Error processing SendGrid event:', error);
    res.status(200).send('OK');
  }
});

export default router;
