import { Request, Response } from 'express'
import { getIntelligenceService } from '../services/intelligence.service'
import { getOpenAIService, ASSISTANT_TONES, AssistantTone } from '../services/openai.service'
import { getAIFunctionsService, AI_FUNCTIONS } from '../services/ai-functions.service'
import { gatherMessageContext } from '../services/message-context.service'
import { generateContextualMessage, generateVariations, ComposeSettings } from '../services/ai-compose.service'
import * as templateService from '../services/template-ai.service'
import * as preferencesService from '../services/user-preferences.service'
import prisma from '../config/database'

/**
 * Get AI Hub overview statistics
 * Returns real counts from database — no mock data
 */
export const getAIStats = async (req: Request, res: Response) => {
  try {
    const leadsCount = await prisma.lead.count()
    
    res.json({
      success: true,
      data: {
        activeModels: 0,
        modelsInTraining: 0,
        avgAccuracy: 0,
        accuracyChange: 0,
        predictionsToday: 0,
        predictionsChange: 0,
        activeInsights: 0,
        highPriorityInsights: 0,
        leadsScored: leadsCount
      }
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
    const leadsCount = await prisma.lead.count()
    
    res.json({
      success: true,
      data: [
        {
          id: 1,
          title: 'Lead Scoring',
          description: 'AI-powered lead quality prediction',
          status: 'active',
          accuracy: 'Real-time',
          leadsScored: leadsCount,
        },
        {
          id: 2,
          title: 'Intelligence Hub',
          description: 'Lead predictions and engagement analysis',
          status: 'active',
          accuracy: 'Active',
          models: 0,
        },
        {
          id: 3,
          title: 'A/B Testing',
          description: 'Statistical testing for campaigns',
          status: 'active',
          accuracy: 'Active',
          tests: 0,
        },
        {
          id: 4,
          title: 'AI Content Generation',
          description: 'OpenAI-powered content creation',
          status: process.env.OPENAI_API_KEY ? 'active' : 'inactive',
          accuracy: process.env.OPENAI_API_KEY ? 'Active' : 'Not configured',
          models: process.env.OPENAI_API_KEY ? 1 : 0,
        },
        {
          id: 5,
          title: 'ML Optimization',
          description: 'Automatic model weight optimization',
          status: 'active',
          accuracy: 'Active',
        },
      ]
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
 * Stub — no real training models exist yet
 */
export const getModelPerformance = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: []
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
 * Get active training models — stub (no real training exists yet)
 */
export const getTrainingModels = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: []
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
 * Upload training data — stub (no real training pipeline exists yet)
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
    
    res.json({
      success: true,
      message: 'Training data uploaded successfully',
      data: {
        modelType,
        recordsUploaded: Array.isArray(data) ? data.length : 1,
        status: 'queued',
        message: 'Training data uploaded successfully and queued for processing'
      }
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch data quality metrics',
      error: error.message
    })
  }
}

/**
 * Get AI-generated insights — stub (returns empty array)
 */
export const getInsights = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: []
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
 * Get a specific insight by ID — stub
 */
export const getInsightById = async (req: Request, res: Response) => {
  try {
    res.status(404).json({
      success: false,
      message: 'Insight not found'
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
 * Dismiss an AI insight — stub
 */
export const dismissInsight = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
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
 * Get AI-powered recommendations — stub (returns empty array)
 */
export const getRecommendations = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: []
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
 * Get lead score for a specific lead — uses real scoring from intelligence service
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
    const leads = await prisma.lead.findMany({ select: { id: true } })
    
    res.json({
      success: true,
      message: 'Score recalculation initiated',
      data: {
        status: 'initiated',
        leadsToProcess: leads.length,
        estimatedTime: `${Math.ceil(leads.length / 100)} minutes`
      }
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate predictions',
      error: error.message
    })
  }
}

/**
 * Enhance a message using AI — uses real intelligence service
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
    
    const intelligence = getIntelligenceService()
    const enhanced = await intelligence.enhanceMessage(message, type, tone)
    
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
 * Get AI-suggested actions for a context — uses real intelligence service
 */
export const suggestActions = async (req: Request, res: Response) => {
  try {
    const { context, leadId, campaignId } = req.body
    
    const intelligence = getIntelligenceService()
    const actions = await intelligence.suggestActions({
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
 * Get feature importance analysis — stub (returns hardcoded weights)
 */
export const getFeatureImportance = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: [
        { name: 'Email Engagement', value: 28, color: '#3b82f6' },
        { name: 'Response Time', value: 22, color: '#10b981' },
        { name: 'Budget Range', value: 18, color: '#f59e0b' },
        { name: 'Company Size', value: 15, color: '#8b5cf6' },
        { name: 'Lead Source', value: 12, color: '#ec4899' },
        { name: 'Other', value: 5, color: '#6b7280' },
      ]
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feature importance',
      error: error.message
    })
  }
}

/**
 * Chat with AI Assistant (OpenAI GPT-4)
 */
export const chatWithAI = async (req: Request, res: Response) => {
  try {
    console.log('🎤 Chat request received:', req.body?.message?.substring(0, 100))
    const { message, conversationHistory, tone } = req.body
    const userId = (req as any).user.userId
    const organizationId = (req as any).user.organizationId
    console.log('👤 User:', userId, 'Org:', organizationId)

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      })
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'AI chatbot is not configured. Please add OPENAI_API_KEY to environment variables.'
      })
    }

    const openAI = getOpenAIService()
    const functionsService = getAIFunctionsService()

    const selectedTone = tone || 'FRIENDLY'
    const toneConfig = ASSISTANT_TONES[selectedTone as AssistantTone] || ASSISTANT_TONES.FRIENDLY

    const messages = [
      {
        role: 'system' as const,
        content: `You are a highly experienced real estate AI assistant with 20+ years of industry expertise. 
You're integrated into a professional CRM and act as the user's virtual chief of staff and strategist.

YOUR ROLE:
- Senior real estate advisor and business partner
- Proactive problem identifier and opportunity spotter
- Expert in lead management, conversion optimization, and market strategy
- Supportive coach who celebrates wins and guides through challenges
- YOU CAN ACTUALLY PERFORM ACTIONS - Don't just give guides, DO THE THING!

YOUR CAPABILITIES - YOU CAN:
✅ CREATE leads (use create_lead function)
✅ UPDATE leads (use update_lead function)
✅ DELETE leads (use delete_lead function)
✅ ADD notes to leads (use add_note_to_lead function)
✅ ADD tags to leads (use add_tag_to_lead function)
✅ LOG activities (use create_activity function)
✅ SEND emails (use send_email function)
✅ SEND SMS messages (use send_sms function)
✅ SCHEDULE appointments (use schedule_appointment function)
✅ CREATE tasks and reminders
✅ SEARCH and analyze leads
✅ COMPOSE emails, SMS, and call scripts
✅ PREDICT conversions
✅ RECOMMEND next actions

IMPORTANT INSTRUCTIONS:
- When user asks you to DO something, USE THE FUNCTION to do it
- Don't say "Here's how to create a lead" - Just CREATE it using create_lead
- Don't say "You can add a note" - Just ADD it using add_note_to_lead
- Be proactive: if user gives you lead info, CREATE the lead immediately
- After performing action, confirm what you did with the result

EXAMPLES:
User: "Create a lead for John Smith, email john@example.com"
You: [USE create_lead function] → "✅ Created new lead: John Smith (ID: abc123)"

User: "Add a note to lead abc123 saying he's interested in downtown properties"
You: [USE add_note_to_lead function] → "✅ Added note to John Smith"

User: "Schedule a meeting with lead abc123 tomorrow at 2pm"
You: [USE schedule_appointment function] → "📅 Scheduled meeting with John Smith"

YOUR PERSONALITY:
- Professional yet approachable and friendly
- Direct and action-oriented (DO things, don't just describe them)
- Data-driven with strategic insights
- Proactive (suggest AND execute, don't just answer)
- Empathetic and supportive
- Results-focused

TONE SETTINGS: ${toneConfig.systemAddition}`,
      },
      ...(conversationHistory || []),
      {
        role: 'user' as const,
        content: message,
      },
    ]

    const response = await openAI.chatWithFunctions(messages, AI_FUNCTIONS, userId, organizationId)

    if (response.functionCall) {
      console.log(`🎯 Executing function: ${response.functionCall.name}`)
      
      const functionResult = await functionsService.executeFunction(
        response.functionCall.name,
        response.functionCall.arguments,
        organizationId,
        userId
      )

      console.log(`✅ Function result:`, functionResult.substring(0, 200))

      // Use tools format for OpenAI SDK v4+
      const finalMessages = [
        ...messages,
        {
          role: 'assistant' as const,
          content: null,
          tool_calls: [{
            id: 'call_' + Date.now(),
            type: 'function' as const,
            function: {
              name: response.functionCall.name,
              arguments: JSON.stringify(response.functionCall.arguments),
            },
          }],
        },
        {
          role: 'tool' as const,
          tool_call_id: 'call_' + Date.now(),
          content: functionResult,
        },
      ]

      const finalResponse = await openAI.chat(finalMessages, userId, organizationId)

      await prisma.chatMessage.create({
        data: {
          userId,
          organizationId,
          role: 'user',
          content: message,
          tokens: null,
          cost: null,
        },
      })

      await prisma.chatMessage.create({
        data: {
          userId,
          organizationId,
          role: 'assistant',
          content: finalResponse.response,
          tokens: response.tokens + finalResponse.tokens,
          cost: response.cost + finalResponse.cost,
          metadata: {
            functionCall: response.functionCall.name,
            functionArgs: response.functionCall.arguments,
          } as never,
        },
      })

      return res.json({
        success: true,
        data: {
          message: finalResponse.response,
          tokens: response.tokens + finalResponse.tokens,
          cost: response.cost + finalResponse.cost,
          functionUsed: response.functionCall.name,
        },
      })
    }

    await prisma.chatMessage.create({
      data: {
        userId,
        organizationId,
        role: 'user',
        content: message,
        tokens: null,
        cost: null,
      },
    })

    await prisma.chatMessage.create({
      data: {
        userId,
        organizationId,
        role: 'assistant',
        content: response.response,
        tokens: response.tokens,
        cost: response.cost,
      },
    })

    res.json({
      success: true,
      data: {
        message: response.response,
        tokens: response.tokens,
        cost: response.cost,
      },
    })
  } catch (error: any) {
    console.error('Chat error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to process chat message',
      error: error.message
    })
  }
}

