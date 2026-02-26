import { Request, Response } from 'express'
import { prisma } from '../config/database'
import { NotFoundError, ValidationError } from '../middleware/errorHandler'
import { sendEmail as sendEmailService } from '../services/email.service'
import { sendSMS as sendSMSService } from '../services/sms.service'
import { templateService } from '../services/template.service'
import crypto from 'crypto'
import { getMessagesFilter, getRoleFilterFromRequest } from '../utils/roleFilters'

type MessageType = 'EMAIL' | 'SMS' | 'CALL' | 'SOCIAL' | 'NEWSLETTER'
type MessageDirection = 'INBOUND' | 'OUTBOUND'
type MessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'OPENED' | 'CLICKED'

// Get all messages (inbox) - grouped by threads
export const getMessages = async (req: Request, res: Response) => {
  const { type, direction, status, leadId, search, page = 1, limit = 50 } = req.query

  // Build where clause with role-based filtering
  const roleFilter = getRoleFilterFromRequest(req)
  const additionalWhere: Record<string, unknown> = {}

  if (type) {
    additionalWhere.type = type as MessageType
  }

  if (direction) {
    additionalWhere.direction = direction as MessageDirection
  }

  if (status) {
    additionalWhere.status = status as MessageStatus
  }

  if (leadId) {
    additionalWhere.leadId = leadId as string
  }

  if (search) {
    const searchTerm = search as string
    additionalWhere.OR = [
      { subject: { contains: searchTerm, mode: ('insensitive' as const) } },
      { body: { contains: searchTerm, mode: ('insensitive' as const) } },
      { fromAddress: { contains: searchTerm, mode: ('insensitive' as const) } },
      { toAddress: { contains: searchTerm, mode: ('insensitive' as const) } },
    ]
  }

  const where = getMessagesFilter(roleFilter, additionalWhere)

  const pageNum = Number(page)
  const limitNum = Number(limit)
  const skip = (pageNum - 1) * limitNum

  // Get all messages first
  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  })

  // Helper function to normalize phone numbers for consistent grouping
  const normalizePhone = (phone: string): string => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '')
    // If it starts with 1 and has 11 digits, it's a US number with country code
    if (digits.length === 11 && digits.startsWith('1')) {
      return digits.substring(1) // Remove leading 1
    }
    // If it has 10 digits, it's already normalized
    if (digits.length === 10) {
      return digits
    }
    // Otherwise return as-is (might be international)
    return digits
  }

  // Group messages into threads
  const threadMap = new Map<string, any>()

  messages.forEach((message) => {
    // Normalize thread grouping: use leadId first, then group by contact phone/email
    // For SMS/calls, the contact is either fromAddress (inbound) or toAddress (outbound)
    let threadKey: string
    let contactIdentifier: string
    
    if (message.leadId) {
      // If we have a lead, use that as the thread key
      threadKey = message.leadId
      contactIdentifier = message.direction === 'INBOUND' ? message.fromAddress : message.toAddress
    } else if (message.type === 'SMS' || message.type === 'CALL') {
      // For SMS/calls without a lead, group by the other party's phone number (normalized)
      const rawContact = message.direction === 'INBOUND' ? message.fromAddress : message.toAddress
      contactIdentifier = rawContact
      // Normalize the phone number for consistent threading
      threadKey = normalizePhone(rawContact)
    } else if (message.type === 'EMAIL') {
      // For emails without a lead, group by the other party's email (lowercase)
      contactIdentifier = message.direction === 'INBOUND' ? message.fromAddress : message.toAddress
      threadKey = contactIdentifier.toLowerCase()
    } else {
      // Fallback to original logic
      threadKey = message.threadId || message.fromAddress
      contactIdentifier = message.direction === 'INBOUND' ? message.fromAddress : message.toAddress
    }

    if (!threadMap.has(threadKey)) {
      // Create new thread
      const contactName = message.lead
        ? `${message.lead.firstName} ${message.lead.lastName}`
        : contactIdentifier

      threadMap.set(threadKey, {
        id: threadKey,
        threadId: message.threadId || threadKey,
        contact: contactName,
        type: message.type.toLowerCase(),
        subject: message.subject || '',
        lastMessage: message.body.substring(0, 100),
        timestamp: message.createdAt,
        unread: 0, // Will be calculated after all messages are added
        messages: [],
        leadId: message.leadId,
        lead: message.lead,
      })
    }

    // Add message to thread
    const thread = threadMap.get(threadKey)
    thread.messages.push({
      id: message.id,
      threadId: message.threadId || threadKey,
      type: message.type.toLowerCase(),
      direction: message.direction, // Include direction for proper UI display
      from: message.fromAddress,
      to: message.toAddress,
      contact: thread.contact,
      subject: message.subject,
      body: message.body,
      timestamp: message.createdAt,
      date: message.createdAt,
      unread: !message.readAt && message.direction === 'INBOUND',
      starred: false,
      status: message.status.toLowerCase(),
      emailOpened: message.status === 'OPENED' || message.status === 'CLICKED',
      emailClicked: message.status === 'CLICKED',
      readAt: message.readAt,
    })

    // Update thread's last message time if this is more recent
    if (new Date(message.createdAt) > new Date(thread.timestamp)) {
      thread.timestamp = message.createdAt
      thread.lastMessage = message.body.substring(0, 100)
    }
  })

  // Convert map to array and sort threads by most recent
  const threads = Array.from(threadMap.values()).map(thread => {
    // Sort messages within each thread by timestamp (oldest first, like iMessage)
    thread.messages.sort((a: any, b: any) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    // Calculate total unread count for the thread (only INBOUND messages that haven't been read)
    thread.unread = thread.messages.filter((m: any) => m.unread).length
    return thread
  }).sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  // Apply pagination
  const paginatedThreads = threads.slice(skip, skip + limitNum)
  const total = threads.length

  res.json({
    success: true,
    data: {
      threads: paginatedThreads,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    }
  })
}

