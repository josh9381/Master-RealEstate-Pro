import { z } from 'zod';

/**
 * Campaign type enum
 */
const campaignTypeSchema = z.enum(['EMAIL', 'SMS', 'PHONE']);

/**
 * Campaign status enum
 */
const campaignStatusSchema = z.enum([
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'SENDING',
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
  abTestWinnerMetric: z.enum(['open_rate', 'click_rate']).optional(),
  abTestEvalHours: z.number().min(1).max(720).optional(),
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
}).refine(
  (data) => !data.frequency || data.isRecurring,
  { message: 'frequency requires isRecurring to be true', path: ['frequency'] }
);

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
  audience: z.number().min(0).optional().nullable(),
  // NOTE: sent, delivered, opened, clicked, converted, bounced, unsubscribed, revenue, roi
  // are system-managed metrics. Use PATCH /:id/metrics to update them.
  isABTest: z.boolean().optional(),
  abTestData: z.record(z.string(), z.any()).optional().nullable(),
  abTestWinnerMetric: z.enum(['open_rate', 'click_rate']).optional().nullable(),
  abTestEvalHours: z.number().min(1).max(720).optional().nullable(),
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
 * Send campaign body validation
 */
export const sendCampaignSchema = z.object({
  leadIds: z.array(z.string().min(1)).optional(),
  filters: z.object({
    status: z.array(z.string()).optional(),
    source: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    score: z.object({ min: z.number().min(0).max(100).optional(), max: z.number().min(0).max(100).optional() }).optional(),
  }).strict().optional(),
}).strict().refine(
  (data) => {
    // Must provide either leadIds or at least one non-empty filter
    if (data.leadIds && data.leadIds.length > 0) return true;
    if (!data.filters) return true; // No filters = use campaign's saved audience
    const f = data.filters;
    return !!(f.status?.length || f.source?.length || f.tags?.length || f.score);
  },
  { message: 'Provide leadIds or at least one filter; empty filters object would target no leads' }
);

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

/**
 * Track email open body validation
 */
export const trackOpenSchema = z.object({
  leadId: z.string().min(1, 'leadId is required'),
  messageId: z.string().optional(),
}).strict();

/**
 * Track email click body validation
 */
export const trackClickSchema = z.object({
  leadId: z.string().min(1, 'leadId is required'),
  messageId: z.string().optional(),
  url: z.string().url('url must be a valid URL'),
}).strict();

/**
 * Track conversion body validation
 */
export const trackConversionSchema = z.object({
  leadId: z.string().min(1, 'leadId is required'),
  value: z.number().min(0).optional(),
}).strict();

/**
 * Compile email body validation
 */
export const compileEmailSchema = z.object({
  content: z.string().min(1, 'content is required'),
  subject: z.string().max(255).optional(),
  previewText: z.string().max(500).optional(),
}).strict();

/**
 * Create campaign from template body validation
 */
export const fromTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  startDate: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
}).strict();

/**
 * Reschedule campaign body validation
 */
export const rescheduleSchema = z.object({
  startDate: z.string().min(1, 'startDate is required'),
}).strict();

/**
 * Duplicate campaign body validation
 */
export const duplicateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
}).strict();

/**
 * Compare campaigns body validation
 */
export const compareCampaignsSchema = z.object({
  campaignIds: z.array(z.string().min(1)).min(1, 'campaignIds must be a non-empty array'),
}).strict();

/**
 * Add recipients body validation
 */
export const addRecipientsSchema = z.object({
  leadIds: z.array(z.string().min(1)).min(1, 'leadIds must be a non-empty array'),
}).strict();