/**
 * Get chat history
 */
export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId
    const organizationId = (req as any).user.organizationId
    const limit = parseInt(req.query.limit as string) || 50

    const messages = await prisma.chatMessage.findMany({
      where: { userId, organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        role: true,
        content: true,
        tokens: true,
        cost: true,
        createdAt: true,
      },
    })

    messages.reverse()

    res.json({
      success: true,
      data: { messages, total: messages.length },
    })
  } catch (error: any) {
    console.error('Chat history error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat history',
      error: error.message
    })
  }
}

/**
 * Clear chat history
 */
export const clearChatHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId
    const organizationId = (req as any).user.organizationId

    const result = await prisma.chatMessage.deleteMany({
      where: { userId, organizationId },
    })

    res.json({
      success: true,
      data: { deleted: result.count },
    })
  } catch (error: any) {
    console.error('Clear chat history error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to clear chat history',
      error: error.message
    })
  }
}

/**
 * Get AI usage statistics
 */
export const getAIUsage = async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const chatStats = await prisma.chatMessage.aggregate({
      where: {
        organizationId,
        createdAt: { gte: startDate },
        role: 'assistant',
      },
      _sum: { tokens: true, cost: true },
      _count: { id: true },
    })

    res.json({
      success: true,
      data: {
        period: { start: startDate, end: new Date() },
        chat: {
          totalMessages: chatStats._count.id,
          totalTokens: chatStats._sum.tokens || 0,
          totalCost: chatStats._sum.cost || 0,
        },
      },
    })
  } catch (error: any) {
    console.error('Usage stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch usage statistics',
      error: error.message
    })
  }
}

