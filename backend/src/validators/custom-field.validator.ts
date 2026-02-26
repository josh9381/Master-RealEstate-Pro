import { z } from 'zod';

const fieldTypes = ['text', 'number', 'date', 'dropdown', 'boolean', 'textarea'] as const;

export const createCustomFieldSchema = z.object({
  name: z.string().min(1, 'Field name is required').max(100),
  fieldKey: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, 'Field key must be lowercase alphanumeric with underscores').optional(),
  type: z.enum(fieldTypes, { message: `Type must be one of: ${fieldTypes.join(', ')}` }),
  required: z.boolean().optional().default(false),
  options: z.array(z.string()).optional(),
  order: z.number().int().min(0).optional(),
  defaultValue: z.string().optional(),
  placeholder: z.string().max(200).optional(),
  validation: z.string().max(500).optional(),
});

export const updateCustomFieldSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  fieldKey: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, 'Field key must be lowercase alphanumeric with underscores').optional(),
  type: z.enum(fieldTypes).optional(),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  order: z.number().int().min(0).optional(),
  defaultValue: z.string().optional().nullable(),
  placeholder: z.string().max(200).optional().nullable(),
  validation: z.string().max(500).optional().nullable(),
});

export const customFieldIdSchema = z.object({
  id: z.string().min(1, 'Custom field ID is required'),
});

export const reorderCustomFieldsSchema = z.object({
  fieldIds: z.array(z.string().min(1)).min(1, 'At least one field ID is required'),
});
