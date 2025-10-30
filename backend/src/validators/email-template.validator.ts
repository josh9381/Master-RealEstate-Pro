import { z } from 'zod';

/**
 * Schema for creating an email template
 */
export const createEmailTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  subject: z.string().min(1, 'Subject is required').max(300, 'Subject too long'),
  body: z.string().min(1, 'Body is required'),
  category: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  variables: z.record(z.string(), z.string()).optional(),
});

/**
 * Schema for updating an email template
 */
export const updateEmailTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  subject: z.string().min(1).max(300).optional(),
  body: z.string().min(1).optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
  variables: z.record(z.string(), z.string()).optional(),
});

/**
 * Schema for email template ID param
 */
export const emailTemplateIdSchema = z.object({
  id: z.string().cuid('Invalid template ID'),
});

/**
 * Schema for listing email templates with filters
 */
export const listEmailTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  category: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'usageCount']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
