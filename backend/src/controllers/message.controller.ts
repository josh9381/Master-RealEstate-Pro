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

// Get all messages (inbox) - grouped by contact with per-channel threads
export const getMessages = async (req: Request, res: Response) => {
  const { type, direction, status, leadId, search, page = 1, limit = 50, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc', folder, starred, snoozed } = req.query

  // Build where clause with role-based filtering
  const roleFilter = getRoleFilterFromRequest(req)
  const additionalWhere: Record<string, any> = {}

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

  // Date range filtering (#24)
  if (startDate || endDate) {
    additionalWhere.createdAt = {}
    if (startDate) additionalWhere.createdAt.gte = new Date(startDate as string)
    if (endDate) additionalWhere.createdAt.lte = new Date(endDate as string)
  }

  const where = getMessagesFilter(roleFilter, additionalWhere)

  // Folder-based filtering: archived/trash show only those messages
  if (folder === 'archived') {
    where.archived = true
    where.trashedAt = null
  } else if (folder === 'trash') {
    where.trashedAt = { not: null }
  } else {
    // Default inbox: exclude archived and trashed messages (#28/#29)
    if (!where.archived) {
      where.archived = { not: true }
    }
    where.trashedAt = null
  }

  // M7: Starred / Snoozed filtering
  if (starred === 'true') {
    where.starred = true
  }
  if (snoozed === 'true') {
    where.snoozedUntil = { gt: new Date() }
  }

  const pageNum = Number(page)
  const limitNum = Number(limit)
  const skip = (pageNum - 1) * limitNum

  // Cap the max fetch to prevent memory spikes on large inboxes
  // Use a reasonable upper bound; contact grouping requires fetching more than limitNum
  const maxFetch = Math.min(Math.max(limitNum * 20, 500), 5000)

  const validSortFields = ['createdAt', 'sentAt', 'readAt']
  const orderField = validSortFields.includes(sortBy as string) ? (sortBy as string) : 'createdAt'
  const orderDirection = sortOrder === 'asc' ? ('asc' as const) : ('desc' as const)

  const messages = await prisma.message.findMany({
    where,
    orderBy: { [orderField]: orderDirection },
    take: maxFetch,
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
    const digits = phone.replace(/\D/g, '')
    if (digits.length === 11 && digits.startsWith('1')) {
      return digits.substring(1)
    }
    if (digits.length === 10) {
      return digits
    }
    return digits
  }

  // Group messages by contact, then by channel within each contact
  const contactMap = new Map<string, any>()

  messages.forEach((message) => {
    let contactKey: string
    let contactIdentifier: string

    if (message.leadId) {
      contactKey = message.leadId
      contactIdentifier = message.direction === 'INBOUND' ? message.fromAddress : message.toAddress
    } else if (message.type === 'SMS' || message.type === 'CALL') {
      const rawContact = message.direction === 'INBOUND' ? message.fromAddress : message.toAddress
      contactIdentifier = rawContact
      contactKey = `phone:${normalizePhone(rawContact)}`
    } else if (message.type === 'EMAIL') {
      contactIdentifier = message.direction === 'INBOUND' ? message.fromAddress : message.toAddress
      contactKey = `email:${contactIdentifier.toLowerCase()}`
    } else {
      contactKey = message.threadId || message.fromAddress
      contactIdentifier = message.direction === 'INBOUND' ? message.fromAddress : message.toAddress
    }

    if (!contactMap.has(contactKey)) {
      const contactName = message.lead
        ? `${message.lead.firstName || ''} ${message.lead.lastName || ''}`.trim() || contactIdentifier
        : contactIdentifier

      contactMap.set(contactKey, {
        id: contactKey,
        name: contactName,
        lead: message.lead,
        leadId: message.leadId,
        lastMessageAt: message.createdAt,
        totalUnread: 0,
        channels: [],
        lastMessage: (message.body || '').substring(0, 100),
        lastChannel: message.type.toLowerCase(),
        threads: {},
      })
    }

    const contact = contactMap.get(contactKey)
    const channelType = message.type.toLowerCase()

    // Initialize channel thread if needed
    if (!contact.threads[channelType]) {
      contact.threads[channelType] = {
        unread: 0,
        lastMessage: '',
        lastMessageAt: message.createdAt,
        messages: [],
      }
      contact.channels.push(channelType)
    }

    const channelThread = contact.threads[channelType]
    const metadata = message.metadata as Record<string, unknown> | null
    const msgData = {
      id: message.id,
      type: channelType,
      direction: message.direction,
      from: message.fromAddress,
      to: message.toAddress,
      contact: contact.name,
      subject: message.subject,
      body: message.body,
      timestamp: message.createdAt,
      date: message.createdAt,
      unread: !message.readAt && message.direction === 'INBOUND',
      starred: !!message.starred,
      hasAttachment: !!(metadata && Array.isArray((metadata as Record<string, unknown>).attachments) && ((metadata as Record<string, unknown>).attachments as unknown[]).length > 0),
      status: message.status.toLowerCase(),
      emailOpened: message.status === 'OPENED' || message.status === 'CLICKED',
      emailClicked: message.status === 'CLICKED',
      readAt: message.readAt,
      archived: !!message.archived,
      trashed: !!message.trashedAt,
      snoozedUntil: message.snoozedUntil ? message.snoozedUntil.toISOString() : null,
    }

    channelThread.messages.push(msgData)

    // Update channel thread's last message
    if (new Date(message.createdAt) > new Date(channelThread.lastMessageAt)) {
      channelThread.lastMessageAt = message.createdAt
      channelThread.lastMessage = (message.body || '').substring(0, 100)
    }

    // Update contact-level last message
    if (new Date(message.createdAt) > new Date(contact.lastMessageAt)) {
      contact.lastMessageAt = message.createdAt
      contact.lastMessage = (message.body || '').substring(0, 100)
      contact.lastChannel = channelType
    }
  })

  // Finalize contacts: sort messages, calculate unreads
  const contacts = Array.from(contactMap.values()).map(contact => {
    let totalUnread = 0
    for (const channel of Object.keys(contact.threads)) {
      const thread = contact.threads[channel]
      thread.messages.sort((a: { timestamp: string }, b: { timestamp: string }) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
      thread.unread = thread.messages.filter((m: { unread?: boolean }) => m.unread).length
      totalUnread += thread.unread
    }
    contact.totalUnread = totalUnread
    contact.channels.sort()
    return contact
  }).sort((a, b) =>
    new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  )

  // Apply pagination
  const paginatedContacts = contacts.slice(skip, skip + limitNum)
  const total = contacts.length

  res.json({
    success: true,
    data: {
      contacts: paginatedContacts,
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
  const { to, subject, body, leadId, templateId, templateVariables, threadId, cc, bcc, attachments } = req.body
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
        const firstName = lead.firstName || ''
        const lastName = lead.lastName || ''
        context.lead = {
          id: lead.id,
          name: `${firstName} ${lastName}`.trim() || 'Unknown',
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
    cc: cc || undefined,
    bcc: bcc || undefined,
    trackOpens: true,
    trackClicks: true,
    userId: req.user?.userId,
    organizationId,
    ...(attachments && attachments.length > 0 ? { attachments } : {}),
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
        const firstName = lead.firstName || ''
        const lastName = lead.lastName || ''
        context.lead = {
          id: lead.id,
          name: `${firstName} ${lastName}`.trim() || 'Unknown',
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

  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER
  if (!twilioPhoneNumber) {
    throw new ValidationError('Twilio phone number is not configured. Please set TWILIO_PHONE_NUMBER in environment variables.')
  }

  // Persist call record to DB
  const message = await prisma.message.create({
    data: {
      type: 'CALL',
      direction: 'OUTBOUND',
      body: 'Outbound call initiated',
      fromAddress: twilioPhoneNumber,
      toAddress: to,
      status: 'PENDING',
      leadId: leadId || null,
      organizationId,
      metadata: {
        initiatedAt: new Date().toISOString(),
        mockMode: !process.env.TWILIO_ACCOUNT_SID,
      },
    },
  })

  res.status(201).json({
    success: true,
    data: {
      message,
      note: process.env.TWILIO_ACCOUNT_SID ? undefined : 'Call initiated (mock mode - integrate Twilio Voice for production)',
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

  // Soft delete - mark as trashed instead of permanent delete (#31)
  await prisma.message.update({
    where: { id },
    data: { trashedAt: new Date() },
  })

  res.json({
    success: true,
    message: 'Message moved to trash'
  })
}

// Get message statistics
export const getMessageStats = async (req: Request, res: Response) => {
  const { leadId, type } = req.query
  const organizationId = req.user!.organizationId

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = { organizationId }
  
  if (leadId) {
    where.leadId = leadId as string
  }
  
  if (type) {
    where.type = type as string
  }

  const [statusCounts, byType] = await Promise.all([
    prisma.message.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    }),
    prisma.message.groupBy({
      by: ['type'],
      where: leadId ? { leadId: leadId as string, organizationId } : { organizationId },
      _count: { _all: true },
    }),
  ])

  const countByStatus = (status: string) =>
    statusCounts.find(s => s.status === status)?._count._all || 0

  res.json({
    success: true,
    data: {
      total: statusCounts.reduce((sum, s) => sum + s._count._all, 0),
      sent: countByStatus('SENT'),
      delivered: countByStatus('DELIVERED'),
      failed: countByStatus('FAILED'),
      opened: countByStatus('OPENED'),
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

  // Thread IDs in getMessages are derived from leadId, contact address, or metadata.threadId.
  // We query all three sources to find matching messages.
  const messages = await prisma.message.findMany({
    where: { 
      organizationId,
      OR: [
        { metadata: { path: ['threadId'], equals: threadId } },
        { leadId: threadId },
        { threadId: threadId },
      ]
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
  // Reply should go to the other party: if inbound, reply to sender; if outbound, reply to recipient
  const replyTo = originalMessage.direction === 'INBOUND' ? originalMessage.fromAddress : originalMessage.toAddress
  
  if (isEmail) {
    const result = await sendEmailService({
      to: replyTo,
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

    // Clean phone formatting before sending SMS reply
    const cleanedPhone = replyTo ? replyTo.replace(/[\s\-()]/g, '') : replyTo
    const result = await sendSMSService({
      to: cleanedPhone,
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
    throw new NotFoundError('Message not found')
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
    throw new NotFoundError('Message not found')
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
    throw new NotFoundError('Message not found')
  }

  await prisma.message.update({
    where: { id },
    data: { snoozedUntil: snoozedUntil ? new Date(snoozedUntil) : null },
  })

  res.json({ success: true, message: snoozedUntil ? 'Message snoozed' : 'Message unsnoozed' })
}

// Batch star/unstar messages (#39)
export const batchStarMessages = async (req: Request, res: Response) => {
  const { messageIds, starred } = req.body
  const organizationId = req.user!.organizationId

  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    throw new ValidationError('messageIds array is required')
  }
  if (messageIds.length > 500) {
    throw new ValidationError('Maximum 500 messages per batch operation')
  }

  await prisma.message.updateMany({
    where: { id: { in: messageIds }, organizationId },
    data: { starred: !!starred },
  })

  res.json({ success: true, message: `${messageIds.length} message(s) ${starred ? 'starred' : 'unstarred'}` })
}

// Batch archive/unarchive messages (#39)
export const batchArchiveMessages = async (req: Request, res: Response) => {
  const { messageIds, archived } = req.body
  const organizationId = req.user!.organizationId

  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    throw new ValidationError('messageIds array is required')
  }
  if (messageIds.length > 500) {
    throw new ValidationError('Maximum 500 messages per batch operation')
  }

  await prisma.message.updateMany({
    where: { id: { in: messageIds }, organizationId },
    data: { archived: !!archived },
  })

  res.json({ success: true, message: `${messageIds.length} message(s) ${archived ? 'archived' : 'unarchived'}` })
}

// Batch delete messages (#39)
export const batchDeleteMessages = async (req: Request, res: Response) => {
  const { messageIds } = req.body
  const organizationId = req.user!.organizationId

  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    throw new ValidationError('messageIds array is required')
  }
  if (messageIds.length > 500) {
    throw new ValidationError('Maximum 500 messages per batch operation')
  }

  await prisma.message.updateMany({
    where: { id: { in: messageIds }, organizationId },
    data: { trashedAt: new Date() },
  })

  res.json({ success: true, message: `${messageIds.length} message(s) moved to trash` })
}
