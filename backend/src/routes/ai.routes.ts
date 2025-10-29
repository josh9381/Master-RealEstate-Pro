import express from 'express'
import * as aiController from '../controllers/ai.controller'
import { authenticate } from '../middleware/auth'

const router = express.Router()

// All AI routes require authentication
router.use(authenticate)

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
router.post('/recalculate-scores', aiController.recalculateScores)

// Predictions
router.get('/predictions/:leadId', aiController.getPredictions)

// AI Assistant Features
router.post('/enhance-message', aiController.enhanceMessage)
router.post('/suggest-actions', aiController.suggestActions)

// Feature Importance
router.get('/feature-importance', aiController.getFeatureImportance)

export default router
