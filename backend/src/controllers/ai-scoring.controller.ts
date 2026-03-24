import { getErrorMessage } from '../utils/errors'
import { logger } from '../lib/logger'
import { Request, Response } from 'express'
import { getIntelligenceService } from '../services/intelligence.service'
import { getOpenAIService } from '../services/openai.service'
import { updateMultipleLeadScores, getLeadScoreBreakdown } from '../services/leadScoring.service'
import { incrementAIUsage } from '../services/usage-tracking.service'
import prisma from '../config/database'
import { calcRate, calcLeadConversionRate } from '../utils/metricsCalculator'

export const getModelPerformance = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId

    const history = await prisma.modelPerformanceHistory.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        modelType: true,
        accuracyBefore: true,
        accuracyAfter: true,
        sampleSize: true,
        improvements: true,
        trainingDuration: true,
        createdAt: true,
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    })

    // Also get current model stats
    const models = await prisma.leadScoringModel.findMany({
      where: { organizationId },
      select: {
        id: true,
        accuracy: true,
        lastTrainedAt: true,
        trainingDataCount: true,
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    })

    res.json({
      success: true,
      data: {
        history: history.map(h => ({
          id: h.id,
          modelType: h.modelType,
          accuracyBefore: h.accuracyBefore,
          accuracyAfter: h.accuracyAfter,
          sampleSize: h.sampleSize,
          improvements: h.improvements,
          trainingDuration: h.trainingDuration,
          date: h.createdAt,
          user: `${h.user.firstName} ${h.user.lastName}`,
        })),
        currentModels: models.map(m => ({
          id: m.id,
          accuracy: m.accuracy,
          lastTrainedAt: m.lastTrainedAt,
          trainingDataCount: m.trainingDataCount,
          user: `${m.user.firstName} ${m.user.lastName}`,
        })),
        summary: {
          totalRecalibrations: history.length,
          avgAccuracy: history.length > 0
            ? Math.round(history.reduce((s, h) => s + h.accuracyAfter, 0) / history.length * 10) / 10
            : 0,
          activeModels: models.length,
        },
      },
    })
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch model performance',
      error: getErrorMessage(error)
    })
  }
}

/**
 * Get active training models — returns real LeadScoringModel records
 * Phase 1B
 */
export const getTrainingModels = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId

    const models = await prisma.leadScoringModel.findMany({
      where: { organizationId },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Get recent performance history for each model
    const performanceHistory = await prisma.modelPerformanceHistory.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    res.json({
      success: true,
      data: models.map(m => ({
        id: m.id,
        userId: m.userId,
        userName: `${m.user.firstName} ${m.user.lastName}`,
        userEmail: m.user.email,
        modelType: 'lead_scoring',
        status: m.lastTrainedAt ? 'trained' : 'untrained',
        accuracy: m.accuracy,
        lastTrainedAt: m.lastTrainedAt,
        trainingDataCount: m.trainingDataCount,
        factors: m.factors,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        recentHistory: performanceHistory
          .filter(h => h.userId === m.userId)
          .slice(0, 5)
          .map(h => ({
            accuracyBefore: h.accuracyBefore,
            accuracyAfter: h.accuracyAfter,
            sampleSize: h.sampleSize,
            date: h.createdAt,
          })),
      })),
    })
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch training models',
      error: getErrorMessage(error)
    })
  }
}

/**
 * Upload training data — processes lead conversion data to improve scoring
 *
 * Accepts an array of { leadId, converted: boolean } records.
 * Updates leads with actual outcomes, bumps the model's trainingDataCount,
 * and triggers an asynchronous recalibration.
 */