// Get single message
export const getMessage = async (req: Request, res: Response) => {
  const { id } = req.params
  const organizationId = req.user!.organizationId

  const message = await prisma.message.findFirst({
    where: { id, organizationId },
  })

  if (!message) {
    throw new NotFoundError('Message not found')
  }

  res.json({
    success: true,
    data: { message }
  })
}

// Send email
export const sendEmail = async (req: Request, res: Response) => {
  const { to, subject, body, leadId, templateId, templateVariables, threadId } = req.body
  const organizationId = req.user!.organizationId

  let finalSubject = subject
  let finalBody = body

  // If templateId is provided, render the template
  if (templateId) {
    const template = await prisma.emailTemplate.findFirst({
      where: { id: templateId, organizationId }
    })

    if (!template) {
      throw new NotFoundError('Email template not found')
    }

    if (!template.isActive) {
      throw new ValidationError('Email template is not active')
    }

    // Build context for template rendering
    const context: Record<string, unknown> = {
      lead: {},
      user: {},
      system: {},
      custom: templateVariables || {}
    }

    // If leadId provided, fetch lead data
    if (leadId) {
      const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId } })
      if (lead) {
        const {firstName, lastName} = { firstName: lead.firstName, lastName: lead.lastName }
        context.lead = {
          id: lead.id,
          name: `${lead.firstName} ${lead.lastName}`.trim(),
          firstName,
          lastName,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          position: lead.position,
          status: lead.status,
          score: lead.score,
          value: lead.value,
          source: lead.source
        }
      }
    }

    // Build system context
    Object.assign(context, { system: templateService.buildSystemContext() })

    // Render template with variables
    finalSubject = templateService.renderTemplate(template.subject, context)
    finalBody = templateService.renderTemplate(template.body, context)

    // Track template usage
    await templateService.trackEmailTemplateUsage(templateId)
  }

  if (!to || !finalSubject || !finalBody) {
    throw new ValidationError('To, subject, and body are required')
  }

  // Generate threadId if not provided
  const messageThreadId = threadId || crypto.randomBytes(16).toString('hex')

  if (!req.user?.organizationId) {
    throw new ValidationError('Organization ID is required')
  }

  // Use the email service with userId for config lookup
  const result = await sendEmailService({
    to,
    subject: finalSubject,
    html: finalBody,
    leadId,
    trackOpens: true,
    trackClicks: true,
    userId: req.user?.userId,
    organizationId,
  })

  if (!result.success) {
    throw new ValidationError(result.error || 'Failed to send email')
  }

  // Fetch the created message to return full details
  const message = await prisma.message.findUnique({
    where: { id: result.messageId }
  })

  res.status(201).json({
    success: true,
    data: {
      message,
      threadId: messageThreadId,
    }
  })
}

