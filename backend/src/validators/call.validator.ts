import { z } from 'zod';

/**
 * Call outcome values matching the CallOutcome Prisma enum
 */
const callOutcomeValues = [
  'ANSWERED',
  'VOICEMAIL',
  'LEFT_MESSAGE',
  'NO_ANSWER',
  'BUSY',
  'WRONG_NUMBER',
  'CALLBACK_SCHEDULED',
  'NOT_INTERESTED',
  'DNC_REQUEST',
] as const;

const callDirectionValues = ['INBOUND', 'OUTBOUND'] as const;

const callStatusValues = [
  'RINGING',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
  'BUSY',
  'NO_ANSWER',
  'VOICEMAIL',
  'CANCELLED',
] as const;

/**
 * Schema for logging a manual call
 */
export const logCallSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  direction: z.enum(callDirectionValues).default('OUTBOUND'),
  outcome: z.enum(callOutcomeValues),
  duration: z.number().int().min(0).max(86400).optional(), // seconds, max 24h
  notes: z.string().max(5000).optional(),
  followUpDate: z.string().datetime().optional(), // ISO 8601 string
});

/**
 * Schema for updating a call log
 */
export const updateCallSchema = z.object({
  outcome: z.enum(callOutcomeValues).optional(),
  duration: z.number().int().min(0).max(86400).optional(),
  notes: z.string().max(5000).optional(),
  followUpDate: z.string().datetime().nullable().optional(),
  status: z.enum(callStatusValues).optional(),
});

/**
 * Schema for call ID parameter
 */
export const callIdSchema = z.object({
  id: z.string().min(1, 'Call ID is required'),
});

/**
 * Schema for listing calls (query params)
 */
export const listCallsQuerySchema = z.object({
  leadId: z.string().optional(),
  direction: z.enum(callDirectionValues).optional(),
  outcome: z.enum(callOutcomeValues).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['createdAt', 'duration']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