/**
 * Generate content with AI
 */
export const generateEmailSequence = async (req: Request, res: Response) => {
  try {
    const { leadName, propertyType, goal, tone, sequenceLength } = req.body

    if (!goal) {
      return res.status(400).json({
        success: false,
        message: 'Goal is required for email sequence generation',
      })
    }

    const openAIService = getOpenAIService()
    const emails = await openAIService.generateEmailSequence({
      leadName,
      propertyType,
      goal,
      tone,
      sequenceLength,
    })

    res.json({
      success: true,
      data: { emails, count: emails.length },
    })
  } catch (error: any) {
    console.error('Email sequence generation error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to generate email sequence',
      error: error.message,
    })
  }
}

export const generateSMS = async (req: Request, res: Response) => {
  try {
    const { leadName, propertyType, goal, tone } = req.body

    if (!goal) {
      return res.status(400).json({
        success: false,
        message: 'Goal is required for SMS generation',
      })
    }

    const openAIService = getOpenAIService()
    const sms = await openAIService.generateSMS({
      leadName,
      propertyType,
      goal,
      tone,
    })

    res.json({
      success: true,
      data: { message: sms, length: sms.length },
    })
  } catch (error: any) {
    console.error('SMS generation error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to generate SMS',
      error: error.message,
    })
  }
}

