import { logger } from '../lib/logger'
import express from 'express'
import rateLimit from 'express-rate-limit'
import * as aiController from '../controllers/ai.controller'
import * as scoringConfigController from '../controllers/scoring-config.controller'
import { authenticate } from '../middleware/auth'
import { requireAdmin } from '../middleware/admin'
import { checkAIUsage } from '../middleware/aiUsageLimit'
import { validateBody, validateParams } from '../middleware/validate'
import {
  chatWithAISchema,
  enhanceMessageSchema,
  suggestActionsSchema,
  composeMessageSchema,
  composeVariationsSchema,
  composeStreamSchema,
  generateEmailSequenceSchema,
  generateSMSSchema,
  generatePropertyDescriptionSchema,
  generateSocialPostsSchema,
  generateListingPresentationSchema,
  generateTemplateMessageSchema,
  saveMessageAsTemplateSchema,
  savePreferencesSchema,
  uploadTrainingDataSchema,
  updateScoringConfigSchema,
  idParamSchema,
  leadIdParamSchema,
  updateOrgAISettingsSchema,
  chatFeedbackSchema,
  insightFeedbackSchema,
  applyEnrichmentSchema,
  updateBudgetSettingsSchema,
} from '../validators/ai.validator'
import { AI_PLAN_LIMITS } from '../config/subscriptions'
import prisma from '../config/database'
import { SubscriptionTier } from '@prisma/client'

// Cache tier lookups for 60s to avoid DB hit on every request
const tierCache = new Map<string, { tier: SubscriptionTier; expiresAt: number }>()

async function getUserTier(userId: string, organizationId: string): Promise<SubscriptionTier> {
  const cacheKey = organizationId
  const cached = tierCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.tier
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionTier: true },
    })
    const tier = org?.subscriptionTier || 'STARTER'
    tierCache.set(cacheKey, { tier, expiresAt: Date.now() + 60_000 })
    return tier
  } catch (error) {
    logger.error('[AI] Failed to get subscription tier:', error)
    return 'STARTER'
  }
}

// Dynamic per-tier rate limiter — reads aiRateLimit from subscription config
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: async (req: any) => {
    const userId = req.user?.userId
    const orgId = req.user?.organizationId
    if (!userId || !orgId) return 10 // Strictest limit for unauthenticated
    const tier = await getUserTier(userId, orgId)
    return AI_PLAN_LIMITS[tier]?.aiRateLimit || 10
  },
  keyGenerator: (req: any) => req.user?.userId || 'anonymous',
  message: { success: false, message: 'Too many AI requests. Please wait a moment.' },
  validate: { xForwardedForHeader: false }
})

const router = express.Router()

// All AI routes require authentication
router.use(authenticate)
router.use(aiRateLimiter)

// AI Hub Overview & Stats (read-only — no usage check needed)
router.get('/stats', aiController.getAIStats)
router.get('/features', aiController.getAIFeatures)

// Model Performance & Training (read-only except upload; upload is admin-only)
router.get('/models/performance', aiController.getModelPerformance)
router.get('/models/training', aiController.getTrainingModels)
router.post('/models/training/upload', requireAdmin, validateBody(uploadTrainingDataSchema), aiController.uploadTrainingData)

// Data Quality (read-only)
router.get('/data-quality', aiController.getDataQuality)

// AI Insights & Recommendations (read-only)
router.get('/insights', aiController.getInsights)
router.get('/insights/:id', aiController.getInsightById)
router.post('/insights/:id/dismiss', validateParams(idParamSchema), aiController.dismissInsight)
router.post('/insights/:id/act', validateParams(idParamSchema), aiController.actOnInsight)
router.get('/recommendations', aiController.getRecommendations)

// Lead Scoring
router.get('/lead-score/:leadId', aiController.getLeadScore)
router.get('/lead/:leadId/score-factors', aiController.getLeadScoreFactors)
router.post('/recalculate-scores', requireAdmin, checkAIUsage('scoringRecalculations'), aiController.recalculateScores)

// Model Recalibration (admin-only)
router.post('/recalibrate', requireAdmin, checkAIUsage('scoringRecalculations'), aiController.recalibrateModel)
router.get('/recalibration-status', aiController.getRecalibrationStatus)

// Predictions (read-only)
router.get('/predictions', aiController.getGlobalPredictions)
router.get('/predictions/:leadId', aiController.getPredictions)

