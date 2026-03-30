import prisma from '../config/database'
import { logger } from '../lib/logger'

type ActivityType =
  | 'EMAIL_SENT' | 'EMAIL_OPENED' | 'EMAIL_CLICKED' | 'EMAIL_RECEIVED'
  | 'SMS_SENT' | 'SMS_DELIVERED'
  | 'CALL_MADE' | 'CALL_RECEIVED' | 'CALL_LOGGED'
  | 'MEETING_SCHEDULED' | 'MEETING_COMPLETED'
  | 'NOTE_ADDED' | 'NOTE_EDITED' | 'NOTE_DELETED'
  | 'TASK_CREATED' | 'TASK_COMPLETED'
  | 'DOCUMENT_UPLOADED' | 'DOCUMENT_DELETED'
  | 'STATUS_CHANGED' | 'STAGE_CHANGED' | 'SCORE_CHANGED'
  | 'TAG_ADDED' | 'TAG_REMOVED'
  | 'LEAD_CREATED' | 'LEAD_ASSIGNED' | 'LEAD_REASSIGNED' | 'LEAD_MERGED' | 'LEAD_IMPORTED'
  | 'CAMPAIGN_LAUNCHED' | 'CAMPAIGN_COMPLETED'

interface LogActivityParams {
  type: ActivityType
  title: string
  description?: string
  leadId?: string
  userId?: string
  organizationId: string
  campaignId?: string
  metadata?: Record<string, string | number | boolean | null | string[]>
}

/**
 * Log an activity record for the timeline.
 * Fire-and-forget: errors are logged but don't propagate.
 * Automatically triggers lead rescore for engagement-related activities.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await prisma.activity.create({
      data: {
        type: params.type as never,
        title: params.title,
        description: params.description,
        leadId: params.leadId,
        userId: params.userId,
        organizationId: params.organizationId,
        campaignId: params.campaignId,
        metadata: params.metadata ?? undefined,
      },
    })

    // Auto-rescore lead on engagement activities that affect scoring
    if (params.leadId && RESCORE_TRIGGER_TYPES.has(params.type)) {
      triggerLeadRescore(params.leadId).catch((err) => {
        logger.error(`Failed to auto-rescore lead ${params.leadId}:`, err)
      })
    }
  } catch (error) {
    logger.error('Failed to log activity:', error)
  }
}

/** Activity types that should trigger an automatic lead score recalculation */
const RESCORE_TRIGGER_TYPES = new Set<ActivityType>([
  'EMAIL_OPENED', 'EMAIL_CLICKED', 'EMAIL_RECEIVED',
  'SMS_DELIVERED',
  'CALL_MADE', 'CALL_LOGGED',
  'MEETING_SCHEDULED', 'MEETING_COMPLETED',
  'STATUS_CHANGED', 'STAGE_CHANGED',
])

/** Debounced lead rescore to avoid redundant recalculations */
const pendingRescores = new Map<string, NodeJS.Timeout>()

async function triggerLeadRescore(leadId: string): Promise<void> {
  // Debounce: if multiple activities for the same lead happen within 5 seconds, only rescore once
  if (pendingRescores.has(leadId)) {
    return
  }

  const timeout = setTimeout(async () => {
    pendingRescores.delete(leadId)
    try {
      const { updateLeadScore } = await import('../services/leadScoring.service')
      await updateLeadScore(leadId)
      logger.debug(`Auto-rescored lead ${leadId}`)
    } catch (err) {
      logger.error(`Auto-rescore failed for lead ${leadId}:`, err)
    }
  }, 5000)

  pendingRescores.set(leadId, timeout)
}