// Send SMS
export const sendSMS = async (req: Request, res: Response) => {
  const { to, body, leadId, templateId, templateVariables, threadId } = req.body
  const organizationId = req.user!.organizationId

  let finalBody = body

  // If templateId is provided, render the template
  if (templateId) {
    const template = await prisma.sMSTemplate.findFirst({
      where: { id: templateId, organizationId }
    })

    if (!template) {
      throw new NotFoundError('SMS template not found')
    }

    if (!template.isActive) {
      throw new ValidationError('SMS template is not active')
    }

    // Build context for template rendering
    const context: Record<string, unknown> = {
      lead: {},
      user: {},
      system: {},
      custom: templateVariables || {}
    }

    // If leadId provided, fetch lead data
    if (leadId) {
      const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId } })
      if (lead) {
        const {firstName, lastName} = { firstName: lead.firstName, lastName: lead.lastName }
        context.lead = {
          id: lead.id,
          name: `${lead.firstName} ${lead.lastName}`.trim(),
          firstName,
          lastName,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          position: lead.position,
          status: lead.status,
          score: lead.score,
          value: lead.value,
          source: lead.source
        }
      }
    }

    // Build system context
    Object.assign(context, { system: templateService.buildSystemContext() })

    // Render template with variables
    finalBody = templateService.renderTemplate(template.body, context)

    // Track template usage
    await templateService.trackSMSTemplateUsage(templateId)
  }

  if (!to || !finalBody) {
    throw new ValidationError('To and body are required')
  }

  // SMS character limit
  if (finalBody.length > 1600) {
    throw new ValidationError('SMS body should not exceed 1600 characters')
  }

  // Generate threadId if not provided
  const messageThreadId = threadId || crypto.randomBytes(16).toString('hex')

  // Use the SMS service with userId for config lookup
  const result = await sendSMSService({
    to,
    message: finalBody,
    leadId,
    userId: req.user?.userId,
    organizationId,
  })

  if (!result.success) {
    throw new ValidationError(result.error || 'Failed to send SMS')
  }

  // Fetch the created message to return full details
  const message = await prisma.message.findUnique({
    where: { id: result.messageId }
  })

  res.status(201).json({
    success: true,
    data: {
      message,
      threadId: messageThreadId,
    }
  })
}

// Make call
export const makeCall = async (req: Request, res: Response) => {
  const { to, leadId } = req.body
  const organizationId = req.user!.organizationId

  if (!to) {
    throw new ValidationError('Phone number is required')
  }

  // Persist call record to DB
  const message = await prisma.message.create({
    data: {
      type: 'CALL',
      direction: 'OUTBOUND',
      body: 'Outbound call initiated',
      fromAddress: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
      toAddress: to,
      status: 'PENDING',
      leadId: leadId || null,
      organizationId,
      metadata: {
        initiatedAt: new Date().toISOString(),
      },
    },
  })

  res.status(201).json({
    success: true,
    data: {
      message,
      note: 'Call initiated (mock mode - integrate Twilio Voice for production)',
    }
  })
}

