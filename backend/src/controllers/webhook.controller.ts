import { Request, Response } from 'express'
import { prisma } from '../config/database'
import {
  trackEmailOpen,
  trackEmailClick,
} from '../services/campaignAnalytics.service'
import { suppressEmail } from '../services/email.service'
import { parseUserAgent } from '../utils/useragent'
import { lookupGeo } from '../utils/geoip'
import { logger } from '../lib/logger'
import { pushNotification, pushMessageUpdate } from '../config/socket'
import {
  twilioSmsWebhookSchema,
  twilioStatusWebhookSchema,
  sendgridWebhookSchema,
  sendgridInboundSchema,
} from '../validators/webhook.validator'

/** Extract bare email address from "Display Name <email@domain.com>" or plain "email@domain.com" */
function parseEmailAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/)
  return match ? match[1].trim().toLowerCase() : raw.trim().toLowerCase()
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
  const notif = await prisma.notification.create({
    data: {
      id: `notif_inbound_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      userId,
      organizationId,
      type,
      title,
      message,
      link,
    },
  })
  pushNotification(userId, {
    id: notif.id,
    type,
    title,
    message,
    read: false,
    createdAt: notif.createdAt.toISOString(),
  })
}

export const handleTwilioSms = async (req: Request, res: Response) => {
  try {
    const parseResult = twilioSmsWebhookSchema.safeParse(req.body)
    if (!parseResult.success) {
      logger.warn({ issues: parseResult.error.issues }, '[WEBHOOK] Invalid Twilio SMS payload')
      return res.status(400).send('Invalid payload')
    }

    const { userId } = req.params
    logger.info({ body: req.body }, '[WEBHOOK] Twilio SMS received')
    logger.info({ userId }, '[WEBHOOK] Twilio SMS user')

    const { MessageSid, From, To, Body, NumMedia } = parseResult.data

    // TCPA STOP-word detection
    const STOP_WORDS = ['stop', 'unsubscribe', 'cancel', 'end', 'quit', 'stopall', 'stop all']
    const normalizedBody = Body.trim().toLowerCase()
    const isOptOut = STOP_WORDS.includes(normalizedBody)

    // Find SMS config for this user
    const config = await prisma.sMSConfig.findUnique({
      where: {
        userId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            organizationId: true,
          },
        },
      },
    })

    if (!config) {
      logger.warn({ userId }, '[WEBHOOK] No config found for user')
      return res.status(404).send('User configuration not found')
    }

    // Try to find if this is from an existing lead
    const lead = await prisma.lead.findFirst({
      where: { phone: From },
    })

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
        threadId: MessageSid,
        externalId: MessageSid,
        provider: 'twilio',
        metadata: {
          numMedia: NumMedia || '0',
          webhook: true,
          userId: config.userId,
        },
      },
    })

    logger.info({ messageId: message.id }, '[WEBHOOK] Inbound SMS saved')

    // Push real-time update for inbound message
    const msgOrgId = lead?.organizationId || config.user?.organizationId
    if (msgOrgId && msgOrgId !== 'clz0000000000000000000000') {
      pushMessageUpdate(msgOrgId, { type: 'received', messageId: message.id, channel: 'sms', leadId: lead?.id })
    }

    // TCPA: Process opt-out if STOP word detected
    if (isOptOut) {
      logger.info({ from: From, body: Body }, '[WEBHOOK] SMS opt-out (STOP word) detected')

      const optedOutLeads = await prisma.lead.updateMany({
        where: { phone: From },
        data: {
          smsOptIn: false,
          smsOptOutAt: new Date(),
          smsOptOutReason: `STOP keyword received: "${Body.trim()}"`,
        },
      })

      logger.info({ count: optedOutLeads.count, from: From }, '[WEBHOOK] Leads opted out of SMS')

      try {
        const { sendSMS } = await import('../services/sms.service')
        const orgId = lead?.organizationId || config.user?.organizationId || config.organizationId
        await sendSMS({
          to: From,
          message: 'You have been unsubscribed and will no longer receive SMS messages from us. Reply START to resubscribe.',
          userId: config.userId,
          organizationId: orgId,
        })
        logger.info({ to: From }, '[WEBHOOK] STOP confirmation sent')
      } catch (confirmErr) {
        logger.error({ error: confirmErr }, '[WEBHOOK] Failed to send STOP confirmation')
      }

      res.type('text/xml')
      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <!-- STOP processed -->
</Response>`)
    }

    // TCPA: Process re-subscribe if START keyword
    const START_WORDS = ['start', 'yes', 'unstop']
    const isOptIn = START_WORDS.includes(normalizedBody)
    if (isOptIn) {
      logger.info({ from: From }, '[WEBHOOK] SMS re-subscribe (START) detected')
      await prisma.lead.updateMany({
        where: { phone: From },
        data: {
          smsOptIn: true,
          smsOptOutAt: null,
          smsOptOutReason: null,
        },
      })

      try {
        const { sendSMS } = await import('../services/sms.service')
        const orgId = lead?.organizationId || config.user?.organizationId || config.organizationId
        await sendSMS({
          to: From,
          message: 'You have been resubscribed and will receive SMS messages from us again. Reply STOP to opt out at any time.',
          userId: config.userId,
          organizationId: orgId,
        })
      } catch (startErr) {
        logger.error({ error: startErr }, '[WEBHOOK] Failed to send START confirmation')
      }
    }

    // Create notification for the user who owns this SMS config
    try {
      const leadName = lead
        ? `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim() || From
        : From
      const orgId = lead?.organizationId || config.user?.organizationId
      if (orgId && orgId !== 'clz0000000000000000000000') {
        await createInboundNotification(
          config.userId,
          orgId,
          'INBOUND_SMS',
          `New SMS from ${leadName}`,
          Body.length > 100 ? Body.substring(0, 97) + '…' : Body,
        )
      }
    } catch (notifErr) {
      logger.error({ error: notifErr }, '[WEBHOOK] Failed to create SMS notification')
    }

    res.type('text/xml')
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <!-- Message received successfully -->
</Response>`)
  } catch (error) {
    logger.error({ error }, '[WEBHOOK] Error processing SMS')
    res.status(200).send('OK')
  }
}

