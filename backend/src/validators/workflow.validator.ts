import { z } from 'zod'

/**
 * Workflow validation schemas
 */

const VALID_TRIGGER_TYPES = [
  'LEAD_CREATED',
  'LEAD_STATUS_CHANGED',
  'LEAD_ASSIGNED',
  'CAMPAIGN_COMPLETED',
  'EMAIL_OPENED',
  'TIME_BASED',
  'SCORE_THRESHOLD',
  'TAG_ADDED',
  'MANUAL',
  'WEBHOOK',
] as const

const VALID_ACTION_TYPES = [
  'SEND_EMAIL',
  'SEND_SMS',
  'UPDATE_LEAD',
  'ADD_TAG',
  'REMOVE_TAG',
  'CREATE_TASK',
  'ASSIGN_LEAD',
  'UPDATE_SCORE',
  'SEND_NOTIFICATION',
  'ADD_TO_CAMPAIGN',
  'WEBHOOK',
  'DELAY',
  'CONDITION',
] as const

/** Per-action-type config validation */
const actionSchema = z.object({
  type: z.enum(VALID_ACTION_TYPES).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
}).passthrough()

/** Schema for node position/layout data persisted with the workflow */
const nodeSchema = z.object({
  id: z.string(),
  type: z.enum(['trigger', 'condition', 'action', 'delay']),
  label: z.string(),
  description: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
}).passthrough()

export const createWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  description: z.string().max(1000).optional(),
  triggerType: z.enum(VALID_TRIGGER_TYPES),
  triggerData: z.record(z.string(), z.unknown()).optional(),
  actions: z.array(actionSchema).min(1, 'At least one action is required'),
  maxRetries: z.number().int().min(1).max(3).optional(),
  notifyOnFailure: z.boolean().optional(),
  nodes: z.array(nodeSchema).optional(),
})

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  triggerType: z.enum(VALID_TRIGGER_TYPES).optional(),
  triggerData: z.record(z.string(), z.unknown()).optional(),
  actions: z.array(actionSchema).min(1).optional(),
  isActive: z.boolean().optional(),
  maxRetries: z.number().int().min(1).max(3).optional(),
  notifyOnFailure: z.boolean().optional(),
  nodes: z.array(nodeSchema).optional(),
})

export const toggleWorkflowSchema = z.object({
  isActive: z.boolean(),
})

export const testWorkflowSchema = z.object({
  testData: z.record(z.string(), z.unknown()).optional(),
})

export const workflowQuerySchema = z.object({
  isActive: z.enum(['true', 'false']).optional(),
  triggerType: z.enum(VALID_TRIGGER_TYPES).optional(),
  search: z.string().optional(),
})