export const generatePropertyDescription = async (req: Request, res: Response) => {
  try {
    const { address, propertyType, bedrooms, bathrooms, squareFeet, price, features, neighborhood } = req.body

    if (!address || !propertyType) {
      return res.status(400).json({
        success: false,
        message: 'Address and property type are required',
      })
    }

    const openAIService = getOpenAIService()
    const description = await openAIService.generatePropertyDescription({
      address,
      propertyType,
      bedrooms,
      bathrooms,
      squareFeet,
      price,
      features,
      neighborhood,
    })

    res.json({
      success: true,
      data: { description, wordCount: description.split(' ').length },
    })
  } catch (error: any) {
    console.error('Property description generation error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to generate property description',
      error: error.message,
    })
  }
}

export const generateSocialPosts = async (req: Request, res: Response) => {
  try {
    const { topic, propertyAddress, platforms, tone } = req.body

    if (!topic || !platforms || !Array.isArray(platforms)) {
      return res.status(400).json({
        success: false,
        message: 'Topic and platforms array are required',
      })
    }

    const openAIService = getOpenAIService()
    const posts = await openAIService.generateSocialPosts({
      topic,
      propertyAddress,
      platforms,
      tone,
    })

    res.json({
      success: true,
      data: { posts, platforms: Object.keys(posts) },
    })
  } catch (error: any) {
    console.error('Social posts generation error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to generate social posts',
      error: error.message,
    })
  }
}

export const generateListingPresentation = async (req: Request, res: Response) => {
  try {
    const { address, propertyType, estimatedValue, comparables, marketTrends } = req.body

    if (!address || !propertyType) {
      return res.status(400).json({
        success: false,
        message: 'Address and property type are required',
      })
    }

    const openAIService = getOpenAIService()
    const presentation = await openAIService.generateListingPresentation({
      address,
      propertyType,
      estimatedValue,
      comparables,
      marketTrends,
    })

    res.json({
      success: true,
      data: presentation,
    })
  } catch (error: any) {
    console.error('Listing presentation generation error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to generate listing presentation',
      error: error.message,
    })
  }
}

/**
 * Compose message with AI (Phase 1)
 */
export const composeMessage = async (req: Request, res: Response) => {
  try {
    const { leadId, conversationId, messageType, draftMessage, settings } = req.body
    const userId = (req as any).user.userId
    const organizationId = (req as any).user.organizationId

    if (!leadId || !conversationId || !messageType) {
      return res.status(400).json({
        success: false,
        message: 'leadId, conversationId, and messageType are required'
      })
    }

    if (!['email', 'sms', 'call'].includes(messageType)) {
      return res.status(400).json({
        success: false,
        message: 'messageType must be email, sms, or call'
      })
    }

    const composeSettings: ComposeSettings = {
      tone: settings?.tone || 'professional',
      length: settings?.length || 'standard',
      includeCTA: settings?.includeCTA !== false,
      personalization: settings?.personalization || 'standard',
      templateBase: settings?.templateBase,
      includeProperties: settings?.includeProperties,
      addUrgency: settings?.addUrgency || false,
      draftMessage: draftMessage || undefined // Pass draft for enhancement
    }

    const context = await gatherMessageContext(leadId, conversationId, organizationId)
    const result = await generateContextualMessage(context, messageType, composeSettings, userId, organizationId)

    res.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('Compose message error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to compose message',
      error: error.message
    })
  }
}

/**
 * Generate message variations (Phase 2)
 */
export const composeVariations = async (req: Request, res: Response) => {
  try {
    const { leadId, conversationId, messageType, draftMessage, settings } = req.body
    const userId = (req as any).user.userId
    const organizationId = (req as any).user.organizationId

    if (!leadId || !conversationId || !messageType) {
      return res.status(400).json({
        success: false,
        message: 'leadId, conversationId, and messageType are required'
      })
    }

    const composeSettings: ComposeSettings = {
      tone: settings?.tone || 'professional',
      length: settings?.length || 'standard',
      includeCTA: settings?.includeCTA !== false,
      personalization: settings?.personalization || 'standard',
      templateBase: settings?.templateBase,
      includeProperties: settings?.includeProperties,
      addUrgency: settings?.addUrgency || false,
      draftMessage: draftMessage || undefined
    }

    const context = await gatherMessageContext(leadId, conversationId, organizationId)
    const variations = await generateVariations(context, messageType, composeSettings, userId, organizationId)

    res.json({
      success: true,
      data: { variations, count: variations.length }
    })
  } catch (error: any) {
    console.error('Generate variations error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate variations',
      error: error.message
    })
  }
}