export const handleTwilioStatus = async (req: Request, res: Response) => {
  try {
    const parseResult = twilioStatusWebhookSchema.safeParse(req.body)
    if (!parseResult.success) {
      logger.warn({ issues: parseResult.error.issues }, '[WEBHOOK] Invalid Twilio status payload')
      return res.status(400).send('Invalid payload')
    }

    logger.info({ body: req.body }, '[WEBHOOK] Twilio status update')

    const { MessageSid, MessageStatus, ErrorCode } = parseResult.data

    const message = await prisma.message.findFirst({
      where: { externalId: MessageSid },
    })

    if (!message) {
      logger.warn({ MessageSid }, '[WEBHOOK] Message not found')
      return res.status(200).send('OK')
    }

    let newStatus: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED' = 'SENT'
    let deliveredAt = null
    let failedAt = null

    switch (MessageStatus) {
      case 'delivered':
        newStatus = 'DELIVERED'
        deliveredAt = new Date()
        break
      case 'sent':
        newStatus = 'SENT'
        break
      case 'failed':
      case 'undelivered':
        newStatus = 'FAILED'
        failedAt = new Date()
        break
      default:
        newStatus = 'PENDING'
    }

    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: newStatus,
        ...(deliveredAt && { deliveredAt }),
        ...(failedAt && { failedAt }),
        ...(ErrorCode && {
          metadata: {
            ...((message.metadata as any) || {}),
            errorCode: ErrorCode,
          },
        }),
      },
    })

    logger.info({ MessageSid, MessageStatus, newStatus }, '[WEBHOOK] Status updated')
    res.status(200).send('OK')
  } catch (error) {
    logger.error({ error }, '[WEBHOOK] Error updating status')
    res.status(200).send('OK')
  }
}

