import { z } from 'zod';

const notificationTypes = ['LEAD_ASSIGNED', 'LEAD_STATUS_CHANGED', 'CAMPAIGN_COMPLETED', 'TASK_DUE', 'TASK_ASSIGNED', 'MESSAGE_RECEIVED', 'SYSTEM', 'WORKFLOW', 'WORKFLOW_COMPLETED', 'REMINDER', 'INBOUND_EMAIL', 'INBOUND_SMS'] as const;

// ── Create Notification ─────────────────────────────────────────────
export const createNotificationSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  type: z.string().transform(v => v.toUpperCase()).pipe(z.enum(notificationTypes)).optional(),
  link: z.string().url().max(500).optional().or(z.literal('')),
  userId: z.string().optional(),
});

// ── Mark as Read ────────────────────────────────────────────────────
export const notificationIdParamSchema = z.object({
  id: z.string().min(1),
});