export const uploadTrainingData = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const userId = req.user!.userId
    const { modelType, data } = req.body

    if (!modelType || !data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'modelType (string) and data (non-empty array of { leadId, converted }) are required',
      })
    }

    // Validate and apply conversion outcomes to leads
    let processed = 0
    let skipped = 0
    for (const record of data) {
      if (!record.leadId || typeof record.converted !== 'boolean') {
        skipped++
        continue
      }
      // Only update leads belonging to this org
      const lead = await prisma.lead.findFirst({
        where: { id: record.leadId, organizationId },
        select: { id: true },
      })
      if (!lead) {
        skipped++
        continue
      }
      // Mark the lead's outcome
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: record.converted ? 'WON' : 'LOST',
          ...(record.converted ? { stage: 'WON' } : {}),
        },
      })
      processed++
    }

    // Update the model's training data count
    await prisma.leadScoringModel.upsert({
      where: { userId },
      create: {
        userId,
        organizationId,
        trainingDataCount: processed,
        factors: { engagement: 30, demographic: 25, behavior: 25, timing: 20 },
      },
      update: {
        trainingDataCount: { increment: processed },
      },
    })

    // Respond immediately, then kick off a background recalibration
    res.json({
      success: true,
      message: `Training data processed: ${processed} records applied, ${skipped} skipped`,
      data: {
        modelType,
        recordsUploaded: data.length,
        recordsProcessed: processed,
        recordsSkipped: skipped,
        status: 'processing',
        message: 'Training data applied. Recalibration started in background.',
      },
    })

    // Fire-and-forget recalibration with the new data
    if (processed > 0) {
      // Capture accuracy BEFORE optimization writes the new value
      const preModel = await prisma.leadScoringModel.findUnique({ where: { userId } })
      const accuracyBefore = preModel?.accuracy ?? null

      import('../services/ml-optimization.service')
        .then(({ getMLOptimizationService }) => {
          const mlService = getMLOptimizationService()
          return mlService.optimizeScoringWeights(userId, organizationId)
        })
        .then(async (result) => {
          await prisma.modelPerformanceHistory.create({
            data: {
              organizationId,
              userId,
              modelType: modelType || 'lead_scoring',
              accuracyBefore,
              accuracyAfter: result.accuracy,
              sampleSize: result.sampleSize,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              improvements: result.improvements as any,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              metadata: { source: 'training_upload', recordsProcessed: processed } as any,
            },
          })
          logger.info(`✅ Training upload recalibration complete for user ${userId}: accuracy ${result.accuracy}%`)
        })
        .catch((err) => {
          logger.error(`❌ Training upload recalibration failed for user ${userId}:`, err)
        })
    }
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to upload training data',
      error: getErrorMessage(error),
    })
  }
}

/**
 * Get data quality metrics — uses real database analysis
 */
export const getDataQuality = async (req: Request, res: Response) => {
  try {
    const intelligence = getIntelligenceService()
    const quality = await intelligence.getDataQuality()
    
    res.json({
      success: true,
      data: quality
    })
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch data quality metrics',
      error: getErrorMessage(error)
    })
  }
}

/**
 * Get AI-generated insights — Phase 1C: real data-driven insights
 * Generated from DB analysis, not OpenAI calls
 */
export const getLeadScore = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params
    const intelligence = getIntelligenceService()
    const score = await intelligence.calculateLeadScore(leadId)
    
    res.json({
      success: true,
      data: score
    })
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to calculate lead score',
      error: getErrorMessage(error)
    })
  }
}

/**
 * GET /api/ai/lead/:leadId/score-factors
 * Returns detailed breakdown of why a lead has its score
 */
export const getLeadScoreFactors = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params
    const breakdown = await getLeadScoreBreakdown(leadId)
    res.json({ success: true, data: breakdown })
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to get score factors',
      error: getErrorMessage(error),
    })
  }
}

/**
 * Recalculate scores for all leads
 */
export const recalculateScores = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const userId = req.user!.userId

    const leads = await prisma.lead.findMany({
      where: { organizationId },
      select: { id: true },
    })

    if (leads.length === 0) {
      return res.json({
        success: true,
        message: 'No leads to recalculate',
        data: { status: 'completed', leadsProcessed: 0 },
      })
    }

    // Respond immediately, then process in background
    res.json({
      success: true,
      message: 'Score recalculation initiated',
      data: {
        status: 'initiated',
        leadsToProcess: leads.length,
        estimatedTime: `${Math.ceil(leads.length / 100)} minutes`,
      },
    })

    // Fire-and-forget: recalculate with user's custom weights
    const leadIds = leads.map((l) => l.id)
    updateMultipleLeadScores(leadIds, userId).catch((err) => {
      logger.error('Background recalculation error:', err)
    })

    // Track usage
    await incrementAIUsage(organizationId, 'scoringRecalculations')
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to recalculate scores',
      error: getErrorMessage(error),
    })
  }
}

/**
 * GET /api/ai/predictions — Global predictions from real org data
 * Returns conversion trends, pipeline velocity, revenue forecast
 */
