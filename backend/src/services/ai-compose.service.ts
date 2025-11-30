import { getOpenAIService } from './openai.service'
import { MessageContext, formatDate, formatCurrency, getScoreLabel } from './message-context.service'
import { predictResponseRate, generatePredictionReasoning } from './prediction.service'
import { generateSmartSuggestions as generateSuggestions, Suggestion } from './suggestions.service'

export interface ComposeSettings {
  tone: 'professional' | 'friendly' | 'direct' | 'coaching' | 'casual'
  length: 'brief' | 'standard' | 'detailed'
  includeCTA: boolean
  personalization: 'basic' | 'standard' | 'deep'
  templateBase?: string
  includeProperties?: string[]
  addUrgency?: boolean
  draftMessage?: string // User's draft to enhance
}

export interface ComposedMessage {
  subject?: string
  body: string
}

export interface ComposeResult {
  message: ComposedMessage
  context: {
    leadName: string
    leadScore: number
    lastContact: string | null
    daysSinceContact: number
    openRate: number
    responseRate: number
    tokens: number
    cost: number
  }
  suggestions: Array<{
    type: string
    text: string
    action?: unknown
  }>
  tokens: number
  cost: number
}

/**
 * Generate contextual message using AI
 */
export async function generateContextualMessage(
  context: MessageContext,
  messageType: 'email' | 'sms' | 'call',
  settings: ComposeSettings,
  userId: string,
  organizationId: string
): Promise<ComposeResult> {
  const openAI = getOpenAIService()
  
  // Build enhanced prompt
  const prompt = buildComposePrompt(context, messageType, settings)
  
  // Generate with GPT-4
  const response = await openAI.chat(
    [{ role: 'user', content: prompt }],
    userId,
    organizationId
  )

  // Parse and structure response
  const parsedMessage = parseMessageResponse(response.response, messageType)
  const contextSummary = buildContextSummary(context, response.tokens, response.cost)
  const suggestions = generateSmartSuggestions(context, settings)

  return {
    message: parsedMessage,
    context: contextSummary,
    suggestions,
    tokens: response.tokens,
    cost: response.cost
  }
}

/**
 * Build comprehensive prompt for message generation
 */
function buildComposePrompt(
  context: MessageContext,
  messageType: string,
  settings: ComposeSettings
): string {
  const { lead, engagement, conversation } = context
  
  // Format conversation history
  const conversationHistory = conversation.recentMessages
    .slice(0, 3)
    .reverse()
    .map(m => `${m.role === 'user' ? lead.name : 'Agent'}: ${m.content.substring(0, 150)}`)
    .join('\n')
  
  // If draft message provided, use enhancement prompt
  if (settings.draftMessage) {
    return buildEnhancementPrompt(context, messageType, settings)
  }
  
  return `Generate a ${settings.tone} ${messageType} for a real estate lead.

LEAD CONTEXT:
- Name: ${lead.name}
- Score: ${lead.score}/100 (${getScoreLabel(lead.score)})
- Status: ${lead.status}
- Interests: ${lead.interests.length > 0 ? lead.interests.join(', ') : 'Not specified'}
- Budget: ${lead.budget ? formatCurrency(lead.budget) : 'Not specified'}
- Location: ${lead.location || 'Not specified'}

ENGAGEMENT DATA:
- Last Contact: ${engagement.lastContact ? formatDate(engagement.lastContact) : 'Never contacted'}
- Total Messages: ${engagement.totalMessages}
- Open Rate: ${engagement.openRate}%
- Response Rate: ${engagement.responseRate}%
- Avg Response Time: ${engagement.avgResponseTime} hours

CONVERSATION HISTORY (Last 3 messages):
${conversationHistory || 'No previous conversation'}

PROPERTIES VIEWED:
${context.properties.length > 0 
  ? context.properties.map(p => `- ${p.address} ($${formatCurrency(p.price)})`).join('\n')
  : 'None yet'}

REQUIREMENTS:
- Tone: ${settings.tone}
- Length: ${getLengthGuide(settings.length)}
- CTA: ${settings.includeCTA ? 'Include clear call-to-action' : 'No hard CTA needed'}
- Personalization: ${settings.personalization}
- ${messageType === 'email' ? 'Include subject line (start with "Subject:")' : ''}
- ${messageType === 'sms' ? 'Max 160 characters - be very concise' : ''}
- Sound natural and authentic, not robotic
- Reference specific context when relevant
- ${settings.addUrgency ? 'Add gentle urgency (limited time, high interest)' : ''}
- Use the lead's first name naturally in the message
- ${engagement.lastContact ? 'Reference previous conversation naturally' : 'This is first contact - be welcoming'}

Generate the message now:`
}

/**
 * Build prompt for enhancing user's draft message
 */
