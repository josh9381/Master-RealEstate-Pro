import { prisma } from '../config/database'

export interface MessageContext {
  lead: {
    id: string
    name: string
    email: string
    phone: string
    score: number
    status: string
    interests: string[]
    budget?: number
    location?: string
  }
  engagement: {
    lastContact: Date | null
    totalMessages: number
    openRate: number
    responseRate: number
    avgResponseTime: number
  }
  conversation: {
    id: string
    messageCount: number
    recentMessages: Array<{
      role: 'user' | 'assistant'
      content: string
      timestamp: Date
    }>
  }
  properties: Array<{
    id: string
    address: string
    price: number
    type: string
    viewed: boolean
  }>
}

/**
 * Gather comprehensive message context for AI composition
 */
export async function gatherMessageContext(
  leadId: string,
  conversationId: string,
  organizationId: string
): Promise<MessageContext> {
  // Gather lead data with relationships
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    include: {
      tags: true,
      activities: { 
        orderBy: { createdAt: 'desc' }, 
        take: 10 
      },
      notes: { 
        orderBy: { createdAt: 'desc' }, 
        take: 5 
      }
    }
  })

  // If lead not found, this might be a direct message to email/phone (not a lead in system)
  // Get conversation messages to build context from actual communication
  if (!lead) {
    console.log(`No lead record for ${leadId}, building context from conversation messages`)
    
    // Get all messages in this conversation
    const messages = await prisma.message.findMany({
      where: { 
        organizationId,
        // Get messages by conversation ID or any messages associated with this contact
        OR: [
          { leadId: leadId },
          { id: conversationId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    
    // If no messages at all, this is a brand new conversation
    if (messages.length === 0) {
      console.log('New conversation with no history')
      
      // Use the leadId/conversationId as the identifier (could be phone or email)
      const isEmail = leadId.includes('@')
      const isPhone = /^\+?\d{10,}$/.test(leadId)
      
      return {
        lead: {
          id: leadId,
          name: isEmail ? leadId.split('@')[0] : (isPhone ? 'Contact' : 'New Contact'),
          email: isEmail ? leadId : '',
          phone: isPhone ? leadId : '',
          score: 50,
          status: 'NEW',
          interests: [],
          budget: undefined,
          location: undefined
        },
        engagement: {
          lastContact: null,
          totalMessages: 0,
          openRate: 0,
          responseRate: 0,
          avgResponseTime: 0
        },
        conversation: {
          id: conversationId,
          messageCount: 0,
          recentMessages: []
        },
        properties: []
      }
    }
    
    // We have message history - extract contact info and context from actual messages
    const recentMessage = messages[0]
    
    // Determine contact name and info from message metadata
    // For phone conversations, use the phone number
    // For email, use the email address or extract name from subject/body
    const contactIdentifier = leadId
    const isEmail = contactIdentifier.includes('@')
    const isPhone = /^\+?\d{10,}$/.test(contactIdentifier)
    
    // Calculate basic engagement metrics from actual message history
    const emailMetrics = calculateEmailMetrics(messages)
    
    return {
      lead: {
        id: leadId,
        name: isEmail ? contactIdentifier.split('@')[0] : (isPhone ? `Contact ${contactIdentifier.slice(-4)}` : 'Contact'),
        email: isEmail ? contactIdentifier : '',
        phone: isPhone ? contactIdentifier : '',
        score: 50, // Neutral score for non-leads
        status: 'NEW',
        interests: [],
        budget: undefined,
        location: undefined
      },
      engagement: {
        lastContact: recentMessage.createdAt,
        totalMessages: messages.length,
        openRate: emailMetrics.openRate,
        responseRate: emailMetrics.responseRate,
        avgResponseTime: emailMetrics.avgResponseTime
      },
      conversation: {
        id: conversationId,
        messageCount: messages.length,
        recentMessages: messages.slice(0, 5).map(m => ({
          role: m.direction === 'OUTBOUND' ? 'assistant' as const : 'user' as const,
          content: m.body || m.subject || '',
          timestamp: m.createdAt
        }))
      },
      properties: []
    }
  }

  // Get conversation messages
  // Note: Adjust this query based on your actual Message schema
  // If conversationId doesn't exist, use leadId or threadId instead
  const messages = await prisma.message.findMany({
    where: { 
      leadId: leadId,
      organizationId 
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      type: true,
      direction: true,
      subject: true,
      body: true,
      createdAt: true,
      status: true
    }
  })

  // Calculate engagement metrics
  const emailMetrics = calculateEmailMetrics(messages)

  // Get property interactions (placeholder - adjust based on your schema)
  const properties = await getLeadPropertyInteractions(leadId)

  return {
    lead: formatLeadData(lead),
    engagement: emailMetrics,
    conversation: formatConversation(messages, conversationId),
    properties
  }
}

interface LeadWithRelations {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  score: number | null
  status: string
  budget?: number | null
  location?: string | null
  tags: Array<{ name: string }>
}

interface MessageData {
  id: string
  type: string
  direction: string | null
  subject: string | null
  body: string | null
  createdAt: Date
  status: string | null
}

/**
 * Format lead data for context
 */
function formatLeadData(lead: LeadWithRelations): MessageContext['lead'] {
  return {
    id: lead.id,
    name: `${lead.firstName} ${lead.lastName}`,
    email: lead.email || '',
    phone: lead.phone || '',
    score: lead.score || 0,
    status: lead.status,
    interests: lead.tags?.map((t) => t.name) || [],
    budget: lead.budget || undefined,
    location: lead.location || undefined
  }
}

/**
 * Calculate email engagement metrics
 */
function calculateEmailMetrics(messages: MessageData[]): MessageContext['engagement'] {
  const outboundMessages = messages.filter(m => m.direction === 'OUTBOUND')
  const inboundMessages = messages.filter(m => m.direction === 'INBOUND')
  
  // Find last contact
  const lastContact = messages.length > 0 ? messages[0].createdAt : null
  
  // Calculate open rate (using status if available)
  const emailMessages = outboundMessages.filter(m => m.type === 'EMAIL')
  const openedMessages = emailMessages.filter(m => m.status === 'READ' || m.status === 'OPENED')
  const openRate = emailMessages.length > 0 
    ? Math.round((openedMessages.length / emailMessages.length) * 100) 
    : 0
  
  // Calculate response rate
  const responseRate = outboundMessages.length > 0
    ? Math.round((inboundMessages.length / outboundMessages.length) * 100)
    : 0
  
  // Calculate average response time (in hours)
  let totalResponseTime = 0
  let responseCount = 0
  
  for (let i = 0; i < messages.length - 1; i++) {
    if (messages[i].direction === 'OUTBOUND' && messages[i + 1].direction === 'INBOUND') {
      const timeDiff = new Date(messages[i + 1].createdAt).getTime() - new Date(messages[i].createdAt).getTime()
      totalResponseTime += timeDiff
      responseCount++
    }
  }
  
  const avgResponseTime = responseCount > 0 
    ? Math.round(totalResponseTime / responseCount / (1000 * 60 * 60)) // Convert to hours
    : 0

  return {
    lastContact,
    totalMessages: messages.length,
    openRate,
    responseRate,
    avgResponseTime
  }
}

/**
 * Format conversation history
 */
function formatConversation(messages: MessageData[], conversationId: string): MessageContext['conversation'] {
  const recentMessages = messages.slice(0, 5).map(m => ({
    role: (m.direction === 'OUTBOUND' ? 'assistant' : 'user') as 'user' | 'assistant',
    content: m.body || m.subject || '',
    timestamp: m.createdAt
  }))

  return {
    id: conversationId,
    messageCount: messages.length,
    recentMessages
  }
}

/**
 * Get property interactions for lead
 * This is a placeholder - adjust based on your actual schema
 */
async function getLeadPropertyInteractions(leadId: string): Promise<MessageContext['properties']> {
  try {
    // Check if Property model exists and has relationship with Lead
    const properties = await prisma.$queryRaw`
      SELECT p.id, p.address, p.price, p.type
      FROM "Property" p
      INNER JOIN "PropertyView" pv ON pv."propertyId" = p.id
      WHERE pv."leadId" = ${leadId}
      LIMIT 10
    ` as Array<{ id: string; address: string; price: number; type: string }>

    return properties.map(p => ({
      id: p.id,
      address: p.address || 'Property',
      price: p.price || 0,
      type: p.type || 'residential',
      viewed: true
    }))
  } catch (error) {
    // If Property table doesn't exist, return empty array
    return []
  }
}

/**
 * Helper: Format date for display
 */
export function formatDate(date: Date): string {
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

/**
 * Helper: Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Helper: Get score label
 */
export function getScoreLabel(score: number): string {
  if (score >= 80) return 'HOT'
  if (score >= 60) return 'WARM'
  if (score >= 40) return 'COOL'
  return 'COLD'
}