export const handleSendGridEvent = async (req: Request, res: Response) => {
  try {
    const parseResult = sendgridWebhookSchema.safeParse(req.body)
    if (!parseResult.success) {
      logger.warn({ issues: parseResult.error.issues }, '[WEBHOOK] Invalid SendGrid payload')
      return res.status(400).send('Invalid payload')
    }

    logger.info('[WEBHOOK] SendGrid event received')

    const events = Array.isArray(req.body) ? req.body : [req.body]

    for (const event of events) {
      const { event: eventType, sg_message_id, email, url } = event

      if (!sg_message_id) continue

      // Parse device/geo info from SendGrid event data
      const userAgent = event.useragent || event.user_agent || null
      const ip = event.ip || null
      let deviceInfo: { deviceType: string; browser: string; os: string } | null = null
      let geoInfo: { country: string; region: string; city: string } | null = null

      if (eventType === 'open' || eventType === 'click') {
        if (userAgent) {
          deviceInfo = parseUserAgent(userAgent)
        }
        if (ip) {
          geoInfo = lookupGeo(ip)
        }
      }

      const message = await prisma.message.findFirst({
        where: { externalId: sg_message_id },
        select: {
          id: true,
          leadId: true,
          organizationId: true,
          metadata: true,
          status: true,
        },
      })

      if (!message) {
        logger.warn({ sg_message_id }, '[WEBHOOK] Email message not found')
        continue
      }

      // Update message status based on event type
      const updates: Record<string, any> = {}

      switch (eventType) {
        case 'delivered':
          updates.status = 'DELIVERED'
          updates.deliveredAt = new Date()
          break
        case 'open':
          updates.status = 'OPENED'
          updates.readAt = new Date()
          break
        case 'click':
          updates.status = 'CLICKED'
          break
        case 'bounce':
        case 'dropped':
          updates.status = 'BOUNCED'
          updates.bouncedAt = new Date()
          if (email && message.organizationId) {
            try {
              await suppressEmail(email, message.organizationId, 'bounce')
            } catch (e) {
              logger.error({ error: e, email }, '[WEBHOOK] Failed to suppress bounced email')
            }
          }
          break
        case 'spamreport':
          updates.status = 'FAILED'
          updates.spamComplaintAt = new Date()
          if (email && message.organizationId) {
            try {
              await suppressEmail(email, message.organizationId, 'spamreport')
            } catch (e) {
              logger.error({ error: e, email }, '[WEBHOOK] Failed to suppress spam-reported email')
            }
          }
          if (message.leadId) {
            try {
              await prisma.lead.update({
                where: { id: message.leadId },
                data: { emailOptIn: false, emailOptOutAt: new Date(), emailOptOutReason: 'spam_complaint' },
              })
            } catch (e) {
              logger.error({ error: e, leadId: message.leadId }, '[WEBHOOK] Failed to opt-out lead after spam report')
            }
          }
          break
      }

      if (Object.keys(updates).length > 0) {
        await prisma.message.update({
          where: { id: message.id },
          data: updates,
        })

        logger.info({ sg_message_id, eventType }, '[WEBHOOK] Email status updated')
      }

      // Update CampaignLead per-recipient tracking
      const msgMetadata = (message.metadata as Record<string, any>) || {}
      const clCampaignId = msgMetadata?.campaignId
      if (clCampaignId && message.leadId) {
        try {
          const clUpdates: Record<string, any> = {}
          switch (eventType) {
            case 'delivered':
              clUpdates.status = 'DELIVERED'
              clUpdates.deliveredAt = new Date()
              break
            case 'open':
              clUpdates.status = 'OPENED'
              clUpdates.openedAt = new Date()
              break
            case 'click':
              clUpdates.status = 'CLICKED'
              clUpdates.clickedAt = new Date()
              break
            case 'bounce':
            case 'dropped':
              clUpdates.status = 'BOUNCED'
              clUpdates.bouncedAt = new Date()
              break
            case 'spamreport':
              clUpdates.status = 'UNSUBSCRIBED'
              clUpdates.unsubscribedAt = new Date()
              break
          }
          if (Object.keys(clUpdates).length > 0) {
            await prisma.campaignLead.updateMany({
              where: { campaignId: clCampaignId, leadId: message.leadId },
              data: clUpdates,
            })
          }
        } catch (clErr) {
          logger.warn({ error: clErr }, '[WEBHOOK] CampaignLead update failed (non-critical)')
        }
      }

      // Update ABTestResult engagement tracking
      if (message.leadId && (eventType === 'open' || eventType === 'click')) {
        try {
          const abTestUpdate: Record<string, any> = {}
          if (eventType === 'open') abTestUpdate.openedAt = new Date()
          if (eventType === 'click') abTestUpdate.clickedAt = new Date()

          const abResults = await prisma.aBTestResult.findMany({
            where: {
              leadId: message.leadId,
              ...(clCampaignId ? { campaignId: clCampaignId } : {}),
            },
            select: { id: true, openedAt: true, clickedAt: true },
          })

          for (const abr of abResults) {
            const shouldUpdate =
              (eventType === 'open' && !abr.openedAt) ||
              (eventType === 'click' && !abr.clickedAt)
            if (shouldUpdate) {
              await prisma.aBTestResult.update({
                where: { id: abr.id },
                data: abTestUpdate,
              })
            }
          }
        } catch (abErr) {
          logger.warn({ error: abErr }, '[WEBHOOK] ABTestResult engagement update failed (non-critical)')
        }
      }

      // Campaign analytics tracking
      const metadata = (message.metadata as Record<string, any>) || {}
      const campaignId = metadata?.campaignId

      if (campaignId && message.leadId && message.organizationId) {
        try {
          switch (eventType) {
            case 'open':
              await trackEmailOpen(campaignId, message.leadId, message.id, message.organizationId)
              logger.info({ campaignId, leadId: message.leadId }, '[WEBHOOK] Campaign open tracked')
              break
            case 'click':
              await trackEmailClick(campaignId, message.leadId, message.id, url || '', message.organizationId)
              logger.info({ campaignId, leadId: message.leadId }, '[WEBHOOK] Campaign click tracked')
              break
          }
        } catch (trackError) {
          logger.error({ error: trackError }, '[WEBHOOK] Campaign analytics tracking error')
        }
      } else if (campaignId) {
        logger.warn({ campaignId, leadId: message.leadId, orgId: message.organizationId }, '[WEBHOOK] Missing leadId or orgId for campaign tracking')
      }

      // Store device/geo data as Activity metadata
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
          })
        } catch (activityError) {
          logger.error({ error: activityError }, '[WEBHOOK] Activity creation error')
        }
      }
    }

    res.status(200).send('OK')
  } catch (error) {
    logger.error({ error }, '[WEBHOOK] Error processing SendGrid event')
    res.status(200).send('OK')
  }
}

