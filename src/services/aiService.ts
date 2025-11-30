import api from '@/lib/api'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  tokens?: number | null
  cost?: number | null
  createdAt: Date | string
}

export interface ChatResponse {
  success: boolean
  data: {
    message: string
    tokens: number
    cost: number
  }
}

export interface ChatHistoryResponse {
  success: boolean
  data: {
    messages: ChatMessage[]
    total: number
  }
}

export interface EnhanceMessageResponse {
  success: boolean
  data: {
    original: string
    enhanced: string
    improvements?: string[]
    tone: string
    type: string
    tokens?: number
    cost?: number
  }
}

export interface UsageResponse {
  success: boolean
  data: {
    period: {
      start: string
      end: string
    }
    chat: {
      totalMessages: number
      totalTokens: number
      totalCost: number
    }
  }
}

/**
 * Send a message to the AI chatbot
 */
export const sendChatMessage = async (
  message: string,
  conversationHistory?: Array<{ role: string; content: string }>,
  tone: string = 'FRIENDLY'
): Promise<ChatResponse> => {
  const response = await api.post('/ai/chat', {
    message,
    conversationHistory,
    tone,
  })
  return response.data
}

/**
 * Get chat history for the current user
 */
export const getChatHistory = async (limit = 50): Promise<ChatHistoryResponse> => {
  const response = await api.get('/ai/chat/history', {
    params: { limit },
  })
  return response.data
}

/**
 * Clear chat history
 */
export const clearChatHistory = async (): Promise<{ success: boolean; data: { deleted: number } }> => {
  const response = await api.delete('/ai/chat/history')
  return response.data
}

/**
 * Enhance a message with AI
 */
export const enhanceMessage = async (
  text: string,
  tone: 'professional' | 'friendly' | 'urgent' | 'casual' | 'persuasive' | 'formal' = 'professional'
): Promise<EnhanceMessageResponse> => {
  const response = await api.post('/ai/enhance-message', {
    message: text,
    tone,
  })
  return response.data
}

/**
 * Get AI usage statistics
 */
export const getAIUsage = async (startDate?: string): Promise<UsageResponse> => {
  const response = await api.get('/ai/usage', {
    params: startDate ? { startDate } : {},
  })
  return response.data
}

/**
 * Score a lead using AI
 */
export const scoreLeadWithAI = async (leadId: string): Promise<{
  success: boolean
  data: {
    leadId: string
    previousScore: number
    newScore: number
    scoredAt: Date
  }
}> => {
  const response = await api.post('/ai/score-lead', { leadId })
  return response.data
}

/**
 * Get lead score (existing endpoint)
 */
export const getLeadScore = async (leadId: string) => {
  const response = await api.get(`/ai/lead-score/${leadId}`)
  return response.data
}

/**
 * Suggest actions based on context (existing endpoint)
 */
export const suggestActions = async (context?: {
  context?: string
  leadId?: string
  campaignId?: string
}) => {
  const response = await api.post('/ai/suggest-actions', context || {})
  return response.data
}

export default {
  sendChatMessage,
  getChatHistory,
  clearChatHistory,
  enhanceMessage,
  getAIUsage,
  scoreLeadWithAI,
  getLeadScore,
  suggestActions,
}