// Mark message as read
export const markAsRead = async (req: Request, res: Response) => {
  const { id } = req.params
  const organizationId = req.user!.organizationId

  const message = await prisma.message.findFirst({
    where: { id, organizationId },
  })

  if (!message) {
    throw new NotFoundError('Message not found')
  }

  const updatedMessage = await prisma.message.update({
    where: { id },
    data: {
      readAt: new Date(),
    },
  })

  res.json({
    success: true,
    data: { message: updatedMessage }
  })
}

// Mark message as unread
export const markAsUnread = async (req: Request, res: Response) => {
  const { id } = req.params
  const organizationId = req.user!.organizationId

  const message = await prisma.message.findFirst({
    where: { id, organizationId },
  })

  if (!message) {
    throw new NotFoundError('Message not found')
  }

  const updatedMessage = await prisma.message.update({
    where: { id },
    data: {
      readAt: null,
    },
  })

  res.json({
    success: true,
    data: { message: updatedMessage }
  })
}

// Delete message
export const deleteMessage = async (req: Request, res: Response) => {
  const { id } = req.params
  const organizationId = req.user!.organizationId

  const message = await prisma.message.findFirst({
    where: { id, organizationId },
  })

  if (!message) {
    throw new NotFoundError('Message not found')
  }

  await prisma.message.delete({
    where: { id },
  })

  res.json({
    success: true,
    message: 'Message deleted successfully'
  })
}

// Get message statistics
export const getMessageStats = async (req: Request, res: Response) => {
  const { leadId, type } = req.query
  const organizationId = req.user!.organizationId

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { organizationId }
  
  if (leadId) {
    where.leadId = leadId as string
  }
  
  if (type) {
    where.type = type as string
  }

  const [total, sent, delivered, failed, opened] = await Promise.all([
    prisma.message.count({ where }),
    prisma.message.count({ where: { ...where, status: 'SENT' } }),
    prisma.message.count({ where: { ...where, status: 'DELIVERED' } }),
    prisma.message.count({ where: { ...where, status: 'FAILED' } }),
    prisma.message.count({ where: { ...where, status: 'OPENED' } }),
  ])

  const byType = await prisma.message.groupBy({
    by: ['type'],
    where: leadId ? { leadId: leadId as string, organizationId } : { organizationId }, // Don't filter byType grouping by type param
    _count: {
      _all: true,
    },
  })

  res.json({
    success: true,
    data: {
      total,
      sent,
      delivered,
      failed,
      opened,
      byType: byType.map((item) => ({
        type: item.type,
        count: item._count._all,
      })),
    }
  })
}

// Get messages in a thread
export const getThreadMessages = async (req: Request, res: Response) => {
  const { threadId } = req.params
  const organizationId = req.user!.organizationId

  const messages = await prisma.message.findMany({
    where: { 
      organizationId,
      metadata: {
        path: ['threadId'],
        equals: threadId
      }
    },
    orderBy: { createdAt: 'asc' },
  })

  if (messages.length === 0) {
    throw new NotFoundError('Thread not found')
  }

  res.json({
    success: true,
    data: {
      threadId,
      messageCount: messages.length,
      messages,
    }
  })
}

// Reply to a message (creates message in same thread)
export const replyToMessage = async (req: Request, res: Response) => {
  const { id } = req.params
  const { body } = req.body

  const originalMessage = await prisma.message.findFirst({
    where: { id, organizationId: req.user!.organizationId },
  })

  if (!originalMessage) {
    throw new NotFoundError('Original message not found')
  }

  // Extract threadId from metadata
  const metadata = originalMessage.metadata as Record<string, unknown> || {}
  const threadId = (metadata.threadId as string) || crypto.randomBytes(16).toString('hex')

  if (!req.user?.organizationId) {
    throw new ValidationError('Organization ID is required')
  }

  // Determine reply type and address based on original message
  const isEmail = originalMessage.type === 'EMAIL'
  
  if (isEmail) {
    const result = await sendEmailService({
      to: originalMessage.fromAddress,
      subject: `Re: ${originalMessage.subject || '(no subject)'}`,
      html: body,
      leadId: originalMessage.leadId || undefined,
      trackOpens: true,
      trackClicks: true,
      organizationId: req.user.organizationId,
    })

    if (!result.success) {
      throw new ValidationError(result.error || 'Failed to send reply')
    }

    res.status(201).json({
      success: true,
      messageId: result.messageId,
      threadId,
      message: 'Reply sent successfully',
    })
  } else {
    if (!req.user?.organizationId) {
      throw new ValidationError('Organization ID is required')
    }

    const result = await sendSMSService({
      to: originalMessage.fromAddress,
      message: body,
      leadId: originalMessage.leadId || undefined,
      organizationId: req.user.organizationId,
    })

    if (!result.success) {
      throw new ValidationError(result.error || 'Failed to send reply')
    }

    res.status(201).json({
      success: true,
      messageId: result.messageId,
      threadId,
      message: 'Reply sent successfully',
    })
  }
}

