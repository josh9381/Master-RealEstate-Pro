import { z } from 'zod'

export const updateScoringConfigSchema = z.object({
  body: z.object({
    weights: z.object({
      engagement: z.number().min(0).max(100).optional(),
      demographic: z.number().min(0).max(100).optional(),
      behavior: z.number().min(0).max(100).optional(),
      timing: z.number().min(0).max(100).optional(),
    }).optional(),
    emailOpenWeight: z.number().min(0).max(100).optional(),
    emailClickWeight: z.number().min(0).max(100).optional(),
    emailReplyWeight: z.number().min(0).max(100).optional(),
    formSubmissionWeight: z.number().min(0).max(100).optional(),
    propertyInquiryWeight: z.number().min(0).max(100).optional(),
    scheduledApptWeight: z.number().min(0).max(100).optional(),
    completedApptWeight: z.number().min(0).max(100).optional(),
    emailOptOutPenalty: z.number().min(-200).max(0).optional(),
    recencyBonusMax: z.number().min(0).max(100).optional(),
    frequencyBonusMax: z.number().min(0).max(100).optional(),
  }),
})
