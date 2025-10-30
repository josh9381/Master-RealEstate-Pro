import { z } from 'zod'

/**
 * Message validation schemas
 */

export const sendEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required').max(300, 'Subject too long').optional(),
  body: z.string().min(1, 'Body is required').optional(),
  leadId: z.string().cuid().optional(),
  templateId: z.string().cuid().optional(),
  templateVariables: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  threadId: z.string().optional(),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(),
    contentType: z.string()
  })).optional()
}).refine(data => data.templateId || (data.subject && data.body), {
  message: 'Either templateId or both subject and body are required',
  path: ['templateId']
})

export const sendSMSSchema = z.object({
  to: z.string().regex(/^\+?[1-9]\d{1,14}$/, { 
    message: 'Invalid phone number. Must be in E.164 format (e.g., +1234567890)' 
  }),
  body: z.string()
    .min(1, 'Body is required')
    .max(1600, 'SMS body must be 1600 characters or less (10 segments)')
    .optional(),
  leadId: z.string().cuid().optional(),
  templateId: z.string().cuid().optional(),
  templateVariables: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  threadId: z.string().optional()
}).refine(data => data.templateId || data.body, {
  message: 'Either templateId or body is required',
  path: ['templateId']
})

export const makeCallSchema = z.object({
  to: z.string().min(1, 'Phone number is required'),
  leadId: z.string().optional(),
})

export const messageQuerySchema = z.object({
  type: z.enum(['EMAIL', 'SMS', 'CALL', 'SOCIAL', 'NEWSLETTER']).optional(),
  direction: z.enum(['INBOUND', 'OUTBOUND']).optional(),
  status: z.enum(['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'OPENED', 'CLICKED']).optional(),
  leadId: z.string().cuid().optional(),
  threadId: z.string().optional(),
  search: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['createdAt', 'sentAt', 'readAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

/**
 * Validator for marking messages as read
 */
export const markAsReadSchema = z.object({
  messageIds: z.array(z.string().cuid()).min(1, 'At least one message ID is required')
})

/**
 * Validator for replying to a message
 */
export const replyToMessageSchema = z.object({
  body: z.string().min(1, 'Reply body is required'),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(),
    contentType: z.string()
  })).optional()
})

/**
 * Validator for message ID parameter
 */
export const messageIdSchema = z.object({
  id: z.string().cuid('Invalid message ID format')
})

/**
 * Validator for thread ID parameter
 */
export const threadIdSchema = z.object({
  threadId: z.string().min(1, 'Thread ID is required')
})
