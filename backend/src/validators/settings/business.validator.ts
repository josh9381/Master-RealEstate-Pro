import { z } from 'zod';

export const updateBusinessSettingsSchema = z.object({
  companyName: z.string().min(1).max(100).optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  logo: z.string().optional(),
  billingEmail: z.string().email('Invalid billing email').optional(),
  businessHours: z.record(z.string(), z.object({
    open: z.string().optional(),
    close: z.string().optional(),
    closed: z.boolean().optional()
  })).optional()
});
