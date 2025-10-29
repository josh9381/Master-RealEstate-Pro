import { Request, Response } from 'express'
import * as aiService from '../utils/ai.service'

/**
 * Get AI Hub overview statistics
 */
export const getAIStats = async (req: Request, res: Response) => {
  try {
    const stats = await aiService.getAIStats()
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI statistics',
      error: error.message
    })
  }
}

/**
 * Get list of AI features with their status
 */
export const getAIFeatures = async (req: Request, res: Response) => {
  try {
    const features = await aiService.getAIFeatures()
    
    res.json({
      success: true,
      data: features
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI features',
      error: error.message
    })
  }
}

/**
 * Get model performance metrics over time
 */
export const getModelPerformance = async (req: Request, res: Response) => {
  try {
    const { months = 6 } = req.query
    const performance = await aiService.getModelPerformance(Number(months))
    
    res.json({
      success: true,
      data: performance
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch model performance',
      error: error.message
    })
  }
}

/**
 * Get active training models and their progress
 */
export const getTrainingModels = async (req: Request, res: Response) => {
  try {
    const models = await aiService.getTrainingModels()
    
    res.json({
      success: true,
      data: models
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch training models',
      error: error.message
    })
  }
}

/**
 * Upload training data for model improvement
 */
export const uploadTrainingData = async (req: Request, res: Response) => {
  try {
    const { modelType, data } = req.body
    
    if (!modelType || !data) {
      return res.status(400).json({
        success: false,
        message: 'Model type and data are required'
      })
    }
    
    const result = await aiService.uploadTrainingData(modelType, data)
    
    res.json({
      success: true,
      message: 'Training data uploaded successfully',
      data: result
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to upload training data',
      error: error.message
    })
  }
}

/**
 * Get data quality metrics
 */
export const getDataQuality = async (req: Request, res: Response) => {
  try {
    const quality = await aiService.getDataQuality()
    
    res.json({
      success: true,
      data: quality
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch data quality metrics',
      error: error.message
    })
  }
}

/**
 * Get AI-generated insights
 */
export const getInsights = async (req: Request, res: Response) => {
  try {
    const { type, priority, limit = 10 } = req.query
    const insights = await aiService.getInsights({
      type: type as string,
      priority: priority as string,
      limit: Number(limit)
    })
    
    res.json({
      success: true,
      data: insights
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch insights',
      error: error.message
    })
  }
}

/**
 * Get a specific insight by ID
 */
export const getInsightById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const insight = await aiService.getInsightById(id)
    
    if (!insight) {
      return res.status(404).json({
        success: false,
        message: 'Insight not found'
      })
    }
    
    res.json({
      success: true,
      data: insight
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch insight',
      error: error.message
    })
  }
}

/**
 * Dismiss an AI insight
 */
export const dismissInsight = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await aiService.dismissInsight(id)
    
    res.json({
      success: true,
      message: 'Insight dismissed successfully'
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to dismiss insight',
      error: error.message
    })
  }
}

/**
 * Get AI-powered recommendations
 */
export const getRecommendations = async (req: Request, res: Response) => {
  try {
    const { type, limit = 5 } = req.query
    const recommendations = await aiService.getRecommendations({
      type: type as string,
      limit: Number(limit)
    })
    
    res.json({
      success: true,
      data: recommendations
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommendations',
      error: error.message
    })
  }
}

/**
 * Get lead score for a specific lead
 */
export const getLeadScore = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params
    const score = await aiService.calculateLeadScore(leadId)
    
    res.json({
      success: true,
      data: score
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to calculate lead score',
      error: error.message
    })
  }
}

/**
 * Recalculate scores for all leads
 */
export const recalculateScores = async (req: Request, res: Response) => {
  try {
    const result = await aiService.recalculateAllScores()
    
    res.json({
      success: true,
      message: 'Score recalculation initiated',
      data: result
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to recalculate scores',
      error: error.message
    })
  }
}

/**
 * Get predictions for a specific lead
 */
export const getPredictions = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params
    const predictions = await aiService.getPredictions(leadId)
    
    res.json({
      success: true,
      data: predictions
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate predictions',
      error: error.message
    })
  }
}

/**
 * Enhance a message using AI
 */
export const enhanceMessage = async (req: Request, res: Response) => {
  try {
    const { message, type, tone } = req.body
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      })
    }
    
    const enhanced = await aiService.enhanceMessage(message, type, tone)
    
    res.json({
      success: true,
      data: enhanced
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to enhance message',
      error: error.message
    })
  }
}

/**
 * Get AI-suggested actions for a context
 */
export const suggestActions = async (req: Request, res: Response) => {
  try {
    const { context, leadId, campaignId } = req.body
    
    const actions = await aiService.suggestActions({
      context,
      leadId,
      campaignId
    })
    
    res.json({
      success: true,
      data: actions
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to suggest actions',
      error: error.message
    })
  }
}

/**
 * Get feature importance analysis
 */
export const getFeatureImportance = async (req: Request, res: Response) => {
  try {
    const { modelType = 'lead-scoring' } = req.query
    const importance = await aiService.getFeatureImportance(modelType as string)
    
    res.json({
      success: true,
      data: importance
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feature importance',
      error: error.message
    })
  }
}
