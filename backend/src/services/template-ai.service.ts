import { getOpenAIService } from './openai.service'
import { gatherMessageContext, MessageContext } from './message-context.service'

// In-memory template storage for Phase 3 MVP
// TODO Phase 4: Migrate to database with MessageTemplate model
export interface MessageTemplate {
  id: string
  name: string
  category: string
  subject: string | null
  content: string
  organizationId: string
  createdBy: string
  createdAt: Date
}

const templates = new Map<string, MessageTemplate>()

export interface TemplateGenerationResult {
  message: string
  subject: string | null
  changes: string[]
}

/**
 * Generate a message from a template with AI personalization
 */
export async function generateFromTemplate(
  templateId: string,
  context: { leadId?: string; conversationId?: string },
  tone: string,
  userId: string,
  orgId: string
): Promise<TemplateGenerationResult> {
  const template = templates.get(templateId)

  if (!template || template.organizationId !== orgId) {
    throw new Error('Template not found')
  }

  // Gather lead context if provided
  let messageContext: MessageContext | undefined
  if (context.leadId && context.conversationId) {
    messageContext = await gatherMessageContext(
      context.leadId,
      context.conversationId,
      orgId
    )
  }

  // Build personalization prompt
  const contextStr = messageContext
    ? `Lead Name: ${messageContext.lead.name}
Email: ${messageContext.lead.email}
Phone: ${messageContext.lead.phone || 'N/A'}
Status: ${messageContext.lead.status}
Lead Score: ${messageContext.lead.score}/100
Last Contact: ${messageContext.engagement.lastContact || 'Never'}
Total Messages: ${messageContext.engagement.totalMessages}
Response Rate: ${messageContext.engagement.responseRate}%`
    : 'No lead context available'

  const prompt = `You are personalizing a message template for a real estate lead.

TEMPLATE:
Subject: ${template.subject || 'N/A'}
Body: ${template.content}

LEAD CONTEXT:
${contextStr}

INSTRUCTIONS:
1. Replace [PLACEHOLDERS] with real lead information
2. Adjust tone to be ${tone}
3. Add personal touches based on lead context
4. Keep the core message intact
5. Return ONLY the personalized message, no explanations

Respond in JSON format with subject, message, and changes array.`

  const openai = getOpenAIService()
  const response = await openai.chat([
    { role: 'system', content: 'You are an expert at personalizing sales messages.' },
    { role: 'user', content: prompt }
  ], userId, orgId)

  let result
  try {
    result = JSON.parse(response.response)
  } catch (e) {
    throw new Error('Failed to parse AI response')
  }

  return {
    message: result.message,
    subject: result.subject || template.subject,
    changes: result.changes || []
  }
}

/**
 * Save a message as a reusable template
 */
export async function saveAsTemplate(
  message: string,
  name: string,
  category: string,
  orgId: string,
  userId: string
): Promise<MessageTemplate> {
  // Use AI to strip personalization and create generic template
  const prompt = `Convert this personalized message into a reusable template by replacing specific details with [PLACEHOLDERS].

MESSAGE:
${message}

INSTRUCTIONS:
1. Replace specific names with [LEAD_NAME]
2. Replace specific addresses with [PROPERTY_ADDRESS]
3. Replace specific numbers/prices with [PRICE] or [NUMBER]
4. Replace specific dates with [DATE]
5. Keep the tone and structure
6. Make it reusable for any lead

Respond in JSON format with subject and content fields.`

  const openai = getOpenAIService()
  const response = await openai.chat([
    { role: 'system', content: 'You are an expert at creating reusable message templates.' },
    { role: 'user', content: prompt }
  ], userId, orgId)

  let genericMessage
  try {
    genericMessage = JSON.parse(response.response)
  } catch (e) {
    throw new Error('Failed to parse AI response')
  }

  // Create template
  const template: MessageTemplate = {
    id: `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    category,
    subject: genericMessage.subject || null,
    content: genericMessage.content,
    organizationId: orgId,
    createdBy: userId,
    createdAt: new Date()
  }

  templates.set(template.id, template)
  return template
}

/**
 * Get user's templates
 */
export async function getUserTemplates(
  orgId: string,
  category?: string
): Promise<MessageTemplate[]> {
  const userTemplates = Array.from(templates.values())
    .filter(t => t.organizationId === orgId)

  if (category) {
    return userTemplates.filter(t => t.category === category)
  }

  return userTemplates
}

/**
 * Delete a template
 */
export async function deleteTemplate(
  templateId: string,
  orgId: string
): Promise<boolean> {
  const template = templates.get(templateId)
  
  if (!template || template.organizationId !== orgId) {
    return false
  }

  return templates.delete(templateId)
}
