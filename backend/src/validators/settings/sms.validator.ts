import { z } from 'zod';

export const updateSMSConfigSchema = z.object({
  provider: z.enum(['twilio']).optional(),
  accountSid: z.string().optional(),
  authToken: z.string().optional(),
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
  isActive: z.boolean().optional()
});

export const testSMSSchema = z.object({
  to: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format'),
  message: z.string().min(1, 'Message is required').max(160, 'Message must be 160 characters or less')
});
