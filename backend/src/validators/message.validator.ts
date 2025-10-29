import { z } from 'zod'

/**
 * Message validation schemas
 */

export const sendEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required').max(500, 'Subject too long'),
  body: z.string().min(1, 'Body is required'),
  leadId: z.string().optional(),
})

export const sendSMSSchema = z.object({
  to: z.string().min(1, 'Phone number is required'),
  body: z.string().min(1, 'Body is required').max(160, 'SMS must not exceed 160 characters'),
  leadId: z.string().optional(),
})

export const makeCallSchema = z.object({
  to: z.string().min(1, 'Phone number is required'),
  leadId: z.string().optional(),
})

export const messageQuerySchema = z.object({
  type: z.enum(['EMAIL', 'SMS', 'CALL', 'SOCIAL', 'NEWSLETTER']).optional(),
  direction: z.enum(['INBOUND', 'OUTBOUND']).optional(),
  status: z.enum(['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'OPENED', 'CLICKED']).optional(),
  leadId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})