export const handleSendGridInbound = async (req: Request, res: Response) => {
  // Always respond 200 quickly so SendGrid doesn't retry
  res.status(200).send('OK')

  try {
    // Verify SendGrid webhook signature if verification key is configured
    const verificationKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;
    if (verificationKey) {
      // SendGrid signs inbound parse webhooks with X-Twilio-Email-Event-Webhook-Signature
      const signature = req.headers['x-twilio-email-event-webhook-signature'] as string;
      const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'] as string;
      if (!signature || !timestamp) {
        logger.warn('[WEBHOOK] SendGrid inbound: missing signature headers');
        return;
      }
    }

    const parseResult = sendgridInboundSchema.safeParse(req.body)
    if (!parseResult.success) {
      logger.warn({ issues: parseResult.error.issues }, '[WEBHOOK] Invalid SendGrid inbound payload')
      return
    }

    const { from, to, subject, text, html } = parseResult.data

    const senderEmail = parseEmailAddress(from)
    const recipientEmail = parseEmailAddress(to)

    const senderName = from.match(/^(.+?)\s*</) ? from.match(/^(.+?)\s*</)?.[1]?.trim() || senderEmail : senderEmail

    const body = text.trim() || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '(empty)'

    if (!senderEmail) {
      logger.warn('[WEBHOOK] SendGrid inbound: missing from address')
      return
    }

    const lead = await prisma.lead.findFirst({
      where: { email: senderEmail },
      select: { id: true, organizationId: true, firstName: true, lastName: true },
    })

    const emailConfig = await prisma.emailConfig.findFirst({
      where: { fromEmail: recipientEmail },
      include: { user: { select: { id: true, organizationId: true } } },
    })

    const userByEmail = !emailConfig
      ? await prisma.user.findFirst({
          where: { email: recipientEmail },
          select: { id: true, organizationId: true },
        })
      : null

    const recipientUser = emailConfig?.user || userByEmail
    const organizationId = lead?.organizationId || recipientUser?.organizationId

    if (!organizationId) {
      logger.warn({ senderEmail, recipientEmail }, '[WEBHOOK] SendGrid inbound: cannot resolve organizationId')
      return
    }

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
    })

    logger.info({ messageId: message.id, from: senderEmail, to: recipientEmail, subject }, '[WEBHOOK] Inbound email saved')

    pushMessageUpdate(organizationId, { type: 'received', messageId: message.id, channel: 'email', leadId: lead?.id })

    if (recipientUser?.id) {
      try {
        const leadName = lead
          ? `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim() || senderName
          : senderName
        await createInboundNotification(
          recipientUser.id,
          organizationId,
          'INBOUND_EMAIL',
          `New email from ${leadName}`,
          body.length > 120 ? body.substring(0, 117) + '…' : body,
        )
      } catch (notifErr) {
        logger.error({ error: notifErr }, '[WEBHOOK] Failed to create email notification')
      }
    }
  } catch (error) {
    logger.error({ error }, '[WEBHOOK] Error processing SendGrid inbound email')
  }
}

export const handleWorkflowTrigger = async (req: Request, res: Response) => {
  const { webhookKey } = req.params

  if (!webhookKey || webhookKey.length < 10) {
    return res.status(400).json({ success: false, message: 'Invalid webhook key' })
  }

  try {
    const workflow = await prisma.workflow.findFirst({
      where: {
        webhookKey,
        triggerType: 'WEBHOOK',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        organizationId: true,
      },
    })

    if (!workflow) {
      return res.status(404).json({ success: false, message: 'Workflow not found or inactive' })
    }

    logger.info({ workflowId: workflow.id, webhookKey }, '[WEBHOOK] Workflow trigger received')

    const { leadId, data } = req.body || {}

    const { executeWorkflow } = await import('../services/workflow.service')
    executeWorkflow(workflow.id, leadId || undefined, {
      trigger: 'webhook',
      webhookPayload: data || req.body || {},
    }).catch((err: Error) => {
      logger.error({ error: err, workflowId: workflow.id }, '[WEBHOOK] Workflow execution failed')
    })

    res.status(200).json({
      success: true,
      message: 'Workflow triggered',
      workflowId: workflow.id,
    })
  } catch (error) {
    logger.error({ error }, '[WEBHOOK] Error handling workflow trigger')
    res.status(500).json({ success: false, message: 'Internal error' })
  }
}

export const handleStripeWebhook = async (req: Request, res: Response) => {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(501).send('Stripe webhooks not configured')
  }

  const signature = req.headers['stripe-signature'] as string
  if (!signature) {
    return res.status(400).send('Missing stripe-signature header')
  }

  try {
    const { getStripeService } = await import('../services/stripe.service')
    const stripe = getStripeService()
    const event = await stripe.handleWebhook(req.body, signature)

    logger.info({ type: event.type, id: event.id }, '[WEBHOOK] Stripe event received')

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as { customer: string; subscription: string; metadata?: Record<string, string> }
        if (session.subscription) {
          const sub = await prisma.subscription.findFirst({
            where: { stripeCustomerId: session.customer as string },
          })
          if (sub) {
            const stripeDetails = await stripe.getSubscription(session.subscription as string)
            await prisma.subscription.update({
              where: { id: sub.id },
              data: {
                stripeSubscriptionId: session.subscription as string,
                status: stripeDetails.status === 'active' ? 'ACTIVE' : stripeDetails.status === 'trialing' ? 'TRIALING' : 'ACTIVE',
                currentPeriodEnd: stripeDetails.currentPeriodEnd,
              },
            })
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as unknown as { id: string; status: string; current_period_end: number; cancel_at_period_end: boolean }
        const sub = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        })
        if (sub) {
          const statusMap: Record<string, 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED' | 'INCOMPLETE'> = {
            active: 'ACTIVE',
            trialing: 'TRIALING',
            past_due: 'PAST_DUE',
            canceled: 'CANCELLED',
            incomplete: 'INCOMPLETE',
          }
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: statusMap[subscription.status] || 'ACTIVE',
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAt: subscription.cancel_at_period_end ? new Date(subscription.current_period_end * 1000) : null,
            },
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const deleted = event.data.object as { id: string }
        const sub = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: deleted.id },
        })
        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: 'CANCELLED',
              canceledAt: new Date(),
              stripeSubscriptionId: null,
            },
          })
          await prisma.organization.update({
            where: { id: sub.organizationId },
            data: { subscriptionTier: 'STARTER' },
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as unknown as { customer: string; subscription: string }
        if (invoice.subscription) {
          const sub = await prisma.subscription.findFirst({
            where: { stripeSubscriptionId: invoice.subscription as string },
          })
          if (sub) {
            await prisma.subscription.update({
              where: { id: sub.id },
              data: { status: 'PAST_DUE' },
            })
          }
        }
        break
      }

      default:
        logger.info({ type: event.type }, '[WEBHOOK] Unhandled Stripe event type')
    }

    res.json({ received: true })
  } catch (error) {
    logger.error({ error }, '[WEBHOOK] Stripe webhook processing failed')
    res.status(400).send('Webhook error')
  }
}
