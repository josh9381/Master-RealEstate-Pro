import { z } from 'zod';

export const updateNotificationSettingsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  channels: z.record(z.string(), z.boolean()).optional()
});
