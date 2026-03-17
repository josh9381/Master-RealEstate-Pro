import { z } from 'zod'

// Activity types from Prisma schema
const activityTypes = [
  'EMAIL_SENT',
  'EMAIL_OPENED',
  'EMAIL_CLICKED',
  'SMS_SENT',
  'SMS_DELIVERED',
  'CALL_MADE',
  'CALL_RECEIVED',
  'MEETING_SCHEDULED',
  'MEETING_COMPLETED',
  'NOTE_ADDED',
  'STATUS_CHANGED',
  'STAGE_CHANGED',
  'LEAD_CREATED',
  'LEAD_ASSIGNED',
  'CAMPAIGN_LAUNCHED',
  'CAMPAIGN_COMPLETED'
] as const

export const createActivitySchema = z.object({
  type: z.enum(activityTypes),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  leadId: z.string().cuid().optional(),
  campaignId: z.string().cuid().optional(),
  metadata: z.record(z.string(), z.any()).optional()
})

export const updateActivitySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  metadata: z.record(z.string(), z.any()).optional()
})

export const getActivitiesSchema = z.object({
  type: z.string().optional(),
  leadId: z.string().optional(),
  campaignId: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional()
})
