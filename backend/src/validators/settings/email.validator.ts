import { z } from 'zod';

export const updateEmailConfigSchema = z.object({
  provider: z.enum(['sendgrid', 'smtp']).optional(),
  apiKey: z.string().optional(),
  fromEmail: z.string().email('Invalid from email').optional(),
  fromName: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  isActive: z.boolean().optional()
});

export const testEmailSchema = z.object({
  to: z.string().email('Invalid recipient email'),
  subject: z.string().min(1, 'Subject is required').optional(),
  message: z.string().min(1, 'Message is required').optional()
});
