import { getErrorMessage } from '../utils/errors'
import { logger } from '../lib/logger'
import { Request, Response } from 'express'
import crypto from 'crypto'
import { getIntelligenceService } from '../services/intelligence.service'
import { getOpenAIService, ASSISTANT_TONES, AssistantTone } from '../services/openai.service'
import { getAIFunctionsService, AI_FUNCTIONS, DESTRUCTIVE_FUNCTIONS, ADMIN_ONLY_FUNCTIONS } from '../services/ai-functions.service'
import { incrementAIUsage } from '../services/usage-tracking.service'
import prisma from '../config/database'
import { getRedisClient } from '../config/redis'

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
 * Uses Redis when available for multi-instance support, falls back to in-memory.
 */
const confirmationTokens = new Map<string, {
  userId: string
  organizationId: string
  functionName: string
  args: Record<string, unknown>
  expiresAt: number
}>()

const CONFIRMATION_TOKEN_PREFIX = 'ai_confirm:'
const CONFIRMATION_TTL_SEC = 120

async function storeConfirmationToken(token: string, data: { userId: string; organizationId: string; functionName: string; args: Record<string, unknown>; expiresAt: number }): Promise<void> {
  const redis = getRedisClient()
  if (redis) {
    await redis.set(`${CONFIRMATION_TOKEN_PREFIX}${token}`, JSON.stringify(data), 'EX', CONFIRMATION_TTL_SEC)
  }
  // Always store in-memory as fallback
  confirmationTokens.set(token, data)
}

async function retrieveConfirmationToken(token: string): Promise<{ userId: string; organizationId: string; functionName: string; args: Record<string, unknown>; expiresAt: number } | null> {
  const redis = getRedisClient()
  if (redis) {
    const raw = await redis.get(`${CONFIRMATION_TOKEN_PREFIX}${token}`)
    if (raw) return JSON.parse(raw)
  }
  return confirmationTokens.get(token) || null
}

async function deleteConfirmationToken(token: string): Promise<void> {
  const redis = getRedisClient()
  if (redis) {
    await redis.del(`${CONFIRMATION_TOKEN_PREFIX}${token}`)
  }
  confirmationTokens.delete(token)
}

function generateConfirmationToken(userId: string, organizationId: string, functionName: string, args: Record<string, unknown>): string {
  const token = crypto.randomBytes(32).toString('hex')
  const data = {
    userId,
    organizationId,
    functionName,
    args,
    expiresAt: Date.now() + 2 * 60 * 1000, // 2 minutes
  }
  storeConfirmationToken(token, data)
  // Prune expired tokens periodically (max 200 entries as safety valve)
  if (confirmationTokens.size > 200) {
    const now = Date.now()
    for (const [k, v] of confirmationTokens) {
      if (v.expiresAt < now) confirmationTokens.delete(k)
    }
  }
  return token
}

async function validateConfirmationToken(token: string, userId: string): Promise<{ valid: boolean; data?: { userId: string; organizationId: string; functionName: string; args: Record<string, unknown>; expiresAt: number }; error?: string }> {
  const entry = await retrieveConfirmationToken(token)
  if (!entry) return { valid: false, error: 'Invalid or expired confirmation token' }
  if (entry.expiresAt < Date.now()) {
    await deleteConfirmationToken(token)
    return { valid: false, error: 'Confirmation token has expired. Please try again.' }
  }
  if (entry.userId !== userId) {
    return { valid: false, error: 'Confirmation token does not belong to this user' }
  }
  // Single-use: delete after validation
  await deleteConfirmationToken(token)
  return { valid: true, data: entry }
}

/**
 * Chat with AI Assistant (OpenAI GPT-4)
 */
