import { Request, Response } from 'express'
import { prisma } from '../config/database'
import { NotFoundError, ValidationError } from '../middleware/errorHandler'
import { sendEmail as sendEmailService } from '../services/email.service'
import { sendSMS as sendSMSService } from '../services/sms.service'
import { templateService } from '../services/template.service'
import crypto from 'crypto'

type MessageType = 'EMAIL' | 'SMS' | 'CALL' | 'SOCIAL' | 'NEWSLETTER'
type MessageDirection = 'INBOUND' | 'OUTBOUND'
type MessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'OPENED' | 'CLICKED'

// Get all messages (inbox)
export const getMessages = async (req: Request, res: Response) => {
  const { type, direction, status, leadId, search, page = 1, limit = 50 } = req.query

  const where: Record<string, unknown> = {}

  if (type) {
    where.type = type as MessageType
  }

  if (direction) {
    where.direction = direction as MessageDirection
  }

  if (status) {
    where.status = status as MessageStatus
  }

  if (leadId) {
    where.leadId = leadId as string
  }

  if (search) {
    const searchTerm = search as string
    where.OR = [
      { subject: { contains: searchTerm, mode: ('insensitive' as const) } },
      { body: { contains: searchTerm, mode: ('insensitive' as const) } },
      { fromAddress: { contains: searchTerm, mode: ('insensitive' as const) } },
      { toAddress: { contains: searchTerm, mode: ('insensitive' as const) } },
    ]
  }

  const pageNum = Number(page)
  const limitNum = Number(limit)
  const skip = (pageNum - 1) * limitNum

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.message.count({ where }),
  ])

  res.json({
    success: true,
    data: {
      messages,
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

  const message = await prisma.message.findUnique({
    where: { id },
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

  let finalSubject = subject
  let finalBody = body

  // If templateId is provided, render the template
  if (templateId) {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: templateId }
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
      const lead = await prisma.lead.findUnique({ where: { id: leadId } })
      if (lead) {
        const {firstName, lastName} = templateService.parseFullName(lead.name)
        context.lead = {
          id: lead.id,
          name: lead.name,
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

  // Use the email service
  const result = await sendEmailService({
    to,
    subject: finalSubject,
    html: finalBody,
    leadId,
    trackOpens: true,
    trackClicks: true,
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

  let finalBody = body

  // If templateId is provided, render the template
  if (templateId) {
    const template = await prisma.sMSTemplate.findUnique({
      where: { id: templateId }
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
      const lead = await prisma.lead.findUnique({ where: { id: leadId } })
      if (lead) {
        const {firstName, lastName} = templateService.parseFullName(lead.name)
        context.lead = {
          id: lead.id,
          name: lead.name,
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

  // Use the SMS service
  const result = await sendSMSService({
    to,
    message: finalBody,
    leadId,
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

  if (!to) {
    throw new ValidationError('Phone number is required')
  }

  // Create placeholder message
  // TODO: Implement Twilio voice call integration
  const message = {
    type: 'CALL',
    direction: 'OUTBOUND',
    body: 'Outbound call initiated',
    fromAddress: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
    toAddress: to,
    status: 'PENDING',
    leadId: leadId || null,
    metadata: {
      initiatedAt: new Date().toISOString(),
    },
  }

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

  const message = await prisma.message.findUnique({
    where: { id },
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

// Delete message
export const deleteMessage = async (req: Request, res: Response) => {
  const { id } = req.params

  const message = await prisma.message.findUnique({
    where: { id },
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
  const { leadId } = req.query

  const where = leadId ? { leadId: leadId as string } : {}

  const [total, sent, delivered, failed, opened] = await Promise.all([
    prisma.message.count({ where }),
    prisma.message.count({ where: { ...where, status: 'SENT' } }),
    prisma.message.count({ where: { ...where, status: 'DELIVERED' } }),
    prisma.message.count({ where: { ...where, status: 'FAILED' } }),
    prisma.message.count({ where: { ...where, status: 'OPENED' } }),
  ])

  const byType = await prisma.message.groupBy({
    by: ['type'],
    where,
    _count: true,
  })

  res.json({
    success: true,
    data: {
      total,
      sent,
      delivered,
      failed,
      opened,
      byType: byType.map((item: { type: string; _count: number }) => ({
        type: item.type,
        count: item._count,
      })),
    }
  })
}

// Get messages in a thread
export const getThreadMessages = async (req: Request, res: Response) => {
  const { threadId } = req.params

  const messages = await prisma.message.findMany({
    where: { 
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

  const originalMessage = await prisma.message.findUnique({
    where: { id },
  })

  if (!originalMessage) {
    throw new NotFoundError('Original message not found')
  }

  // Extract threadId from metadata
  const metadata = originalMessage.metadata as Record<string, unknown> || {}
  const threadId = (metadata.threadId as string) || crypto.randomBytes(16).toString('hex')

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
    const result = await sendSMSService({
      to: originalMessage.fromAddress,
      message: body,
      leadId: originalMessage.leadId || undefined,
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
  const { messageIds } = req.body

  await prisma.message.updateMany({
    where: {
      id: {
        in: messageIds
      }
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
