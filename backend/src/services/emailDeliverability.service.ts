import prisma from '../config/database'
import { MessageStatus } from '@prisma/client'

/**
 * Email Deliverability Monitoring Service
 * 
 * Features:
 * - Track bounce rates (hard/soft/complaints)
 * - Monitor spam complaints
 * - Implement retry logic for failed sends
 * - Generate deliverability reports
 * - Automatic email suppression for bounced addresses
 */

interface BounceEvent {
  messageId: string
  bounceType: 'hard' | 'soft' | 'complaint'
  reason: string
  timestamp: Date
}

interface DeliverabilityStats {
  sent: number
  delivered: number
  bounced: number
  hardBounces: number
  softBounces: number
  spamComplaints: number
  deliveryRate: number
  bounceRate: number
  complaintRate: number
}

/**
 * Record a bounce event for a message
 */
export async function recordBounce(event: BounceEvent): Promise<void> {
  const { messageId, bounceType, reason, timestamp } = event

  await prisma.message.update({
    where: { id: messageId },
    data: {
      status: MessageStatus.FAILED,
      bouncedAt: timestamp,
      bounceType,
      bounceReason: reason,
    },
  })

  // If hard bounce or spam complaint, suppress the email address
  if (bounceType === 'hard' || bounceType === 'complaint') {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { toAddress: true, leadId: true },
    })

    if (message?.leadId) {
      await suppressLeadEmail(message.leadId, bounceType, reason)
    }
  }
}

/**
 * Record spam complaint
 */
export async function recordSpamComplaint(
  messageId: string,
  timestamp: Date
): Promise<void> {
  await prisma.message.update({
    where: { id: messageId },
    data: {
      spamComplaintAt: timestamp,
      bounceType: 'complaint',
    },
  })

  // Get the message to find the lead
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { leadId: true },
  })

  if (message?.leadId) {
    await suppressLeadEmail(message.leadId, 'complaint', 'Spam complaint')
  }
}

/**
 * Suppress email for a lead (opt them out)
 */
async function suppressLeadEmail(
  leadId: string,
  reason: string,
  details: string
): Promise<void> {
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      emailOptIn: false,
      emailOptOutAt: new Date(),
      emailOptOutReason: `Auto-suppressed: ${reason} - ${details}`,
    },
  })
}

/**
 * Get deliverability statistics for a campaign
 */
export async function getCampaignDeliverability(
  campaignId: string
): Promise<DeliverabilityStats> {
  // Get all messages for this campaign from activities
  const activities = await prisma.activity.findMany({
    where: {
      campaignId,
      type: 'EMAIL_SENT',
    },
    select: {
      metadata: true,
    },
  })

  // Extract message IDs from metadata
  const messageIds = activities
    .map((a) => {
      const metadata = a.metadata as Record<string, unknown>
      return metadata?.messageId as string
    })
    .filter(Boolean)

  if (messageIds.length === 0) {
    return {
      sent: 0,
      delivered: 0,
      bounced: 0,
      hardBounces: 0,
      softBounces: 0,
      spamComplaints: 0,
      deliveryRate: 0,
      bounceRate: 0,
      complaintRate: 0,
    }
  }

  // Get message statistics
  const messages = await prisma.message.findMany({
    where: {
      id: { in: messageIds },
    },
    select: {
      status: true,
      deliveredAt: true,
      bouncedAt: true,
      bounceType: true,
      spamComplaintAt: true,
    },
  })

  const sent = messages.length
  const delivered = messages.filter((m) => m.deliveredAt !== null).length
  const bounced = messages.filter((m) => m.bouncedAt !== null).length
  const hardBounces = messages.filter((m) => m.bounceType === 'hard').length
  const softBounces = messages.filter((m) => m.bounceType === 'soft').length
  const spamComplaints = messages.filter((m) => m.spamComplaintAt !== null).length

  const deliveryRate = sent > 0 ? (delivered / sent) * 100 : 0
  const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0
  const complaintRate = sent > 0 ? (spamComplaints / sent) * 100 : 0

  return {
    sent,
    delivered,
    bounced,
    hardBounces,
    softBounces,
    spamComplaints,
    deliveryRate: Math.round(deliveryRate * 10) / 10,
    bounceRate: Math.round(bounceRate * 10) / 10,
    complaintRate: Math.round(complaintRate * 10) / 10,
  }
}

/**
 * Get overall deliverability statistics
 */