function buildEnhancementPrompt(
  context: MessageContext,
  messageType: string,
  settings: ComposeSettings
): string {
  const { lead, engagement } = context
  
  return `You are enhancing a ${messageType} draft for a real estate lead.

LEAD CONTEXT:
- Name: ${lead.name}
- Score: ${lead.score}/100 (${getScoreLabel(lead.score)})
- Status: ${lead.status}
- Last Contact: ${engagement.lastContact ? formatDate(engagement.lastContact) : 'First contact'}
- Open Rate: ${engagement.openRate}%
- Response Rate: ${engagement.responseRate}%

USER'S DRAFT MESSAGE:
${settings.draftMessage}

YOUR TASK:
1. Keep the core message and intent from the draft
2. Enhance with ${settings.tone} tone
3. Add personalization using lead's name (${lead.name}) and context
4. ${settings.includeCTA ? 'Strengthen the call-to-action' : 'Keep it conversational'}
5. ${messageType === 'email' ? 'Improve subject line if needed (start with "Subject:")' : ''}
6. ${messageType === 'sms' ? 'Keep under 160 characters' : 'Maintain appropriate length'}
7. Fix any grammar/spelling issues
8. Make it sound natural and authentic, not robotic
9. ${engagement.responseRate > 50 ? 'This lead is responsive - be direct' : 'This lead needs warming up - be engaging'}

Enhance the message now, keeping what works and improving what doesn't:`
}

/**
 * Get length guide for prompts
 */
function getLengthGuide(length: string): string {
  switch (length) {
    case 'brief':
      return '50-100 words - short and direct'
    case 'detailed':
      return '200-300 words - comprehensive with details'
    case 'standard':
    default:
      return '100-150 words - balanced length'
  }
}

/**
 * Parse AI response into structured message
 */
function parseMessageResponse(response: string, messageType: string): ComposedMessage {
  if (messageType === 'email') {
    // Extract subject line
    const subjectMatch = response.match(/Subject:?\s*(.+?)[\n\r]/i)
    const subject = subjectMatch ? subjectMatch[1].trim() : 'Follow Up'
    
    // Extract body (everything after subject line)
    const body = response
      .replace(/Subject:?\s*.+?[\n\r]/i, '')
      .trim()
    
    return { subject, body }
  }
  
  // For SMS and call scripts, return full response as body
  return { body: response.trim() }
}

/**
 * Build context summary for UI display
 */
function buildContextSummary(
  context: MessageContext,
  tokens: number,
  cost: number
): ComposeResult['context'] {
  const daysSinceContact = context.engagement.lastContact
    ? Math.floor((Date.now() - context.engagement.lastContact.getTime()) / (1000 * 60 * 60 * 24))
    : 999

  return {
    leadName: context.lead.name,
    leadScore: context.lead.score,
    lastContact: context.engagement.lastContact ? formatDate(context.engagement.lastContact) : null,
    daysSinceContact,
    openRate: context.engagement.openRate,
    responseRate: context.engagement.responseRate,
    tokens,
    cost
  }
}

/**
 * Generate smart suggestions based on context (wrapper for suggestions service)
 */
function generateSmartSuggestions(
  context: MessageContext,
  currentSettings: ComposeSettings
): ComposeResult['suggestions'] {
  const suggestions = generateSuggestions(context, currentSettings)
  
  // Convert Suggestion type to ComposeResult suggestion format
  return suggestions.map(s => ({
    type: s.type,
    text: s.text,
    action: s.action
  }))
}

/**
 * Generate variations of message with different tones
 */
export async function generateVariations(
  context: MessageContext,
  messageType: string,
  baseSettings: ComposeSettings,
  userId: string,
  organizationId: string
): Promise<Array<{
  id: number
  tone: string
  message: ComposedMessage
  predictedResponseRate: number
  reasoning: string
}>> {
  const tones: Array<ComposeSettings['tone']> = ['professional', 'friendly', 'direct']
  const openAI = getOpenAIService()
  
  // Generate all three variations in parallel
  const variationPromises = tones.map(async (tone, index) => {
    const settings = { ...baseSettings, tone }
    const prompt = buildComposePrompt(context, messageType, settings)
    
    const response = await openAI.chat(
      [{ role: 'user', content: prompt }],
      userId,
      organizationId
    )
    
    const message = parseMessageResponse(response.response, messageType)
    const predictedRate = await predictResponseRate(message.body, context)
    
    return {
      id: index,
      tone,
      message,
      predictedResponseRate: predictedRate,
      reasoning: generateVariationReasoning(tone, predictedRate, context)
    }
  })
  
  const variations = await Promise.all(variationPromises)
  
  // Sort by predicted response rate (highest first)
  return variations.sort((a, b) => b.predictedResponseRate - a.predictedResponseRate)
}

/**
 * Generate reasoning for variation score
 */
function generateVariationReasoning(tone: string, score: number, context: MessageContext): string {
  // Use the prediction service's reasoning
  const baseReasoning = generatePredictionReasoning(score, '', context)
  
  // Add tone-specific reasoning
  const toneReasons: string[] = []
  
  if (context.lead.score > 80 && tone === 'direct') {
    toneReasons.push('direct tone matches hot lead')
  } else if (context.lead.score < 40 && tone === 'friendly') {
    toneReasons.push('friendly tone best for cold lead')
  }
  
  const combined = toneReasons.length > 0 
    ? `${toneReasons.join(', ')}, ${baseReasoning}`
    : baseReasoning
    
  return combined || 'Based on lead profile and engagement history'
}
