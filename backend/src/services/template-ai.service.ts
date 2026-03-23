import { getOpenAIService } from './openai.service'
import { gatherMessageContext, MessageContext } from './message-context.service'
import { prisma } from '../config/database'

// Interface for template data used by this service
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
  const template = await prisma.messageTemplate.findFirst({
    where: { id: templateId, organizationId: orgId },
  })

  if (!template) {
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
Subject: N/A
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
    subject: result.subject || null,
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

  // Create template in database
  const template = await prisma.messageTemplate.create({
    data: {
      name,
      category,
      content: genericMessage.content,
      tier: 'PERSONAL',
      organizationId: orgId,
      userId: userId,
    },
  })

  return {
    id: template.id,
    name: template.name,
    category: template.category || category,
    subject: genericMessage.subject || null,
    content: template.content,
    organizationId: template.organizationId,
    createdBy: template.userId || userId,
    createdAt: template.createdAt,
  }
}

/**
 * Get user's templates
 */
export async function getUserTemplates(
  orgId: string,
  category?: string
): Promise<MessageTemplate[]> {
  const where: Record<string, unknown> = { organizationId: orgId, isActive: true }
  if (category) {
    where.category = category
  }

  const templates = await prisma.messageTemplate.findMany({ where, orderBy: { createdAt: 'desc' } })
  return templates.map(t => ({
    id: t.id,
    name: t.name,
    category: t.category || '',
    subject: null,
    content: t.content,
    organizationId: t.organizationId,
    createdBy: t.userId || '',
    createdAt: t.createdAt,
  }))
}

/**
 * Delete a template
 */
export async function deleteTemplate(
  templateId: string,
  orgId: string
): Promise<boolean> {
  const template = await prisma.messageTemplate.findFirst({
    where: { id: templateId, organizationId: orgId },
  })
  
  if (!template) {
    return false
  }

  await prisma.messageTemplate.update({
    where: { id: templateId },
    data: { isActive: false },
  })
  return true
}