export async function getOverallDeliverability(
  startDate?: Date,
  endDate?: Date
): Promise<DeliverabilityStats> {
  const dateFilter = {
    ...(startDate && { gte: startDate }),
    ...(endDate && { lte: endDate }),
  }

  const messages = await prisma.message.findMany({
    where: {
      type: 'EMAIL',
      direction: 'OUTBOUND',
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    },
    select: {
      status: true,
      deliveredAt: true,
      bouncedAt: true,
      bounceType: true,
      spamComplaintAt: true,
    },
  })

  const sent = messages.length
  const delivered = messages.filter((m) => m.deliveredAt !== null).length
  const bounced = messages.filter((m) => m.bouncedAt !== null).length
  const hardBounces = messages.filter((m) => m.bounceType === 'hard').length
  const softBounces = messages.filter((m) => m.bounceType === 'soft').length
  const spamComplaints = messages.filter((m) => m.spamComplaintAt !== null).length

  const deliveryRate = sent > 0 ? (delivered / sent) * 100 : 0
  const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0
  const complaintRate = sent > 0 ? (spamComplaints / sent) * 100 : 0

  return {
    sent,
    delivered,
    bounced,
    hardBounces,
    softBounces,
    spamComplaints,
    deliveryRate: Math.round(deliveryRate * 10) / 10,
    bounceRate: Math.round(bounceRate * 10) / 10,
    complaintRate: Math.round(complaintRate * 10) / 10,
  }
}

/**
 * Retry failed messages
 */
export async function retryFailedMessage(messageId: string): Promise<boolean> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      retryCount: true,
      maxRetries: true,
      bounceType: true,
      status: true,
    },
  })

  if (!message) {
    throw new Error('Message not found')
  }

  // Don't retry hard bounces or spam complaints
  if (message.bounceType === 'hard' || message.bounceType === 'complaint') {
    return false
  }

  // Check if max retries exceeded
  if (message.retryCount >= message.maxRetries) {
    return false
  }

  // Update retry count and status
  await prisma.message.update({
    where: { id: messageId },
    data: {
      retryCount: { increment: 1 },
      lastRetryAt: new Date(),
      status: MessageStatus.PENDING,
    },
  })

  return true
}

/**
 * Get failed messages eligible for retry
 */
export async function getRetryableMessages(limit = 100): Promise<
  Array<{
    id: string
    toAddress: string
    subject: string | null
    body: string
    retryCount: number
    bounceReason: string | null
  }>
> {
  const messages = await prisma.message.findMany({
    where: {
      status: MessageStatus.FAILED,
      bounceType: 'soft', // Only retry soft bounces
      retryCount: {
        lt: prisma.message.fields.maxRetries,
      },
    },
    select: {
      id: true,
      toAddress: true,
      subject: true,
      body: true,
      retryCount: true,
      bounceReason: true,
    },
    take: limit,
    orderBy: {
      bouncedAt: 'asc',
    },
  })

  return messages
}

/**
 * Batch retry failed messages
 */
export async function batchRetryMessages(messageIds: string[]): Promise<{
  retried: number
  skipped: number
  errors: number
}> {
  let retried = 0
  let skipped = 0
  let errors = 0

  for (const messageId of messageIds) {
    try {
      const success = await retryFailedMessage(messageId)
      if (success) {
        retried++
      } else {
        skipped++
      }
    } catch (error) {
      errors++
    }
  }

  return { retried, skipped, errors }
}

/**
 * Get bounce report grouped by reason
 */
export async function getBounceReport(
  startDate?: Date,
  endDate?: Date
): Promise<Array<{ reason: string; count: number; type: string }>> {
  const dateFilter = {
    ...(startDate && { gte: startDate }),
    ...(endDate && { lte: endDate }),
  }

  const bounces = await prisma.message.findMany({
    where: {
      bouncedAt: Object.keys(dateFilter).length > 0 ? dateFilter : { not: null },
    },
    select: {
      bounceReason: true,
      bounceType: true,
    },
  })

  // Group by reason and type
  const grouped = bounces.reduce(
    (acc, bounce) => {
      const key = `${bounce.bounceType}:${bounce.bounceReason || 'Unknown'}`
      if (!acc[key]) {
        acc[key] = {
          reason: bounce.bounceReason || 'Unknown',
          type: bounce.bounceType || 'unknown',
          count: 0,
        }
      }
      acc[key].count++
      return acc
    },
    {} as Record<string, { reason: string; type: string; count: number }>
  )

  return Object.values(grouped).sort((a, b) => b.count - a.count)
}

/**
 * Get suppressed emails (leads opted out due to bounces/complaints)
 */
export async function getSuppressedEmails(): Promise<
  Array<{
    id: string
    email: string
    suppressedAt: Date
    reason: string
  }>
> {
  const leads = await prisma.lead.findMany({
    where: {
      emailOptIn: false,
      emailOptOutReason: {
        startsWith: 'Auto-suppressed:',
      },
    },
    select: {
      id: true,
      email: true,
      emailOptOutAt: true,
      emailOptOutReason: true,
    },
    orderBy: {
      emailOptOutAt: 'desc',
    },
  })

  return leads.map((lead) => ({
    id: lead.id,
    email: lead.email,
    suppressedAt: lead.emailOptOutAt!,
    reason: lead.emailOptOutReason!,
  }))
}
