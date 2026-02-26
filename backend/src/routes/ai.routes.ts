import express from 'express'
import rateLimit from 'express-rate-limit'
import * as aiController from '../controllers/ai.controller'
import * as scoringConfigController from '../controllers/scoring-config.controller'
import { authenticate } from '../middleware/auth'

const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,            // 100 requests per minute per user
  keyGenerator: (req: any) => req.user?.userId || 'anonymous',
  message: { success: false, message: 'Too many AI requests. Please wait a moment.' },
  validate: { xForwardedForHeader: false }
})

const router = express.Router()

// All AI routes require authentication
router.use(authenticate)
router.use(aiRateLimiter)

// AI Hub Overview & Stats
router.get('/stats', aiController.getAIStats)
router.get('/features', aiController.getAIFeatures)

// Model Performance & Training
router.get('/models/performance', aiController.getModelPerformance)
router.get('/models/training', aiController.getTrainingModels)
router.post('/models/training/upload', aiController.uploadTrainingData)

// Data Quality
router.get('/data-quality', aiController.getDataQuality)

// AI Insights & Recommendations
router.get('/insights', aiController.getInsights)
router.get('/insights/:id', aiController.getInsightById)
router.post('/insights/:id/dismiss', aiController.dismissInsight)
router.get('/recommendations', aiController.getRecommendations)

// Lead Scoring
router.get('/lead-score/:leadId', aiController.getLeadScore)
router.get('/lead/:leadId/score-factors', aiController.getLeadScoreFactors)
router.post('/recalculate-scores', aiController.recalculateScores)

// Model Recalibration
router.post('/recalibrate', aiController.recalibrateModel)
router.get('/recalibration-status', aiController.getRecalibrationStatus)

// Predictions
router.get('/predictions', aiController.getGlobalPredictions)
router.get('/predictions/:leadId', aiController.getPredictions)

// AI Assistant Features
router.post('/enhance-message', aiController.enhanceMessage)
router.post('/suggest-actions', aiController.suggestActions)

// AI Chatbot (OpenAI GPT-4)
router.post('/chat', aiController.chatWithAI)
router.get('/chat/history', aiController.getChatHistory)
router.delete('/chat/history', aiController.clearChatHistory)

// AI Usage Statistics
router.get('/usage', aiController.getAIUsage)

// Content Generation
router.post('/generate/email-sequence', aiController.generateEmailSequence)
router.post('/generate/sms', aiController.generateSMS)
router.post('/generate/property-description', aiController.generatePropertyDescription)
router.post('/generate/social-posts', aiController.generateSocialPosts)
router.post('/generate/listing-presentation', aiController.generateListingPresentation)

// AI Compose (Phase 1 & 2)
router.post('/compose', aiController.composeMessage)
router.post('/compose/variations', aiController.composeVariations)

// AI Compose Phase 3 - Streaming
router.post('/compose/stream', aiController.composeMessageStream)

// Templates (Phase 3)
router.get('/templates', aiController.getTemplates)
router.post('/templates/generate', aiController.generateTemplateMessage)
router.post('/templates/save', aiController.saveMessageAsTemplate)

// User Preferences (Phase 3)
router.get('/preferences', aiController.getPreferences)
router.post('/preferences', aiController.savePreferences)
router.post('/preferences/reset', aiController.resetPreferences)

// Feature Importance
router.get('/feature-importance', aiController.getFeatureImportance)

// Scoring Configuration
router.get('/scoring-config', scoringConfigController.getScoringConfig)
router.put('/scoring-config', scoringConfigController.updateScoringConfig)
router.post('/scoring-config/reset', scoringConfigController.resetScoringConfig)

export default router