// AI Assistant Features (usage-tracked)
router.post('/enhance-message', checkAIUsage('enhancements'), validateBody(enhanceMessageSchema), aiController.enhanceMessage)
router.post('/suggest-actions', validateBody(suggestActionsSchema), aiController.suggestActions)

// AI Chatbot (OpenAI GPT-4) — usage-tracked
router.post('/chat', checkAIUsage('aiMessages'), validateBody(chatWithAISchema), aiController.chatWithAI)
router.get('/chat/history', aiController.getChatHistory)
router.delete('/chat/history', aiController.clearChatHistory)

// AI Usage Statistics & Limits
router.get('/usage', aiController.getAIUsage)
router.get('/usage/limits', aiController.getAIUsageLimits)

// Content Generation — usage-tracked
router.post('/generate/email-sequence', checkAIUsage('contentGenerations'), validateBody(generateEmailSequenceSchema), aiController.generateEmailSequence)
router.post('/generate/sms', checkAIUsage('contentGenerations'), validateBody(generateSMSSchema), aiController.generateSMS)
router.post('/generate/property-description', checkAIUsage('contentGenerations'), validateBody(generatePropertyDescriptionSchema), aiController.generatePropertyDescription)
router.post('/generate/social-posts', checkAIUsage('contentGenerations'), validateBody(generateSocialPostsSchema), aiController.generateSocialPosts)
router.post('/generate/listing-presentation', checkAIUsage('contentGenerations'), validateBody(generateListingPresentationSchema), aiController.generateListingPresentation)

// AI Compose (Phase 1 & 2) — usage-tracked
router.post('/compose', checkAIUsage('composeUses'), validateBody(composeMessageSchema), aiController.composeMessage)
router.post('/compose/variations', checkAIUsage('composeUses'), validateBody(composeVariationsSchema), aiController.composeVariations)

// AI Compose Phase 3 - Streaming — usage-tracked
router.post('/compose/stream', checkAIUsage('composeUses'), validateBody(composeStreamSchema), aiController.composeMessageStream)

// Templates (Phase 3) — read/write, no AI usage
router.get('/templates', aiController.getTemplates)
router.post('/templates/generate', checkAIUsage('contentGenerations'), validateBody(generateTemplateMessageSchema), aiController.generateTemplateMessage)
router.post('/templates/save', validateBody(saveMessageAsTemplateSchema), aiController.saveMessageAsTemplate)

// User Preferences (Phase 3)
router.get('/preferences', aiController.getPreferences)
router.post('/preferences', validateBody(savePreferencesSchema), aiController.savePreferences)
router.post('/preferences/reset', aiController.resetPreferences)

// Feature Importance
router.get('/feature-importance', aiController.getFeatureImportance)

// Scoring Configuration (admin-only for write operations)
router.get('/scoring-config', scoringConfigController.getScoringConfig)
router.put('/scoring-config', requireAdmin, validateBody(updateScoringConfigSchema), scoringConfigController.updateScoringConfig)
router.post('/scoring-config/reset', requireAdmin, scoringConfigController.resetScoringConfig)

// ─── Phase 7: Org-Level AI Settings (admin for write) ───────────────
router.get('/org-settings', aiController.getOrgSettings)
router.put('/org-settings', requireAdmin, validateBody(updateOrgAISettingsSchema), aiController.updateOrgSettings)
router.get('/available-models', aiController.getAvailableModels)

// ─── Phase 7: Cost Dashboard ────────────────────────────────────────
router.get('/cost-dashboard', aiController.getCostDashboard)

// ─── Phase 7: Feedback ──────────────────────────────────────────────
router.post('/chat/:id/feedback', validateParams(idParamSchema), validateBody(chatFeedbackSchema), aiController.submitChatFeedback)
router.post('/insights/:id/feedback', validateParams(idParamSchema), validateBody(insightFeedbackSchema), aiController.submitInsightFeedback)
router.get('/feedback/stats', aiController.getFeedbackStats)

// ─── Phase 7: Lead Enrichment ───────────────────────────────────────
router.post('/enrich/:leadId', checkAIUsage('contentGenerations'), validateParams(leadIdParamSchema), aiController.enrichLead)
router.post('/enrich/:leadId/apply', validateParams(leadIdParamSchema), validateBody(applyEnrichmentSchema), aiController.applyEnrichment)

// ─── Phase 7: Budget Alerts ─────────────────────────────────────────
router.get('/budget-settings', aiController.getBudgetSettings)
router.put('/budget-settings', requireAdmin, validateBody(updateBudgetSettingsSchema), aiController.updateBudgetSettings)

export default router