// Mark multiple messages as read
export const markMessagesAsRead = async (req: Request, res: Response) => {
  console.log('📥 Mark as read request body:', JSON.stringify(req.body))
  const { messageIds } = req.body
  console.log('📥 Extracted messageIds:', messageIds)

  const organizationId = req.user!.organizationId

  await prisma.message.updateMany({
    where: {
      id: {
        in: messageIds
      },
      organizationId,
    },
    data: {
      readAt: new Date(),
    },
  })

  res.json({
    success: true,
    message: `${messageIds.length} message(s) marked as read`,
  })
}

// Mark multiple messages as unread
export const markMessagesAsUnread = async (req: Request, res: Response) => {
  const { messageIds } = req.body
  const organizationId = req.user!.organizationId

  await prisma.message.updateMany({
    where: {
      id: {
        in: messageIds
      },
      organizationId,
    },
    data: {
      readAt: null,
    },
  })

  res.json({
    success: true,
    message: `${messageIds.length} message(s) marked as unread`,
  })
}

// Mark all messages as read
export const markAllAsRead = async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const organizationId = req.user!.organizationId

  const result = await prisma.message.updateMany({
    where: {
      readAt: null,
      direction: 'INBOUND',
      organizationId,
      lead: {
        assignedToId: userId,
      },
    },
    data: {
      readAt: new Date(),
    },
  })

  res.json({
    success: true,
    message: `${result.count} message(s) marked as read`,
    count: result.count,
  })
}

// Star/unstar a message
export const starMessage = async (req: Request, res: Response) => {
  const { id } = req.params
  const { starred } = req.body
  const organizationId = req.user!.organizationId

  const message = await prisma.message.findFirst({
    where: { id, organizationId },
  })

  if (!message) {
    return res.status(404).json({ success: false, message: 'Message not found' })
  }

  await prisma.message.update({
    where: { id },
    data: { starred: starred ?? !message.starred },
  })

  res.json({ success: true, message: `Message ${starred ? 'starred' : 'unstarred'}` })
}

// Archive/unarchive a message
export const archiveMessage = async (req: Request, res: Response) => {
  const { id } = req.params
  const { archived } = req.body
  const organizationId = req.user!.organizationId

  const message = await prisma.message.findFirst({
    where: { id, organizationId },
  })

  if (!message) {
    return res.status(404).json({ success: false, message: 'Message not found' })
  }

  await prisma.message.update({
    where: { id },
    data: { archived: archived ?? !message.archived },
  })

  res.json({ success: true, message: `Message ${archived ? 'archived' : 'unarchived'}` })
}

// Snooze/unsnooze a message
export const snoozeMessage = async (req: Request, res: Response) => {
  const { id } = req.params
  const { snoozedUntil } = req.body
  const organizationId = req.user!.organizationId

  const message = await prisma.message.findFirst({
    where: { id, organizationId },
  })

  if (!message) {
    return res.status(404).json({ success: false, message: 'Message not found' })
  }

  await prisma.message.update({
    where: { id },
    data: { snoozedUntil: snoozedUntil ? new Date(snoozedUntil) : null },
  })

  res.json({ success: true, message: snoozedUntil ? 'Message snoozed' : 'Message unsnoozed' })
}
