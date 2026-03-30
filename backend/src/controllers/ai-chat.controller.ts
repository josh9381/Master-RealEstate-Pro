import { getErrorMessage } from '../utils/errors'
import { logger } from '../lib/logger'
import { Request, Response } from 'express'
import crypto from 'crypto'
import { getIntelligenceService } from '../services/intelligence.service'
import { getOpenAIService, ASSISTANT_TONES, AssistantTone } from '../services/openai.service'
import { getAIFunctionsService, AI_FUNCTIONS, DESTRUCTIVE_FUNCTIONS, ADMIN_ONLY_FUNCTIONS } from '../services/ai-functions.service'
import { incrementAIUsage } from '../services/usage-tracking.service'
import prisma from '../config/database'

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
    
    // Track usage
    const organizationId = req.user!.organizationId
    await incrementAIUsage(organizationId, 'enhancements')

    res.json({
      success: true,
      data: enhanced
    })
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to enhance message',
      error: getErrorMessage(error)
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
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to suggest actions',
      error: getErrorMessage(error)
    })
  }
}

/**
 * Time-bound confirmation tokens for destructive AI actions.
 * Maps token → { userId, functionName, args, expiresAt }
 * Tokens expire after 2 minutes and are single-use.
 */
const confirmationTokens = new Map<string, {
  userId: string
  organizationId: string
  functionName: string
  args: Record<string, unknown>
  expiresAt: number
}>()

function generateConfirmationToken(userId: string, organizationId: string, functionName: string, args: Record<string, unknown>): string {
  const token = crypto.randomBytes(32).toString('hex')
  confirmationTokens.set(token, {
    userId,
    organizationId,
    functionName,
    args,
    expiresAt: Date.now() + 2 * 60 * 1000, // 2 minutes
  })
  // Prune expired tokens periodically (max 200 entries as safety valve)
  if (confirmationTokens.size > 200) {
    const now = Date.now()
    for (const [k, v] of confirmationTokens) {
      if (v.expiresAt < now) confirmationTokens.delete(k)
    }
  }
  return token
}

function validateConfirmationToken(token: string, userId: string): { valid: boolean; data?: typeof confirmationTokens extends Map<string, infer V> ? V : never; error?: string } {
  const entry = confirmationTokens.get(token)
  if (!entry) return { valid: false, error: 'Invalid or expired confirmation token' }
  if (entry.expiresAt < Date.now()) {
    confirmationTokens.delete(token)
    return { valid: false, error: 'Confirmation token has expired. Please try again.' }
  }
  if (entry.userId !== userId) {
    return { valid: false, error: 'Confirmation token does not belong to this user' }
  }
  // Single-use: delete after validation
  confirmationTokens.delete(token)
  return { valid: true, data: entry }
}

/**
 * Chat with AI Assistant (OpenAI GPT-4)
 */
