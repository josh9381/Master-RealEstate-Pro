import { z } from 'zod';

const templateTierValues = ['PERSONAL', 'ORGANIZATION', 'TEAM'] as const;

export const createMessageTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  content: z.string().min(1, 'Content is required').max(10000),
  category: z.string().max(100).optional(),
  tier: z.enum(templateTierValues).default('PERSONAL'),
  isQuickReply: z.boolean().default(false),
  variables: z.array(z.string()).optional(),
  teamId: z.string().optional(),
});

export const updateMessageTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(10000).optional(),
  category: z.string().max(100).nullable().optional(),
  isQuickReply: z.boolean().optional(),
  variables: z.array(z.string()).optional(),
});

export const messageTemplateIdSchema = z.object({
  id: z.string().min(1, 'Template ID is required'),
});