export const chatWithAI = async (req: Request, res: Response) => {
  try {
    logger.info('🎤 Chat request received:', String(req.body?.message ?? '').substring(0, 100))
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
=== LEAD MANAGEMENT ===
✅ CREATE leads (use create_lead function)
✅ UPDATE leads (use update_lead function)
✅ DELETE leads (use delete_lead function)
✅ SEARCH leads (use search_leads function)
✅ GET lead details (use get_lead_details function)
✅ COUNT leads (use get_lead_count function)
✅ ADD notes to leads (use add_note_to_lead function)
✅ ADD/REMOVE tags on leads (use add_tag_to_lead / remove_tag_from_lead)
✅ UPDATE lead status (use update_lead_status function)
✅ BULK update/delete leads (use bulk_update_leads / bulk_delete_leads)

=== COMMUNICATION ===
✅ SEND emails (use send_email function)
✅ SEND SMS messages (use send_sms function)
✅ COMPOSE personalized emails (use compose_email function)
✅ COMPOSE SMS messages (use compose_sms function)
✅ COMPOSE call scripts (use compose_script function)

=== PIPELINE MANAGEMENT ===
✅ VIEW pipelines and stages (use get_pipelines)
✅ CREATE new sales pipelines (use create_pipeline)
✅ MOVE leads between stages (use move_lead_to_stage)
✅ VIEW pipeline leads by stage (use get_pipeline_leads)

=== TASKS & APPOINTMENTS ===
✅ CREATE/UPDATE/DELETE/COMPLETE tasks (use create_task, update_task, delete_task, complete_task)
✅ LIST all tasks (use list_tasks)
✅ SCHEDULE appointments (use schedule_appointment)
✅ UPDATE/CANCEL/CONFIRM/RESCHEDULE appointments
✅ LIST upcoming appointments (use list_appointments)

=== CALL LOGGING ===
✅ LOG phone calls (use log_call function)
✅ GET call statistics (use get_call_stats)
✅ LIST recent calls (use get_calls)

=== CAMPAIGNS & AUTOMATION ===
✅ CREATE/UPDATE/DELETE campaigns (use create_campaign, etc.)
✅ LIST all campaigns (use list_campaigns)
✅ SEND/PAUSE/ARCHIVE campaigns
✅ GET campaign analytics (use get_campaign_analytics)
✅ CREATE/UPDATE/DELETE workflows (use create_workflow, etc.)
✅ LIST all workflows (use list_workflows)
✅ TOGGLE/TRIGGER workflows

=== TEMPLATES ===
✅ CREATE/DELETE email templates (use create_email_template, etc.)
✅ CREATE/DELETE SMS templates (use create_sms_template, etc.)
✅ LIST all email/SMS templates (use list_email_templates, list_sms_templates)

=== GOALS & ANALYTICS ===
✅ CREATE goals (use create_goal - e.g., "close 10 deals this month")
✅ LIST goals with progress (use list_goals)
✅ UPDATE/DELETE goals (use update_goal, delete_goal)
✅ GET dashboard stats (use get_dashboard_stats)
✅ GET lead analytics (use get_lead_analytics)
✅ GET conversion funnel (use get_conversion_funnel)

=== AI INTELLIGENCE ===
✅ PREDICT conversions (use predict_conversion)
✅ RECOMMEND next actions (use get_next_action)
✅ ANALYZE engagement (use analyze_engagement)
✅ IDENTIFY at-risk leads (use identify_at_risk_leads)

=== NOTIFICATIONS ===
✅ GET notifications (use get_notifications)
✅ CHECK unread count (use get_unread_notification_count)
✅ MARK all as read (use mark_notifications_read)

=== NOTES, TAGS & ACTIVITIES ===
✅ ADD/UPDATE/DELETE notes
✅ CREATE/UPDATE/DELETE tags
✅ LOG activities (use create_activity)
✅ VIEW recent activities (use get_recent_activities)

=== CUSTOM FIELDS ===
✅ VIEW custom fields (use get_custom_fields)
✅ CREATE custom fields (use create_custom_field - e.g., "Property Type", "Budget")
✅ DELETE custom fields (use delete_custom_field)

=== DATA EXPORT ===
✅ EXPORT leads, activities, campaigns, tasks as CSV or JSON (use export_data)

=== SAVED FILTERS & REPORTS ===
✅ LIST/CREATE/DELETE saved filters (use list_saved_filters, etc.)
✅ LIST/CREATE/DELETE saved reports (use list_saved_reports, etc.)

=== TEAM & SETTINGS ===
✅ LIST team members (use list_team_members)
✅ VIEW/UPDATE user profile (use get_user_profile, update_user_profile)
✅ VIEW/UPDATE business settings (use get_business_settings, update_business_settings)

=== INTEGRATIONS ===
✅ CONNECT/DISCONNECT integrations (Twilio, SendGrid, Zapier, Calendly, Stripe)
✅ SYNC integrations (use sync_integration)

IMPORTANT INSTRUCTIONS:
- When user asks you to DO something, USE THE FUNCTION to do it
- Don't say "Here's how to create a lead" - Just CREATE it using create_lead
- Don't say "You can add a note" - Just ADD it using add_note_to_lead
- Be proactive: if user gives you lead info, CREATE the lead immediately
- After performing action, confirm what you did with the result
- When user asks to see or list something, use the appropriate list function
- When asked about stats or analytics, use the analytics functions
- For pipelines, goals, calls - use the respective functions

EXAMPLES:
User: "Create a lead for John Smith, email john@example.com"
You: [USE create_lead function] → "✅ Created new lead: John Smith"

User: "What's in my pipeline?"
You: [USE get_pipeline_leads function] → Show leads by stage

User: "Set a goal to close 5 deals this month"
You: [USE create_goal function] → "✅ Created goal: Close 5 deals"

User: "Log a call with Sarah - she was interested"
You: [USE log_call function] → "✅ Logged call with Sarah"

User: "Show my notifications"
You: [USE get_notifications function] → List notifications

User: "Export my leads"
You: [USE export_data function] → Return CSV/JSON data

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
          const validation = await validateConfirmationToken(confirmationToken, userId)
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
