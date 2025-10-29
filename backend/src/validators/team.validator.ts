import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  description: z.string().optional()
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  settings: z.record(z.string(), z.unknown()).optional()
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'MEMBER']).default('MEMBER')
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'MEMBER'])
});
