import { z } from 'zod';

/**
 * Create tag validation schema
 */
export const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50, 'Tag name must be 50 characters or less'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF5733)').optional(),
});

/**
 * Update tag validation schema
 */
export const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
});

/**
 * Tag ID parameter validation
 */
export const tagIdSchema = z.object({
  id: z.string().min(1, 'Tag ID is required'),
});

/**
 * Add tags to lead validation
 */
export const addTagsToLeadSchema = z.object({
  tagIds: z.array(z.string().min(1)).min(1, 'At least one tag ID is required'),
});
