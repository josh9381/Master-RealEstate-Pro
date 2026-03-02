import { z } from 'zod';

// ── Create Segment ──────────────────────────────────────────────────
export const createSegmentSchema = z.object({
  name: z.string().min(1, 'Segment name is required').max(200),
  description: z.string().max(1000).optional(),
  rules: z.any(), // Complex rule structure — validated at service layer
  matchType: z.enum(['ALL', 'ANY']).optional(),
});

// ── Update Segment ──────────────────────────────────────────────────
export const updateSegmentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  rules: z.any().optional(),
  matchType: z.enum(['ALL', 'ANY']).optional(),
});

// ── Params ──────────────────────────────────────────────────────────
export const segmentIdParamSchema = z.object({
  id: z.string().min(1),
});
