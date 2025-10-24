import { z } from 'zod';

/**
 * Create note validation schema
 */
export const createNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required').max(10000, 'Note content must be 10000 characters or less'),
});

/**
 * Update note validation schema
 */
export const updateNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required').max(10000, 'Note content must be 10000 characters or less'),
});

/**
 * Note ID parameter validation
 */
export const noteIdSchema = z.object({
  id: z.string().min(1, 'Note ID is required'),
});

/**
 * Lead ID parameter validation for notes
 */
export const leadIdParamSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required'),
});