export const chatWithAI = async (req: Request, res: Response) => {
  try {
    logger.info('🎤 Chat request received:', req.body?.message?.substring(0, 100))
    const { message, conversationHistory, tone } = req.body
    const userId = req.user!.userId
    const organizationId = req.user!.organizationId
    logger.info('👤 User:', userId, 'Org:', organizationId)

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

    // Smart conversation history truncation: keep only the last 20 messages
    // and cap total character count to ~40,000 (~10K tokens) to prevent
    // excessive costs and context window overflow.
    const MAX_HISTORY_MESSAGES = 20
    const MAX_HISTORY_CHARS = 40000
    let trimmedHistory = conversationHistory || []
    if (trimmedHistory.length > MAX_HISTORY_MESSAGES) {
      trimmedHistory = trimmedHistory.slice(-MAX_HISTORY_MESSAGES)
    }
    let totalChars = trimmedHistory.reduce((sum: number, m: { content: string }) => sum + (m.content?.length || 0), 0)
    while (totalChars > MAX_HISTORY_CHARS && trimmedHistory.length > 2) {
      totalChars -= trimmedHistory[0].content?.length || 0
      trimmedHistory = trimmedHistory.slice(1)
    }

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
      ...trimmedHistory,
      {
        role: 'user' as const,
        content: message,
      },
    ]

    const response = await openAI.chatWithFunctions(messages, AI_FUNCTIONS, userId, organizationId)

    if (response.functionCall) {
      const fnName = response.functionCall.name

      // Role-based permission check: admin-only functions require ADMIN or MANAGER role
      if (ADMIN_ONLY_FUNCTIONS.has(fnName)) {
        const userRole = req.user!.role
        if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
          return res.status(403).json({
            success: false,
            message: `The action "${fnName}" requires admin or manager privileges.`,
            data: { functionBlocked: fnName, requiredRole: 'ADMIN or MANAGER', userRole },
          })
        }
      }

      // Destructive function confirmation gate: return a confirmation prompt
      // with a time-bound token unless the user provides a valid token
      if (DESTRUCTIVE_FUNCTIONS.has(fnName)) {
        const confirmationToken = req.body.confirmationToken
        if (confirmationToken) {
          // Validate the time-bound token
          const validation = validateConfirmationToken(confirmationToken, userId)
          if (!validation.valid) {
            return res.status(400).json({
              success: false,
              message: validation.error,
              data: { requiresConfirmation: true },
            })
          }
          // Token valid — proceed with execution below
          logger.info(`✅ Confirmed destructive function: ${fnName} (token validated)`)
        } else if (!req.body.confirmed) {
          // No token and no legacy confirmed flag — issue a new confirmation token
          const token = generateConfirmationToken(userId, organizationId, fnName, response.functionCall.arguments as Record<string, unknown>)
          logger.info(`⚠️ Destructive function requires confirmation: ${fnName}`)
          return res.json({
            success: true,
            data: {
              message: `I need your confirmation before I can execute this action: **${fnName}**. Please confirm to proceed.`,
              tokens: response.tokens,
              cost: response.cost,
              requiresConfirmation: true,
              confirmationToken: token,
              pendingFunction: {
                name: fnName,
                arguments: response.functionCall.arguments,
              },
            },
          })
        }
      }

      logger.info(`🎯 Executing function: ${fnName}`)

      const functionResult = await functionsService.executeFunction(
        fnName,
        response.functionCall.arguments as Record<string, string | number | boolean | string[] | Record<string, unknown> | undefined>,
        organizationId,
        userId,
        req.user!.role
      )

      logger.info(`✅ Function result:`, functionResult.substring(0, 200))

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

      // Track AI usage
      await incrementAIUsage(organizationId, 'aiMessages', {
        tokens: response.tokens + finalResponse.tokens,
        cost: response.cost + finalResponse.cost,
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

    // Track AI usage
    await incrementAIUsage(organizationId, 'aiMessages', {
      tokens: response.tokens,
      cost: response.cost,
    })

    res.json({
      success: true,
      data: {
        message: response.response,
        tokens: response.tokens,
        cost: response.cost,
      },
    })
  } catch (error: unknown) {
    logger.error('Chat error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to process chat message',
      error: getErrorMessage(error)
    })
  }
}

/**
 * Get chat history
 */
export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const organizationId = req.user!.organizationId
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200)

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
        feedback: true,
        createdAt: true,
      },
    })

    res.json({
      success: true,
      data: messages.reverse(),
    })
  } catch (error: unknown) {
    logger.error('Chat history error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat history',
      error: getErrorMessage(error)
    })
  }
}

/**
 * Clear chat history
 */
export const clearChatHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const organizationId = req.user!.organizationId

    const result = await prisma.chatMessage.deleteMany({
      where: { userId, organizationId },
    })

    res.json({
      success: true,
      data: { deleted: result.count },
    })
  } catch (error: unknown) {
    logger.error('Clear chat history error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to clear chat history',
      error: getErrorMessage(error)
    })
  }
}
