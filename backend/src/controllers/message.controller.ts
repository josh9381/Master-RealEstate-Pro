import { Request, Response } from 'express'
import { prisma } from '../config/database'
import { NotFoundError, ValidationError } from '../middleware/errorHandler'
import { sendEmail as sendEmailService } from '../services/email.service'
import { sendSMS as sendSMSService } from '../services/sms.service'

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
    where.OR = [
      { subject: { contains: search as string, mode: 'insensitive' } },
      { body: { contains: search as string, mode: 'insensitive' } },
      { fromAddress: { contains: search as string, mode: 'insensitive' } },
      { toAddress: { contains: search as string, mode: 'insensitive' } },
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
    messages,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
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

  res.json(message)
}

// Send email
export const sendEmail = async (req: Request, res: Response) => {
  const { to, subject, body, leadId } = req.body

  if (!to || !subject || !body) {
    throw new ValidationError('To, subject, and body are required')
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(to)) {
    throw new ValidationError('Invalid email address')
  }

  // Use the email service
  const result = await sendEmailService({
    to,
    subject,
    html: body,
    leadId,
    trackOpens: true,
    trackClicks: true,
  })

  if (!result.success) {
    throw new ValidationError(result.error || 'Failed to send email')
  }

  res.status(201).json({
    success: true,
    messageId: result.messageId,
    message: 'Email sent successfully',
  })
}

// Send SMS
export const sendSMS = async (req: Request, res: Response) => {
  const { to, body, leadId } = req.body

  if (!to || !body) {
    throw new ValidationError('To and body are required')
  }

  // Phone number validation (basic)
  const phoneRegex = /^\+?[1-9]\d{1,14}$/
  if (!phoneRegex.test(to.replace(/[\s-()]/g, ''))) {
    throw new ValidationError('Invalid phone number format')
  }

  // SMS character limit
  if (body.length > 1600) {
    throw new ValidationError('SMS body should not exceed 1600 characters')
  }

  // Use the SMS service
  const result = await sendSMSService({
    to,
    message: body,
    leadId,
  })

  if (!result.success) {
    throw new ValidationError(result.error || 'Failed to send SMS')
  }

  res.status(201).json({
    success: true,
    messageId: result.messageId,
    message: 'SMS sent successfully',
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
    message,
    note: 'Call initiated (mock mode - integrate Twilio Voice for production)',
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

  res.json(updatedMessage)
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

  res.json({ message: 'Message deleted successfully' })
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
    total,
    sent,
    delivered,
    failed,
    opened,
    byType: byType.map((item: { type: string; _count: number }) => ({
      type: item.type,
      count: item._count,
    })),
  })
}
