/**
 * AI Controller — Barrel re-export
 * 
 * The original monolithic controller has been split into focused domain controllers:
 * - ai-chat.controller.ts       — Chatbot, history, message enhancement, suggested actions
 * - ai-insights.controller.ts   — AI insights, recommendations, insight management
 * - ai-generation.controller.ts — Content generation, compose, streaming, templates
 * - ai-scoring.controller.ts    — Lead scoring, predictions, model management, enrichment
 * - ai-settings.controller.ts   — Hub stats, preferences, org settings, usage, feedback, budget
 * 
 * This file re-exports everything for backwards compatibility with ai.routes.ts
 */

export { enhanceMessage, suggestActions, chatWithAI, getChatHistory, clearChatHistory } from './ai-chat.controller'
export { getInsights, getInsightById, dismissInsight, actOnInsight, getRecommendations } from './ai-insights.controller'
export { generateEmailSequence, generateSMS, generatePropertyDescription, generateSocialPosts, generateListingPresentation, composeMessage, composeVariations, composeMessageStream, getTemplates, generateTemplateMessage, saveMessageAsTemplate } from './ai-generation.controller'
export { getModelPerformance, getTrainingModels, uploadTrainingData, getDataQuality, getLeadScore, getLeadScoreFactors, recalculateScores, getGlobalPredictions, getPredictions, getFeatureImportance, recalibrateModel, getRecalibrationStatus, enrichLead, applyEnrichment } from './ai-scoring.controller'
export { getAIStats, getAIFeatures, getAIUsage, getAIUsageLimits, getPreferences, savePreferences, resetPreferences, getOrgSettings, updateOrgSettings, getAvailableModels, getCostDashboard, submitChatFeedback, submitInsightFeedback, getFeedbackStats, getBudgetSettings, updateBudgetSettings } from './ai-settings.controller'
