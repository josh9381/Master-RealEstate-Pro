import { z } from 'zod';

/**
 * Schema for creating an SMS template
 * Note: Standard SMS is 160 characters, extended is 1600 (10 segments)
 */
export const createSMSTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  body: z.string()
    .min(1, 'Body is required')
    .max(1600, 'SMS body cannot exceed 1600 characters (10 segments)')
    .refine(
      (val) => {
        // Count actual characters (variables count as their placeholder length)
        return val.length <= 1600;
      },
      { message: 'SMS too long - consider breaking into multiple messages' }
    ),
  category: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  variables: z.record(z.string(), z.string()).optional(),
});

/**
 * Schema for updating an SMS template
 */
export const updateSMSTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  body: z.string()
    .min(1)
    .max(1600, 'SMS body cannot exceed 1600 characters (10 segments)')
    .optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
  variables: z.record(z.string(), z.string()).optional(),
});

/**
 * Schema for SMS template ID param
 */
export const smsTemplateIdSchema = z.object({
  id: z.string().cuid('Invalid template ID'),
});

/**
 * Schema for listing SMS templates with filters
 */
export const listSMSTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  category: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'usageCount']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