export const getGlobalPredictions = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId

    // Get leads with their activities for trend analysis
    const leads = await prisma.lead.findMany({
      where: { organizationId },
      include: {
        activities: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 1. Monthly conversion rates (last 6 months)
    const now = new Date()
    const monthlyConversions: Array<{ month: string; converted: number; total: number; rate: number }> = []
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      const monthLabel = start.toLocaleString('en', { month: 'short', year: '2-digit' })
      const monthLeads = leads.filter(l => l.createdAt >= start && l.createdAt <= end)
      const converted = monthLeads.filter(l => l.status === 'WON').length
      const total = monthLeads.length
      monthlyConversions.push({
        month: monthLabel,
        converted,
        total,
        rate: calcLeadConversionRate(converted, total),
      })
    }

    // 2. Pipeline velocity — avg days per stage transition
    const stageOrder = ['NEW', 'CONTACTED', 'NURTURING', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON']
    const stageLeads = leads.filter(l => l.stage && stageOrder.includes(l.stage))
    const avgDaysInPipeline = stageLeads.length > 0
      ? Math.round(stageLeads.reduce((sum, l) => {
          const days = Math.floor((now.getTime() - l.createdAt.getTime()) / (1000 * 60 * 60 * 24))
          return sum + days
        }, 0) / stageLeads.length)
      : 0

    // Stage distribution
    const stageDistribution = stageOrder.map(stage => ({
      stage,
      count: leads.filter(l => l.stage === stage).length,
    }))

    // 3. Revenue forecast — project from deal values
    const wonLeads = leads.filter(l => l.status === 'WON')
    const totalRevenue = wonLeads.reduce((sum, l) => sum + (l.value || 0), 0)
    const avgMonthlyRevenue = totalRevenue > 0 ? Math.round(totalRevenue / 6) : 0
    
    // Leads in late pipeline stages (PROPOSAL, NEGOTIATION) — potential revenue
    const pipelineLeads = leads.filter(l => l.stage === 'PROPOSAL' || l.stage === 'NEGOTIATION')
    const pipelineValue = pipelineLeads.reduce((sum, l) => sum + (l.value || 0), 0)
    
    // Simple linear projection for next 3 months
    const revenueRates = monthlyConversions.map(m => m.rate)
    const avgRate = revenueRates.length > 0
      ? revenueRates.reduce((s, r) => s + r, 0) / revenueRates.length
      : 0
    const trend = revenueRates.length >= 2
      ? (revenueRates[revenueRates.length - 1] - revenueRates[0]) / revenueRates.length
      : 0

    const revenueForecast = []
    for (let i = 1; i <= 3; i++) {
      const projectedMonth = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const label = projectedMonth.toLocaleString('en', { month: 'short', year: '2-digit' })
      revenueForecast.push({
        month: label,
        predicted: Math.round(avgMonthlyRevenue * (1 + trend * i / 100)),
        confidence: Math.max(50, Math.round(85 - i * 10)),
      })
    }

    // 4. Build predictions list
    const predictions = []

    // Conversion trend prediction
    const lastRate = monthlyConversions.length > 0 ? monthlyConversions[monthlyConversions.length - 1].rate : 0
    predictions.push({
      id: 'conversion-trend',
      title: 'Conversion Rate Trend',
      prediction: trend >= 0
        ? `Conversion rate trending up — projected ${Math.min(100, Math.round(lastRate + trend * 3))}% in 3 months`
        : `Conversion rate declining — projected ${Math.max(0, Math.round(lastRate + trend * 3))}% in 3 months`,
      confidence: Math.round(70 + Math.min(20, leads.length / 10)),
      impact: Math.abs(trend) > 2 ? 'high' : 'medium',
      status: trend >= 0 ? 'positive' : 'warning',
      details: `Based on ${leads.length} leads over 6 months (current rate: ${lastRate}%)`,
      dataPoints: leads.length,
    })

    // Pipeline velocity prediction
    predictions.push({
      id: 'pipeline-velocity',
      title: 'Pipeline Velocity',
      prediction: avgDaysInPipeline > 30
        ? `Avg deal cycle is ${avgDaysInPipeline} days — consider optimizing follow-ups`
        : `Avg deal cycle is ${avgDaysInPipeline} days — healthy velocity`,
      confidence: stageLeads.length > 5 ? 80 : 60,
      impact: avgDaysInPipeline > 45 ? 'high' : 'medium',
      status: avgDaysInPipeline > 45 ? 'warning' : 'positive',
      details: `${stageLeads.length} leads actively in pipeline`,
      dataPoints: stageLeads.length,
    })

    // Revenue forecast prediction
    if (pipelineValue > 0) {
      predictions.push({
        id: 'revenue-forecast',
        title: 'Revenue Pipeline',
        prediction: `$${pipelineValue.toLocaleString()} in late-stage pipeline (${pipelineLeads.length} deals)`,
        confidence: 75,
        impact: pipelineValue > avgMonthlyRevenue ? 'high' : 'medium',
        status: 'positive',
        details: `${pipelineLeads.length} deals in Proposal/Negotiation stage`,
        dataPoints: pipelineLeads.length,
      })
    }

    // At-risk leads prediction
    const atRiskLeads = leads.filter(l => {
      if (!l.lastContactAt) return true
      const daysSinceContact = Math.floor((now.getTime() - l.lastContactAt.getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceContact > 14 && l.status !== 'WON' && l.status !== 'LOST'
    })
    if (atRiskLeads.length > 0) {
      predictions.push({
        id: 'at-risk',
        title: 'At-Risk Leads',
        prediction: `${atRiskLeads.length} leads haven't been contacted in 14+ days`,
        confidence: 90,
        impact: atRiskLeads.length > 5 ? 'high' : 'medium',
        status: 'warning',
        details: `These leads may disengage without follow-up`,
        dataPoints: atRiskLeads.length,
      })
    }

    // Stats summary
    const totalPredictions = predictions.length
    const avgConfidence = totalPredictions > 0
      ? Math.round(predictions.reduce((s, p) => s + p.confidence, 0) / totalPredictions)
      : 0
    const highImpact = predictions.filter(p => p.impact === 'high').length

    res.json({
      success: true,
      data: {
        predictions,
        stats: {
          activePredictions: totalPredictions,
          avgConfidence,
          highImpactAlerts: highImpact,
          accuracy: Math.round(avgRate),
        },
        conversionTrend: monthlyConversions,
        revenueForecast: [
          ...monthlyConversions.map(m => ({ month: m.month, actual: m.converted * (avgMonthlyRevenue > 0 ? Math.round(avgMonthlyRevenue / (m.total || 1)) : 1000) })),
          ...revenueForecast,
        ],
        stageDistribution,
        pipelineSummary: {
          avgDaysInPipeline,
          totalPipelineValue: pipelineValue,
          activeDeals: stageLeads.length,
        },
      }
    })
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate global predictions',
      error: getErrorMessage(error),
    })
  }
}

/**
 * Get predictions for a specific lead — uses real intelligence service
 */
export const getPredictions = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params
    const intelligence = getIntelligenceService()
    const prediction = await intelligence.predictLeadConversion(leadId)
    
    res.json({
      success: true,
      data: {
        leadId,
        conversionProbability: prediction.conversionProbability,
        estimatedTimeToConversion: prediction.conversionProbability >= 80 ? '7-14 days' : prediction.conversionProbability >= 60 ? '14-30 days' : '30+ days',
        recommendedActions: [
          'Schedule a follow-up call',
          'Send personalized email',
          'Share relevant case study'
        ],
        churnRisk: prediction.conversionProbability < 50 ? 'high' : prediction.conversionProbability < 70 ? 'medium' : 'low',
        nextBestAction: prediction.conversionProbability >= 70 ? 'Close deal' : 'Nurture relationship',
        confidence: prediction.confidence,
        factors: prediction.factors,
        reasoning: prediction.reasoning,
      }
    })
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate predictions',
      error: getErrorMessage(error)
    })
  }
}