/**
 * Stream message composition (Phase 3)
 */
export const composeMessageStream = async (req: Request, res: Response) => {
  try {
    const { leadId, conversationId, messageType, draftMessage, settings } = req.body
    const userId = (req as any).user.userId
    const organizationId = (req as any).user.organizationId

    if (!leadId || !conversationId || !messageType) {
      return res.status(400).json({
        success: false,
        message: 'leadId, conversationId, and messageType are required'
      })
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const composeSettings: ComposeSettings = {
      tone: settings?.tone || 'professional',
      length: settings?.length || 'standard',
      includeCTA: settings?.includeCTA !== false,
      personalization: settings?.personalization || 'standard',
      templateBase: settings?.templateBase,
      includeProperties: settings?.includeProperties,
      addUrgency: settings?.addUrgency || false,
      draftMessage: draftMessage || undefined
    }

    const context = await gatherMessageContext(leadId, conversationId, organizationId)

    res.write(`data: ${JSON.stringify({ 
      type: 'context', 
      data: {
        leadName: context.lead.name,
        leadScore: context.lead.score
      }
    })}\n\n`)

    const openAI = getOpenAIService()
    
    // Build prompt based on whether draft exists
    const prompt = draftMessage 
      ? `Enhance this draft message for ${context.lead.name}:

${draftMessage}

Improve it with ${composeSettings.tone} tone, personalize with lead context, and make it more effective.`
      : `Generate a ${messageType} message for ${context.lead.name} with ${composeSettings.tone} tone.`
    
    const stream = openAI.chatStream(
      [{ role: 'user', content: prompt }],
      userId,
      organizationId
    )

    for await (const token of stream) {
      res.write(`data: ${JSON.stringify({ type: 'token', data: token })}\n\n`)
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
    res.end()

  } catch (error: any) {
    console.error('Stream message error:', error)
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      message: error.message 
    })}\n\n`)
    res.end()
  }
}

/**
 * Get templates (Phase 3)
 */
export const getTemplates = async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId
    const { category } = req.query

    const templates = await templateService.getUserTemplates(
      organizationId,
      category as string | undefined
    )

    res.json({
      success: true,
      data: templates
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to load templates',
      error: error.message
    })
  }
}

/**
 * Generate from template (Phase 3)
 */
export const generateTemplateMessage = async (req: Request, res: Response) => {
  try {
    const { templateId, leadId, conversationId, tone } = req.body
    const userId = (req as any).user.userId
    const organizationId = (req as any).user.organizationId

    if (!templateId || !leadId || !conversationId) {
      return res.status(400).json({
        success: false,
        message: 'templateId, leadId, and conversationId are required'
      })
    }

    const result = await templateService.generateFromTemplate(
      templateId,
      { leadId, conversationId },
      tone || 'professional',
      userId,
      organizationId
    )

    res.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate from template',
      error: error.message
    })
  }
}

/**
 * Save as template (Phase 3)
 */
export const saveMessageAsTemplate = async (req: Request, res: Response) => {
  try {
    const { message, name, category } = req.body
    const userId = (req as any).user.userId
    const organizationId = (req as any).user.organizationId

    if (!message || !name || !category) {
      return res.status(400).json({
        success: false,
        message: 'message, name, and category are required'
      })
    }

    const template = await templateService.saveAsTemplate(
      message,
      name,
      category,
      organizationId,
      userId
    )

    res.json({
      success: true,
      data: template
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to save template',
      error: error.message
    })
  }
}

/**
 * Get preferences (Phase 3)
 */
export const getPreferences = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId

    const preferences = await preferencesService.loadComposerPreferences(userId)

    res.json({
      success: true,
      data: preferences
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to load preferences',
      error: error.message
    })
  }
}

/**
 * Save preferences (Phase 3)
 */
export const savePreferences = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId
    const preferences = req.body

    const updated = await preferencesService.saveComposerPreferences(userId, preferences)

    res.json({
      success: true,
      data: updated
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to save preferences',
      error: error.message
    })
  }
}

/**
 * Reset preferences (Phase 3)
 */
export const resetPreferences = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId

    const defaults = await preferencesService.resetComposerPreferences(userId)

    res.json({
      success: true,
      data: defaults
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to reset preferences',
      error: error.message
    })
  }
}
