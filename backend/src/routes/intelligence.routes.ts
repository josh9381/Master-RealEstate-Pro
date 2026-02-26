import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { cacheResponse } from '../middleware/cache';
import * as intelligenceController from '../controllers/intelligence.controller';

const router = Router();

// All intelligence routes require authentication
router.use(authenticate);

/**
 * GET /api/intelligence/leads/:id/prediction
 * Get conversion probability prediction for a specific lead
 */
router.get('/leads/:id/prediction', cacheResponse(180), intelligenceController.getLeadPrediction);

/**
 * GET /api/intelligence/leads/:id/engagement
 * Get engagement analysis for a specific lead
 */
router.get('/leads/:id/engagement', cacheResponse(180), intelligenceController.getLeadEngagement);

/**
 * GET /api/intelligence/leads/:id/next-action
 * Get AI-suggested next action for a specific lead
 */
router.get('/leads/:id/next-action', cacheResponse(120), intelligenceController.getNextAction);

/**
 * GET /api/intelligence/insights/dashboard
 * Get organization-wide insights and analytics
 */
router.get('/insights/dashboard', cacheResponse(120), intelligenceController.getDashboardInsights);

/**
 * GET /api/intelligence/analytics/trends
 * Get trend analytics for the organization
 */
router.get('/analytics/trends', cacheResponse(300), intelligenceController.getTrends);

/**
 * POST /api/intelligence/analyze-batch
 * Analyze multiple leads in batch
 * Body: { leadIds: string[] }
 */
router.post('/analyze-batch', intelligenceController.analyzeBatch);

/**
 * POST /api/intelligence/optimize-scoring
 * Run ML optimization on scoring weights
 */
router.post('/optimize-scoring', intelligenceController.optimizeScoring);

/**
 * POST /api/intelligence/record-conversion
 * Record lead conversion outcome for ML training
 * Body: { leadId: string, converted: boolean, conversionDate?: string }
 */
router.post('/record-conversion', intelligenceController.recordConversion);

/**
 * GET /api/intelligence/scoring-model
 * Get current scoring model and accuracy
 */
router.get('/scoring-model', intelligenceController.getScoringModel);

export default router;
