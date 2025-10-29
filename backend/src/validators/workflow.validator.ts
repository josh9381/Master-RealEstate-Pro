import { z } from 'zod'

/**
 * Workflow validation schemas
 */

export const createWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  description: z.string().max(1000).optional(),
  triggerType: z.enum([
    'LEAD_CREATED',
    'LEAD_STATUS_CHANGED',
    'LEAD_ASSIGNED',
    'CAMPAIGN_COMPLETED',
    'EMAIL_OPENED',
    'TIME_BASED',
    'SCORE_THRESHOLD',
    'TAG_ADDED',
    'MANUAL',
  ]),
  triggerData: z.record(z.string(), z.unknown()).optional(),
  actions: z.array(z.record(z.string(), z.unknown())).min(1, 'At least one action is required'),
})

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  triggerType: z.enum([
    'LEAD_CREATED',
    'LEAD_STATUS_CHANGED',
    'LEAD_ASSIGNED',
    'CAMPAIGN_COMPLETED',
    'EMAIL_OPENED',
    'TIME_BASED',
    'SCORE_THRESHOLD',
    'TAG_ADDED',
    'MANUAL',
  ]).optional(),
  triggerData: z.record(z.string(), z.unknown()).optional(),
  actions: z.array(z.record(z.string(), z.unknown())).min(1).optional(),
  isActive: z.boolean().optional(),
})

export const toggleWorkflowSchema = z.object({
  isActive: z.boolean(),
})

export const testWorkflowSchema = z.object({
  testData: z.record(z.string(), z.unknown()).optional(),
})

export const workflowQuerySchema = z.object({
  isActive: z.enum(['true', 'false']).optional(),
  triggerType: z.enum([
    'LEAD_CREATED',
    'LEAD_STATUS_CHANGED',
    'LEAD_ASSIGNED',
    'CAMPAIGN_COMPLETED',
    'EMAIL_OPENED',
    'TIME_BASED',
    'SCORE_THRESHOLD',
    'TAG_ADDED',
    'MANUAL',
  ]).optional(),
  search: z.string().optional(),
})