/**
 * Enhance a message using AI — uses real intelligence service
 */
export const getFeatureImportance = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId

    // Try to load actual scoring model factors for this org
    const model = await prisma.leadScoringModel.findFirst({
      where: { organizationId },
      orderBy: { lastTrainedAt: 'desc' },
    })

    const factors = (model?.factors as Record<string, number> | null) ?? {}
    const scoringConfig = await prisma.scoringConfig.findUnique({ where: { organizationId } })
    const configWeights = (scoringConfig?.weights as Record<string, number> | null) ?? {}

    // Build dynamic weights: prefer model factors, then scoring config, then defaults
    const scoreWeight   = factors.scoreWeight   ?? configWeights.scoreWeight   ?? 30
    const activityWeight = factors.activityWeight ?? configWeights.activityWeight ?? 30
    const recencyWeight  = factors.recencyWeight  ?? configWeights.recencyWeight  ?? 20
    const funnelWeight   = factors.funnelTimeWeight ?? configWeights.funnelTimeWeight ?? 20

    const weights: Record<string, { label: string; weight: number; color: string }> = {
      scoreWeight:    { label: 'Lead Score (Demographics & Fit)',   weight: scoreWeight,   color: '#3b82f6' },
      activityWeight: { label: 'Activity & Engagement',            weight: activityWeight, color: '#10b981' },
      recencyWeight:  { label: 'Recency & Timing',                 weight: recencyWeight,  color: '#f59e0b' },
      funnelWeight:   { label: 'Funnel Progression',               weight: funnelWeight,   color: '#8b5cf6' },
    }

    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w.weight, 0)
    const data = Object.values(weights).map(w => ({
      name: w.label,
      value: totalWeight > 0 ? calcRate(w.weight, totalWeight, 0) : 25,
      color: w.color,
    }))

    res.json({
      success: true,
      data,
    })
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feature importance',
      error: getErrorMessage(error)
    })
  }
}

