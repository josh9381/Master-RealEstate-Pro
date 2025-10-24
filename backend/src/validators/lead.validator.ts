import { z } from 'zod';

/**
 * Lead status enum validation
 */
const leadStatusSchema = z.enum([
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL',
  'NEGOTIATION',
  'WON',
  'LOST',
]);

/**
 * Create lead validation schema
 */
export const createLeadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10).max(20).optional(),
  company: z.string().max(255).optional(),
  position: z.string().max(255).optional(),
  status: leadStatusSchema.optional(),
  source: z.string().max(100).optional(),
  value: z.number().min(0).optional(),
  stage: z.string().max(100).optional(),
  assignedToId: z.string().cuid().optional(),
  customFields: z.record(z.string(), z.any()).optional(),
});

/**
 * Update lead validation schema (all fields optional)
 */
export const updateLeadSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(20).optional().nullable(),
  company: z.string().max(255).optional().nullable(),
  position: z.string().max(255).optional().nullable(),
  status: leadStatusSchema.optional(),
  score: z.number().min(0).max(100).optional(),
  source: z.string().max(100).optional().nullable(),
  value: z.number().min(0).optional().nullable(),
  stage: z.string().max(100).optional().nullable(),
  assignedToId: z.string().cuid().optional().nullable(),
  customFields: z.record(z.string(), z.any()).optional().nullable(),
  lastContactAt: z.string().datetime().optional().nullable(),
});

/**
 * Query parameters for listing leads
 */
export const listLeadsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional().default('1').transform(Number),
  limit: z.string().regex(/^\d+$/).optional().default('20').transform(Number),
  status: leadStatusSchema.optional(),
  source: z.string().optional(),
  assignedToId: z.string().cuid().optional(),
  search: z.string().optional(), // Search in name, email, company
  sortBy: z.enum(['createdAt', 'updatedAt', 'score', 'value', 'name']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  minScore: z.string().regex(/^\d+$/).transform(Number).optional(),
  maxScore: z.string().regex(/^\d+$/).transform(Number).optional(),
  minValue: z.string().regex(/^\d+$/).transform(Number).optional(),
  maxValue: z.string().regex(/^\d+$/).transform(Number).optional(),
});

/**
 * Lead ID parameter validation
 */
export const leadIdSchema = z.object({
  id: z.string().cuid('Invalid lead ID'),
});

/**
 * Bulk delete leads validation
 */
export const bulkDeleteLeadsSchema = z.object({
  leadIds: z.array(z.string().cuid()).min(1, 'At least one lead ID is required'),
});

/**
 * Bulk update leads validation
 */
export const bulkUpdateLeadsSchema = z.object({
  leadIds: z.array(z.string().cuid()).min(1, 'At least one lead ID is required'),
  updates: z.object({
    status: leadStatusSchema.optional(),
    assignedToId: z.string().cuid().optional().nullable(),
    stage: z.string().max(100).optional(),
  }),
});
