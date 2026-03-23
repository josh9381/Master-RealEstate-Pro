import { z } from 'zod';

// ── Chat ────────────────────────────────────────────────────────────
export const chatWithAISchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).optional(),
  tone: z.string().max(50).optional(),
  confirmed: z.boolean().optional(),
});

// ── Enhance Message ─────────────────────────────────────────────────
export const enhanceMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000),
  type: z.string().max(50).optional(),
  tone: z.string().max(50).optional(),
});

// ── Suggest Actions ─────────────────────────────────────────────────
export const suggestActionsSchema = z.object({
  context: z.string().max(2000).optional(),
  leadId: z.string().optional(),
  campaignId: z.string().optional(),
});

// ── Compose ─────────────────────────────────────────────────────────
const composeSettingsSchema = z.object({
  tone: z.string().max(50).optional(),
  length: z.string().max(50).optional(),
  includeCTA: z.boolean().optional(),
  personalization: z.string().max(100).optional(),
}).optional();

export const composeMessageSchema = z.object({
  leadId: z.string().optional(),
  conversationId: z.string().optional(),
  messageType: z.string().max(50).optional(),
  draftMessage: z.string().max(10000).optional(),
  settings: composeSettingsSchema,
  leadName: z.string().max(200).optional(),
  leadEmail: z.string().email().optional().or(z.literal('')),
  leadPhone: z.string().max(30).optional(),
  tone: z.string().max(50).optional(),
  purpose: z.string().max(200).optional(),
  context: z.string().max(2000).optional(),
});

export const composeVariationsSchema = z.object({
  leadId: z.string().optional(),
  conversationId: z.string().optional(),
  messageType: z.string().max(50).optional(),
  draftMessage: z.string().max(10000).optional(),
  settings: composeSettingsSchema,
});

export const composeStreamSchema = composeVariationsSchema;

// ── Content Generation ──────────────────────────────────────────────
export const generateEmailSequenceSchema = z.object({
  leadName: z.string().min(1).max(200),
  propertyType: z.string().max(100).optional(),
  goal: z.string().max(200).optional(),
  tone: z.string().max(50).optional(),
  sequenceLength: z.number().int().min(1).max(20).optional(),
});

export const generateSMSSchema = z.object({
  leadName: z.string().min(1).max(200),
  propertyType: z.string().max(100).optional(),
  goal: z.string().max(200).optional(),
  tone: z.string().max(50).optional(),
});

export const generatePropertyDescriptionSchema = z.object({
  address: z.string().min(1).max(500),
  propertyType: z.string().max(100).optional(),
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().min(0).max(50).optional(),
  squareFeet: z.number().min(0).max(1000000).optional(),
  price: z.number().min(0).optional(),
  features: z.array(z.string().max(200)).optional(),
  neighborhood: z.string().max(500).optional(),
});

export const generateSocialPostsSchema = z.object({
  topic: z.string().min(1).max(500),
  propertyAddress: z.string().max(500).optional(),
  platforms: z.array(z.string().max(50)).optional(),
  tone: z.string().max(50).optional(),
});

export const generateListingPresentationSchema = z.object({
  address: z.string().min(1).max(500),
  propertyType: z.string().max(100).optional(),
  estimatedValue: z.number().min(0).optional(),
  comparables: z.array(z.any()).optional(),
  marketTrends: z.any().optional(),
});

// ── Templates ───────────────────────────────────────────────────────
export const generateTemplateMessageSchema = z.object({
  templateId: z.string().min(1),
  leadId: z.string().optional(),
  conversationId: z.string().optional(),
  tone: z.string().max(50).optional(),
});

export const saveMessageAsTemplateSchema = z.object({
  message: z.string().min(1).max(10000),
  name: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
});

// ── Preferences ─────────────────────────────────────────────────────
export const savePreferencesSchema = z.object({
  defaultTone: z.string().max(50).optional(),
  defaultLength: z.string().max(50).optional(),
  defaultCTA: z.boolean().optional(),
  preferredModels: z.array(z.string()).optional(),
  customPrompts: z.record(z.string(), z.string()).optional(),
}).passthrough(); // Allow legacy flat format

// ── Training ────────────────────────────────────────────────────────
export const uploadTrainingDataSchema = z.object({
  modelType: z.string().min(1).max(50),
  data: z.any(),
});

// ── Scoring Config ──────────────────────────────────────────────────
export const updateScoringConfigSchema = z.object({
  weights: z.record(z.string(), z.number()).optional(),
  emailOpenWeight: z.number().min(0).max(100).optional(),
  emailClickWeight: z.number().min(0).max(100).optional(),
  emailReplyWeight: z.number().min(0).max(100).optional(),
  formSubmissionWeight: z.number().min(0).max(100).optional(),
  propertyInquiryWeight: z.number().min(0).max(100).optional(),
  scheduledApptWeight: z.number().min(0).max(100).optional(),
  completedApptWeight: z.number().min(0).max(100).optional(),
  emailOptOutPenalty: z.number().min(-100).max(0).optional(),
  recencyBonusMax: z.number().min(0).max(100).optional(),
  frequencyBonusMax: z.number().min(0).max(100).optional(),
});

// ── Params ──────────────────────────────────────────────────────────
export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const leadIdParamSchema = z.object({
  leadId: z.string().min(1),
});

// ── Phase 7: Org AI Settings ────────────────────────────────────────
export const updateOrgAISettingsSchema = z.object({
  openaiApiKey: z.string().max(200).optional(),
  openaiOrgId: z.string().max(200).optional(),
  useOwnAIKey: z.boolean().optional(),
  aiSystemPrompt: z.string().max(5000).optional(),
  aiDefaultTone: z.string().max(50).optional(),
  aiDefaultModel: z.string().max(100).optional(),
  aiMaxTokensPerRequest: z.number().int().min(100).max(10000).optional(),
  aiMonthlyTokenBudget: z.number().int().min(0).optional(),
  aiIndustryContext: z.string().max(2000).optional(),
  aiBudgetWarning: z.number().min(0).max(100000).optional(),
  aiBudgetCaution: z.number().min(0).max(100000).optional(),
  aiBudgetHardLimit: z.number().min(0).max(100000).optional(),
  aiBudgetAlertEnabled: z.boolean().optional(),
});

// ── Phase 7: Feedback ───────────────────────────────────────────────
export const chatFeedbackSchema = z.object({
  feedback: z.enum(['positive', 'negative']),
  note: z.string().max(1000).optional(),
});

export const insightFeedbackSchema = z.object({
  feedback: z.enum(['helpful', 'not_helpful']),
});

// ── Phase 7: Lead Enrichment ────────────────────────────────────────
export const applyEnrichmentSchema = z.object({
  fields: z.object({
    propertyType: z.string().max(100).optional(),
    transactionType: z.string().max(100).optional(),
    budgetMin: z.number().min(0).optional(),
    budgetMax: z.number().min(0).optional(),
    desiredLocation: z.string().max(500).optional(),
    moveInTimeline: z.string().max(100).optional(),
  }),
});

// ── Phase 7: Budget Settings ────────────────────────────────────────
export const updateBudgetSettingsSchema = z.object({
  warning: z.number().min(0).max(100000).optional(),
  caution: z.number().min(0).max(100000).optional(),
  hardLimit: z.number().min(0).max(100000).optional(),
  alertEnabled: z.boolean().optional(),
});