/**
 * Time-bound confirmation tokens for destructive AI actions.
 * Maps token → { userId, functionName, args, expiresAt }
 * Tokens expire after 2 minutes and are single-use.
 */
// In-memory recalibration job tracking
interface RecalibrationJob {
  id: string
  status: 'running' | 'completed' | 'failed'
  startedAt: Date
  completedAt?: Date
  result?: {
    accuracy: number
    sampleSize: number
    improvements: string[]
  }
  error?: string
}
export const recalibrationJobs = new Map<string, RecalibrationJob>()

/**
 * POST /api/ai/recalibrate
 * Triggers ML optimization run for the current user
 */
export const recalibrateModel = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const organizationId = req.user!.organizationId

    // Check if a job is already running for this user
    const existing = recalibrationJobs.get(userId)
    if (existing && existing.status === 'running') {
      return res.json({
        success: true,
        data: { jobId: existing.id, status: 'running', startedAt: existing.startedAt },
        message: 'Recalibration already in progress',
      })
    }

    const jobId = `recal_${userId}_${Date.now()}`
    const job: RecalibrationJob = {
      id: jobId,
      status: 'running',
      startedAt: new Date(),
    }
    recalibrationJobs.set(userId, job)

    // Respond immediately
    res.json({
      success: true,
      data: { jobId, status: 'running', startedAt: job.startedAt },
      message: 'Model recalibration started',
    })

    // Run optimization in background
    const { getMLOptimizationService } = await import('../services/ml-optimization.service')
    const mlService = getMLOptimizationService()
    try {
      const startTime = Date.now()
      // Capture accuracy BEFORE optimization writes the new value
      const preModel = await prisma.leadScoringModel.findUnique({ where: { userId } })
      const accuracyBefore = preModel?.accuracy ?? null

      const result = await mlService.optimizeScoringWeights(userId, organizationId)
      const duration = Date.now() - startTime

      job.status = 'completed'
      job.completedAt = new Date()
      job.result = {
        accuracy: result.accuracy,
        sampleSize: result.sampleSize,
        improvements: result.improvements,
      }

      // Phase 1A: Persist model performance history
      await prisma.modelPerformanceHistory.create({
        data: {
          organizationId,
          userId,
          modelType: 'lead_scoring',
          accuracyBefore,
          accuracyAfter: result.accuracy,
          sampleSize: result.sampleSize,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          improvements: result.improvements as any,
          trainingDuration: duration,
          metadata: {
            oldWeights: result.oldWeights,
            newWeights: result.newWeights,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        },
      })

      // Track usage
      await incrementAIUsage(organizationId, 'scoringRecalculations')

      logger.info(`✅ Recalibration complete for user ${userId}: accuracy ${result.accuracy}%`)
    } catch (err: unknown) {
      job.status = 'failed'
      job.completedAt = new Date()
      job.error = getErrorMessage(err) || 'Unknown error'
      logger.error(`❌ Recalibration failed for user ${userId}:`, err)
    }
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to start recalibration',
      error: getErrorMessage(error),
    })
  }
}

