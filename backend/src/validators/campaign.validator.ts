import { z } from 'zod';

/**
 * Campaign type enum
 */
const campaignTypeSchema = z.enum(['EMAIL', 'SMS', 'PHONE', 'SOCIAL']);

/**
 * Campaign status enum
 */
const campaignStatusSchema = z.enum([
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
]);

/**
 * Create campaign validation schema
 */
export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(255),
  type: campaignTypeSchema,
  status: campaignStatusSchema.optional(),
  subject: z.string().max(255).optional(),
  body: z.string().max(50000).optional(),
  previewText: z.string().max(500).optional(),
  startDate: z.string().optional().transform(val => {
    if (!val) return val;
    // Accept both ISO datetime and date-only formats
    if (val.includes('T')) return val;
    return `${val}T00:00:00.000Z`;
  }),
  endDate: z.string().optional().transform(val => {
    if (!val) return val;
    if (val.includes('T')) return val;
    return `${val}T00:00:00.000Z`;
  }),
  budget: z.number().min(0).optional(),
  audience: z.number().min(0).optional(),
  isABTest: z.boolean().optional(),
  abTestData: z.record(z.string(), z.any()).optional(),
  tagIds: z.array(z.string()).optional(),
  isRecurring: z.boolean().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  recurringPattern: z.union([
    z.string(),
    z.object({
      daysOfWeek: z.array(z.number()).optional(),
      dayOfMonth: z.number().optional(),
      time: z.string().optional(),
    }),
  ]).optional(),
  maxOccurrences: z.number().min(1).optional(),
});

/**
 * Update campaign validation schema
 */
export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: campaignTypeSchema.optional(),
  status: campaignStatusSchema.optional(),
  subject: z.string().max(255).optional().nullable(),
  body: z.string().max(50000).optional().nullable(),
  previewText: z.string().max(500).optional().nullable(),
  startDate: z.string().optional().nullable().transform(val => {
    if (!val) return val;
    if (val.includes('T')) return val;
    return `${val}T00:00:00.000Z`;
  }),
  endDate: z.string().optional().nullable().transform(val => {
    if (!val) return val;
    if (val.includes('T')) return val;
    return `${val}T00:00:00.000Z`;
  }),
  budget: z.number().min(0).optional().nullable(),
  spent: z.number().min(0).optional(),
  audience: z.number().min(0).optional().nullable(),
  sent: z.number().min(0).optional(),
  delivered: z.number().min(0).optional(),
  opened: z.number().min(0).optional(),
  clicked: z.number().min(0).optional(),
  converted: z.number().min(0).optional(),
  bounced: z.number().min(0).optional(),
  unsubscribed: z.number().min(0).optional(),
  revenue: z.number().min(0).optional(),
  roi: z.number().optional().nullable(),
  isABTest: z.boolean().optional(),
  abTestData: z.record(z.string(), z.any()).optional().nullable(),
  isRecurring: z.boolean().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional().nullable(),
  recurringPattern: z.union([
    z.string(),
    z.object({
      daysOfWeek: z.array(z.number()).optional(),
      dayOfMonth: z.number().optional(),
      time: z.string().optional(),
    }),
  ]).optional().nullable(),
  maxOccurrences: z.number().min(1).optional().nullable(),
});

/**
 * Campaign ID parameter validation
 */
export const campaignIdSchema = z.object({
  id: z.string().min(1, 'Campaign ID is required'),
});

/**
 * List campaigns query validation
 */
export const listCampaignsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional().default('1').transform(Number),
  limit: z.string().regex(/^\d+$/).optional().default('20').transform(Number),
  status: campaignStatusSchema.optional(),
  type: campaignTypeSchema.optional(),
  search: z.string().optional(), // Search in name, subject
  includeArchived: z.string().optional().transform(val => val === 'true'),
  sortBy: z.enum(['createdAt', 'updatedAt', 'startDate', 'name', 'sent', 'opened', 'clicked', 'converted', 'delivered', 'bounced']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Update campaign metrics validation
 */
export const updateCampaignMetricsSchema = z.object({
  sent: z.number().min(0).optional(),
  delivered: z.number().min(0).optional(),
  opened: z.number().min(0).optional(),
  clicked: z.number().min(0).optional(),
  converted: z.number().min(0).optional(),
  bounced: z.number().min(0).optional(),
  unsubscribed: z.number().min(0).optional(),
  revenue: z.number().min(0).optional(),
});
