import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { getIntelligenceService } from '../services/intelligence.service';
import { getMLOptimizationService } from '../services/ml-optimization.service';

const intelligenceService = getIntelligenceService();
const mlOptimizationService = getMLOptimizationService();

/**
 * Get conversion probability prediction for a specific lead
 * GET /api/intelligence/leads/:id/prediction
 */
export async function getLeadPrediction(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const organizationId = req.user?.organizationId;

    if (!userId || !organizationId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Verify lead belongs to user's organization
    const lead = await prisma.lead.findUnique({
      where: { id },
      select: { organizationId: true },
    });

    if (!lead || lead.organizationId !== organizationId) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    // Pass userId for personalized prediction weights
    const prediction = await intelligenceService.predictLeadConversion(id, userId);

    res.json({
      success: true,
      data: prediction,
    });
  } catch (error: any) {
    console.error('Error getting lead prediction:', error);
    res.status(500).json({
      error: 'Failed to generate prediction',
      message: error.message,
    });
  }
}

/**
 * Get engagement analysis for a specific lead
 * GET /api/intelligence/leads/:id/engagement
 */
export async function getLeadEngagement(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const organizationId = req.user?.organizationId;

    if (!userId || !organizationId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Verify lead belongs to user's organization
    const lead = await prisma.lead.findUnique({
      where: { id },
      select: { organizationId: true },
    });

    if (!lead || lead.organizationId !== organizationId) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const engagement = await intelligenceService.analyzeLeadEngagement(id);

    res.json({
      success: true,
      data: engagement,
    });
  } catch (error: any) {
    console.error('Error analyzing lead engagement:', error);
    res.status(500).json({
      error: 'Failed to analyze engagement',
      message: error.message,
    });
  }
}

/**
 * Get AI-suggested next action for a specific lead
 * GET /api/intelligence/leads/:id/next-action
 */
export async function getNextAction(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const organizationId = req.user?.organizationId;

    if (!userId || !organizationId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Verify lead belongs to user's organization
    const lead = await prisma.lead.findUnique({
      where: { id },
      select: { organizationId: true },
    });

    if (!lead || lead.organizationId !== organizationId) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    // Pass userId for personalized action suggestions
    const action = await intelligenceService.suggestNextAction(id, userId);

    res.json({
      success: true,
      data: action,
    });
  } catch (error: any) {
    console.error('Error getting next action suggestion:', error);
    res.status(500).json({
      error: 'Failed to generate action suggestion',
      message: error.message,
    });
  }
}

/**
 * Get organization-wide insights and analytics
 * GET /api/intelligence/insights/dashboard
 */
export async function getDashboardInsights(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const organizationId = req.user?.organizationId;

    if (!userId || !organizationId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const insights = await intelligenceService.generateInsights(organizationId);

    res.json({
      success: true,
      data: insights,
    });
  } catch (error: any) {
    console.error('Error generating dashboard insights:', error);
    res.status(500).json({
      error: 'Failed to generate insights',
      message: error.message,
    });
  }
}

/**
 * Get trend analytics for the organization
 * GET /api/intelligence/analytics/trends
 */
export async function getTrends(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const organizationId = req.user?.organizationId;

    if (!userId || !organizationId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const insights = await intelligenceService.generateInsights(organizationId);

    res.json({
      success: true,
      data: {
        trends: insights.trends,
        summary: insights.summary,
      },
    });
  } catch (error: any) {
    console.error('Error getting trends:', error);
    res.status(500).json({
      error: 'Failed to get trends',
      message: error.message,
    });
  }
}

/**
 * Analyze multiple leads in batch
 * POST /api/intelligence/analyze-batch
 */