/**
 * GET /api/ai/recalibration-status
 * Returns the status of the current user's recalibration job
 */
export const getRecalibrationStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const job = recalibrationJobs.get(userId)

    if (!job) {
      return res.json({
        success: true,
        data: { status: 'none', message: 'No recalibration job found' },
      })
    }

    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        result: job.result,
        error: job.error,
      },
    })
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to get recalibration status',
      error: getErrorMessage(error),
    })
  }
}

/**
 * Reset preferences (Phase 3)
 */
export const enrichLead = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params
    const organizationId = req.user!.organizationId

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
      include: {
        notes: { take: 10, orderBy: { createdAt: 'desc' } },
        messages: { take: 10, orderBy: { createdAt: 'desc' } },
        activities: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    })

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' })
    }

    const openaiService = getOpenAIService()

    // Build context from lead data
    const existingData = {
      name: `${lead.firstName} ${lead.lastName}`,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      position: lead.position,
      source: lead.source,
      propertyType: lead.propertyType,
      transactionType: lead.transactionType,
      budgetMin: lead.budgetMin,
      budgetMax: lead.budgetMax,
      desiredLocation: lead.desiredLocation,
      notes: lead.notes.map(n => n.content).join('\n'),
      recentMessages: lead.messages.map(m => m.body).slice(0, 5).join('\n'),
    }

    const prompt = `You are a real estate CRM data enrichment assistant. Based on the following lead data, infer any missing information that can be reasonably deduced. Only provide information that can be reliably inferred — do not fabricate data.

Current lead data:
${JSON.stringify(existingData, null, 2)}

Analyze the lead's name, email domain, communication history, notes, and existing data to infer:
1. Likely property preferences (type, budget range, location) if not already set
2. Transaction type (buyer/seller/investor) if not set  
3. Timeline/urgency level
4. Key interests or concerns mentioned in communications
5. Suggested tags based on the lead's profile
6. A brief lead summary (2-3 sentences)

Respond in JSON format with only the fields you can confidently infer:
{
  "propertyType": "string or null",
  "transactionType": "string or null", 
  "budgetMin": "number or null",
  "budgetMax": "number or null",
  "desiredLocation": "string or null",
  "moveInTimeline": "string or null",
  "suggestedTags": ["array of tag strings"],
  "interests": ["array of identified interests"],
  "concerns": ["array of identified concerns"],
  "summary": "brief lead profile summary",
  "confidence": "low | medium | high"
}`

    const result = await openaiService.chat(
      [{ role: 'user', content: prompt }],
      req.user!.userId,
      organizationId
    )

    // Track usage
    await incrementAIUsage(organizationId, 'contentGenerations', {
      tokens: result.tokens,
      cost: result.cost,
    })

    // Try to parse the enrichment response
    let enrichment: Record<string, unknown> = {}
    try {
      const jsonMatch = result.response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        enrichment = JSON.parse(jsonMatch[0])
      }
    } catch {
      enrichment = { summary: result.response, confidence: 'low' }
    }

    res.json({
      success: true,
      data: {
        leadId,
        enrichment,
        tokens: result.tokens,
        cost: result.cost,
      },
    })
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: 'Failed to enrich lead', error: getErrorMessage(error) })
  }
}

/**
 * 7.6: Apply enrichment suggestions to a lead
 */
export const applyEnrichment = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params
    const organizationId = req.user!.organizationId
    const { fields } = req.body // Fields the user approved to apply

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
    })

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' })
    }

    // Only update fields that are currently empty on the lead
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {}
    const allowedFields = ['propertyType', 'transactionType', 'budgetMin', 'budgetMax', 'desiredLocation', 'moveInTimeline']

    for (const field of allowedFields) {
      if (fields[field] !== undefined && fields[field] !== null && !lead[field as keyof typeof lead]) {
        updateData[field] = fields[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.json({ success: true, data: lead, message: 'No new fields to apply' })
    }

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: updateData,
    })

    res.json({ success: true, data: updated, message: `Updated ${Object.keys(updateData).length} field(s)` })
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: 'Failed to apply enrichment', error: getErrorMessage(error) })
  }
}

/**
 * 7.7: Get/update AI budget alert settings
 */
