import { z } from 'zod';

export const connectIntegrationSchema = z.object({
  credentials: z.record(z.string(), z.unknown()).optional(),
  config: z.record(z.string(), z.unknown()).optional()
});

export const disconnectIntegrationSchema = z.object({
  // No body required
});
