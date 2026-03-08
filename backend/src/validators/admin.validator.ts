import { z } from 'zod';

// ── System Settings ─────────────────────────────────────────────────
export const updateSystemSettingsSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  maxUploadSize: z.number().int().min(1).max(100).optional(),
  defaultTimezone: z.string().max(100).optional(),
  emailSendingLimit: z.number().int().min(0).optional(),
  aiEnabled: z.boolean().optional(),
  registrationEnabled: z.boolean().optional(),
}).passthrough(); // Allow additional settings fields

// ── Maintenance ─────────────────────────────────────────────────────
export const runMaintenanceSchema = z.object({
  operation: z.enum(['optimize', 'vacuum', 'reindex', 'reindex_all', 'optimize_table', 'backup', 'backup_history', 'db_stats', 'restore', 'cluster']),
  vacuumFull: z.boolean().optional(),
  analyze: z.boolean().optional(),
  table: z.string().regex(/^[a-zA-Z0-9_]+$/, 'Table name must contain only alphanumeric characters and underscores').max(100).optional(),
});