export async function analyzeBatch(req: Request, res: Response): Promise<void> {
  try {
    const { leadIds } = req.body;
    const userId = req.user?.userId;
    const organizationId = req.user?.organizationId;

    if (!userId || !organizationId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      res.status(400).json({ error: 'leadIds array is required' });
      return;
    }

    if (leadIds.length > 50) {
      res.status(400).json({ error: 'Maximum 50 leads per batch' });
      return;
    }

    // Verify all leads belong to user's organization
    const leads = await prisma.lead.findMany({
      where: {
        id: { in: leadIds },
        organizationId,
      },
      select: { id: true },
    });

    if (leads.length !== leadIds.length) {
      res.status(403).json({ error: 'Some leads not found or access denied' });
      return;
    }

    // Analyze all leads in parallel with personalized weights
    const results = await Promise.all(
      leadIds.map(async (leadId) => {
        try {
          const [prediction, engagement, action] = await Promise.all([
            intelligenceService.predictLeadConversion(leadId, userId), // Personalized
            intelligenceService.analyzeLeadEngagement(leadId),
            intelligenceService.suggestNextAction(leadId, userId), // Personalized
          ]);

          return {
            leadId,
            success: true,
            prediction,
            engagement,
            action,
          };
        } catch (error: any) {
          return {
            leadId,
            success: false,
            error: error.message,
          };
        }
      })
    );

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    res.json({
      success: true,
      data: {
        analyzed: successful.length,
        failed: failed.length,
        results: successful,
        errors: failed,
      },
    });
  } catch (error: any) {
    console.error('Error in batch analysis:', error);
    res.status(500).json({
      error: 'Failed to analyze batch',
      message: error.message,
    });
  }
}

/**
 * Run ML optimization on scoring weights
 * POST /api/intelligence/optimize-scoring
 */
export async function optimizeScoring(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const organizationId = req.user?.organizationId;

    if (!userId || !organizationId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Optimize scoring model for THIS USER (personalized learning)
    const result = await mlOptimizationService.optimizeScoringWeights(userId, organizationId);

    res.json({
      success: true,
      data: result,
      message: `Optimization complete. Accuracy: ${result.accuracy.toFixed(1)}% (${result.sampleSize} leads analyzed)`,
    });
  } catch (error: any) {
    console.error('Error optimizing scoring:', error);
    res.status(500).json({
      error: 'Failed to optimize scoring',
      message: error.message,
    });
  }
}

/**
 * Record lead conversion outcome for ML training
 * POST /api/intelligence/record-conversion
 */
export async function recordConversion(req: Request, res: Response): Promise<void> {
  try {
    const { leadId, converted, conversionDate } = req.body;
    const userId = req.user?.userId;
    const organizationId = req.user?.organizationId;

    if (!userId || !organizationId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!leadId || typeof converted !== 'boolean') {
      res.status(400).json({ error: 'leadId and converted (boolean) are required' });
      return;
    }

    // Verify lead belongs to user's organization
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { organizationId: true },
    });

    if (!lead || lead.organizationId !== organizationId) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    await mlOptimizationService.recordConversionOutcome(
      leadId,
      converted,
      conversionDate ? new Date(conversionDate) : undefined
    );

    res.json({
      success: true,
      message: 'Conversion outcome recorded successfully',
    });
  } catch (error: any) {
    console.error('Error recording conversion:', error);
    res.status(500).json({
      error: 'Failed to record conversion',
      message: error.message,
    });
  }
}

/**
 * Get current scoring model and accuracy
 * GET /api/intelligence/scoring-model
 * NOW RETURNS USER-SPECIFIC MODEL
 */
export async function getScoringModel(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const organizationId = req.user?.organizationId;

    if (!userId || !organizationId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get user-specific model (not organization-wide)
    const model = await mlOptimizationService.getScoringModel(userId);

    if (!model) {
      res.json({
        success: true,
        data: {
          exists: false,
          personalized: false,
          message: 'No personalized model yet. Using default weights. Close more deals to train your AI.',
          defaultWeights: {
            scoreWeight: 0.4,
            activityWeight: 0.3,
            recencyWeight: 0.2,
            funnelTimeWeight: 0.1,
          },
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        exists: true,
        personalized: true,
        weights: model.factors,
        accuracy: model.accuracy,
        lastTrainedAt: model.lastTrainedAt,
        trainingDataCount: model.trainingDataCount,
        message: `Your personalized AI model trained on ${model.trainingDataCount} conversions`,
      },
    });
  } catch (error: any) {
    console.error('Error getting scoring model:', error);
    res.status(500).json({
      error: 'Failed to get scoring model',
      message: error.message,
    });
  }
}
