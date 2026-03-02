import { z } from 'zod';

// ── Create Saved Report ─────────────────────────────────────────────
export const createSavedReportSchema = z.object({
  name: z.string().min(1, 'Report name is required').max(200),
  description: z.string().max(1000).optional(),
  type: z.string().max(50).optional(),
  config: z.any(), // Report configuration JSON
  filters: z.any().optional(),
  schedule: z.string().max(100).optional(),
});

// ── Update Saved Report ─────────────────────────────────────────────
export const updateSavedReportSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  type: z.string().max(50).optional(),
  config: z.any().optional(),
  filters: z.any().optional(),
  schedule: z.string().max(100).optional(),
});

// ── Params ──────────────────────────────────────────────────────────
export const reportIdParamSchema = z.object({
  id: z.string().min(1),
});
