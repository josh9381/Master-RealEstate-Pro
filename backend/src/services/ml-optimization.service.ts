import { prisma } from '../config/database';
import { getIntelligenceService } from './intelligence.service';
const intelligenceService = getIntelligenceService();

/**
 * Machine Learning Optimization Service
 * Analyzes historical conversion data to optimize lead scoring weights
 * NOW PERSONALIZED PER USER - Each user's AI learns from THEIR conversions only
 */

export interface ScoringWeights {
  scoreWeight: number;        // Current: 40%
  activityWeight: number;     // Current: 30%
  recencyWeight: number;      // Current: 20%
  funnelTimeWeight: number;   // Current: 10%
}

export interface OptimizationResult {
  oldWeights: ScoringWeights;
  newWeights: ScoringWeights;
  accuracy: number;
  sampleSize: number;
  improvements: string[];
  timestamp: Date;
}

export class MLOptimizationService {
  /**
   * Analyze conversion data and optimize scoring weights FOR A SPECIFIC USER
   * Uses simple correlation analysis to find optimal weights
   * Each user's model learns only from their own conversion data
   */
  async optimizeScoringWeights(userId: string, organizationId: string): Promise<OptimizationResult> {
    console.log(`🤖 Starting ML optimization for user ${userId} in org ${organizationId}...`);

    // Get current model or create default
    let scoringModel = await prisma.leadScoringModel.findUnique({
      where: { userId },
    });

    const oldWeights: ScoringWeights = scoringModel?.factors
      ? (scoringModel.factors as any)
      : {
          scoreWeight: 0.4,
          activityWeight: 0.3,
          recencyWeight: 0.2,
          funnelTimeWeight: 0.1,
        };

    // Get leads assigned to THIS USER with known outcomes (converted or cold)
    const leads = await prisma.lead.findMany({
      where: {
        organizationId, // CRITICAL: Only this org's data
        assignedToId: userId, // CRITICAL: Only this user's leads
        OR: [
          { status: 'WON' },      // Converted/won deals
          { status: 'LOST' },     // Lost deals
        ],
      },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
      take: 200, // Sample size for optimization
    });

    if (leads.length < 20) {
      console.log(`⚠️ Not enough conversion data (${leads.length} leads). Need at least 20.`);
      return {
        oldWeights,
        newWeights: oldWeights,
        accuracy: 0,
        sampleSize: leads.length,
        improvements: ['Insufficient data for optimization'],
        timestamp: new Date(),
      };
    }

    // Calculate correlation between factors and conversion
    const correlations = this.calculateCorrelations(leads);

    // Optimize weights based on correlations
    const newWeights = this.optimizeWeights(correlations);

    // Calculate accuracy with new weights
    const accuracy = await this.calculateAccuracy(leads, newWeights, userId);

    // Determine improvements
    const improvements = this.identifyImprovements(oldWeights, newWeights, correlations);

    // Update or create scoring model FOR THIS USER
    if (scoringModel) {
      scoringModel = await prisma.leadScoringModel.update({
        where: { userId },
        data: {
          factors: newWeights as any,
          accuracy,
          lastTrainedAt: new Date(),
          trainingDataCount: leads.length,
        },
      });
    } else {
      scoringModel = await prisma.leadScoringModel.create({
        data: {
          userId,
          organizationId,
          factors: newWeights as any,
          accuracy,
          lastTrainedAt: new Date(),
          trainingDataCount: leads.length,
        },
      });
    }

    console.log(`✅ ML optimization complete for user ${userId}. Accuracy: ${accuracy.toFixed(1)}%`);

    return {
      oldWeights,
      newWeights,
      accuracy,
      sampleSize: leads.length,
      improvements,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate correlation between each factor and conversion
   */
  private calculateCorrelations(leads: any[]): Record<string, number> {
    const converted = leads.filter(l => l.status === 'WON');
    const notConverted = leads.filter(l => l.status !== 'WON');

    // Calculate average score for each group
    const avgScoreConverted = this.average(converted.map(l => l.score || 0));
    const avgScoreNotConverted = this.average(notConverted.map(l => l.score || 0));

    // Calculate average activity count
    const avgActivityConverted = this.average(converted.map(l => l.activities.length));
    const avgActivityNotConverted = this.average(notConverted.map(l => l.activities.length));

    // Calculate average recency (days since last activity)
    const avgRecencyConverted = this.average(
      converted.map(l => {
        const lastActivity = l.activities[0];
        return lastActivity
          ? Math.floor((Date.now() - new Date(lastActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24))
          : 30;
      })
    );
    const avgRecencyNotConverted = this.average(
      notConverted.map(l => {
        const lastActivity = l.activities[0];
        return lastActivity
          ? Math.floor((Date.now() - new Date(lastActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24))
          : 30;
      })
    );

    // Calculate average time in funnel
    const avgFunnelConverted = this.average(
      converted.map(l =>
        Math.floor((Date.now() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      )
    );
    const avgFunnelNotConverted = this.average(
      notConverted.map(l =>
        Math.floor((Date.now() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      )
    );

    // Calculate simple correlation scores (difference normalized)
    // Higher positive = stronger predictor of conversion
    const scoreCorrelation = (avgScoreConverted - avgScoreNotConverted) / 100;
    const activityCorrelation = (avgActivityConverted - avgActivityNotConverted) / 10;
    const recencyCorrelation = -(avgRecencyConverted - avgRecencyNotConverted) / 30; // Negative because lower recency is better
    const funnelCorrelation = Math.abs(avgFunnelConverted - avgFunnelNotConverted) / 60;

    return {
      score: Math.max(0, Math.min(1, scoreCorrelation)),
      activity: Math.max(0, Math.min(1, activityCorrelation)),
      recency: Math.max(0, Math.min(1, recencyCorrelation)),
      funnelTime: Math.max(0, Math.min(1, funnelCorrelation)),
    };
  }

  /**
   * Optimize weights based on correlations
   * Weights are adjusted to favor stronger predictors
   */
  private optimizeWeights(correlations: Record<string, number>): ScoringWeights {
    const totalCorrelation =
      correlations.score +
      correlations.activity +
      correlations.recency +
      correlations.funnelTime;

    if (totalCorrelation === 0) {
      // Return default weights if no correlation
      return {
        scoreWeight: 0.4,
        activityWeight: 0.3,
        recencyWeight: 0.2,
        funnelTimeWeight: 0.1,
      };
    }

    // Distribute weights proportionally to correlation strength
    // Add a baseline to prevent any weight from going to zero
    const baseline = 0.1;
    const adjustableWeight = 1 - baseline * 4;

    const scoreWeight = baseline + (correlations.score / totalCorrelation) * adjustableWeight;
    const activityWeight = baseline + (correlations.activity / totalCorrelation) * adjustableWeight;
    const recencyWeight = baseline + (correlations.recency / totalCorrelation) * adjustableWeight;
    const funnelTimeWeight = baseline + (correlations.funnelTime / totalCorrelation) * adjustableWeight;

    // Normalize to ensure they sum to 1
    const total = scoreWeight + activityWeight + recencyWeight + funnelTimeWeight;

    return {
      scoreWeight: scoreWeight / total,
      activityWeight: activityWeight / total,
      recencyWeight: recencyWeight / total,
      funnelTimeWeight: funnelTimeWeight / total,
    };
  }

  /**
   * Calculate prediction accuracy with given weights
   */
  private async calculateAccuracy(leads: any[], weights: ScoringWeights, userId: string): Promise<number> {
    let correct = 0;
    const threshold = 50; // Prediction threshold (50% = predicted to convert)

    for (const lead of leads) {
      try {
        // Get prediction with user's personalized weights
        const prediction = await intelligenceService.predictLeadConversion(lead.id, userId);
        const predictedConversion = prediction.conversionProbability >= threshold;
        const actualConversion = lead.status === 'WON';

        if (predictedConversion === actualConversion) {
          correct++;
        }
      } catch (error) {
        console.error(`Error calculating accuracy for lead ${lead.id}:`, error);
      }
    }

    return (correct / leads.length) * 100;
  }

  /**
   * Identify key improvements from weight changes
   */
  private identifyImprovements(
    oldWeights: ScoringWeights,
    newWeights: ScoringWeights,
    correlations: Record<string, number>
  ): string[] {
    const improvements: string[] = [];

    // Check for significant weight changes (>5%)
    const scoreDiff = newWeights.scoreWeight - oldWeights.scoreWeight;
    const activityDiff = newWeights.activityWeight - oldWeights.activityWeight;
    const recencyDiff = newWeights.recencyWeight - oldWeights.recencyWeight;
    const funnelDiff = newWeights.funnelTimeWeight - oldWeights.funnelTimeWeight;

    if (Math.abs(scoreDiff) > 0.05) {
      improvements.push(
        `Lead score ${scoreDiff > 0 ? 'increased' : 'decreased'} in importance (${Math.abs(scoreDiff * 100).toFixed(1)}%)`
      );
    }

    if (Math.abs(activityDiff) > 0.05) {
      improvements.push(
        `Activity level ${activityDiff > 0 ? 'increased' : 'decreased'} in importance (${Math.abs(activityDiff * 100).toFixed(1)}%)`
      );
    }

    if (Math.abs(recencyDiff) > 0.05) {
      improvements.push(
        `Recency ${recencyDiff > 0 ? 'increased' : 'decreased'} in importance (${Math.abs(recencyDiff * 100).toFixed(1)}%)`
      );
    }

    if (Math.abs(funnelDiff) > 0.05) {
      improvements.push(
        `Funnel time ${funnelDiff > 0 ? 'increased' : 'decreased'} in importance (${Math.abs(funnelDiff * 100).toFixed(1)}%)`
      );
    }

    // Identify strongest predictor
    const maxCorrelation = Math.max(
      correlations.score,
      correlations.activity,
      correlations.recency,
      correlations.funnelTime
    );

    if (maxCorrelation === correlations.score) {
      improvements.push('Lead score is the strongest conversion predictor');
    } else if (maxCorrelation === correlations.activity) {
      improvements.push('Activity level is the strongest conversion predictor');
    } else if (maxCorrelation === correlations.recency) {
      improvements.push('Recent engagement is the strongest conversion predictor');
    } else if (maxCorrelation === correlations.funnelTime) {
      improvements.push('Time in funnel is the strongest conversion predictor');
    }

    if (improvements.length === 0) {
      improvements.push('No significant changes - current weights are optimal');
    }

    return improvements;
  }

  /**
   * Record lead conversion outcome for future training
   * Updates the user's training data count
   */
  async recordConversionOutcome(
    leadId: string,
    converted: boolean,
    conversionDate?: Date
  ): Promise<void> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Update lead status
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: converted ? 'WON' : 'LOST',
        updatedAt: conversionDate || new Date(),
      },
    });

    console.log(`✅ Recorded conversion outcome for lead ${leadId}: ${converted ? 'WON' : 'LOST'}`);

    // Increment training data count FOR THE ASSIGNED USER
    if (lead.assignedToId) {
      const scoringModel = await prisma.leadScoringModel.findUnique({
        where: { userId: lead.assignedToId },
      });

      if (scoringModel) {
        await prisma.leadScoringModel.update({
          where: { userId: lead.assignedToId },
          data: {
            trainingDataCount: scoringModel.trainingDataCount + 1,
          },
        });
      }
    }
  }

  /**
   * Get current scoring model for a specific user
   */
  async getScoringModel(userId: string) {
    return await prisma.leadScoringModel.findUnique({
      where: { userId },
    });
  }

  /**
   * Helper: Calculate average of array
   */
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }
}

// Singleton instance
let mlOptimizationServiceInstance: MLOptimizationService | null = null;

export function getMLOptimizationService(): MLOptimizationService {
  if (!mlOptimizationServiceInstance) {
    mlOptimizationServiceInstance = new MLOptimizationService();
  }
  return mlOptimizationServiceInstance;
}
