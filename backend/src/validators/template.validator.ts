import { z } from 'zod'

/**
 * Email Template validation schemas
 */

export const createEmailTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  subject: z.string().min(1, 'Subject is required').max(500, 'Subject too long'),
  body: z.string().min(1, 'Body is required'),
  category: z.string().max(100).optional(),
  variables: z.record(z.string(), z.unknown()).optional(),
})

export const updateEmailTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  subject: z.string().min(1).max(500).optional(),
  body: z.string().min(1).optional(),
  category: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
  variables: z.record(z.string(), z.unknown()).optional(),
})

/**
 * SMS Template validation schemas
 */

export const createSMSTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  body: z.string().min(1, 'Body is required').max(160, 'SMS body must not exceed 160 characters'),
  category: z.string().max(100).optional(),
  variables: z.record(z.string(), z.unknown()).optional(),
})

export const updateSMSTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(160).optional(),
  category: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
  variables: z.record(z.string(), z.unknown()).optional(),
})
