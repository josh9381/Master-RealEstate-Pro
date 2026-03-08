import { Request, Response } from 'express'
import { prisma } from '../config/database'
import { UnauthorizedError } from '../middleware/errorHandler'
import { z } from 'zod'

// Zod schemas
const recurrenceFields = {
  isRecurring: z.boolean().optional().default(false),
  recurrencePattern: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']).optional(),
  recurrenceInterval: z.number().int().min(1).optional(),
  recurrenceEndDate: z.string().datetime().optional(),
  recurrenceCount: z.number().int().min(1).optional(),
}

const createReminderSchema = z.object({
  leadId: z.string(),
  title: z.string().min(1).max(200),
  note: z.string().max(1000).optional(),
  dueAt: z.string().datetime(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  channelInApp: z.boolean().optional().default(true),
  channelEmail: z.boolean().optional().default(false),
  channelSms: z.boolean().optional().default(false),
  channelPush: z.boolean().optional().default(false),
  ...recurrenceFields,
})

const updateReminderSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  note: z.string().max(1000).optional(),
  dueAt: z.string().datetime().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  channelInApp: z.boolean().optional(),
  channelEmail: z.boolean().optional(),
  channelSms: z.boolean().optional(),
  channelPush: z.boolean().optional(),
  ...recurrenceFields,
})

/**
 * Get all reminders for the current user (optionally filtered by leadId)
 * GET /api/reminders?leadId=xxx&status=PENDING
 */
export async function getReminders(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Authentication required')

  const { leadId, status, page = 1, limit = 50 } = req.query
  const skip = (Number(page) - 1) * Number(limit)

  const where: Record<string, unknown> = {
    userId: req.user.userId,
    organizationId: req.user.organizationId,
  }

  if (leadId) where.leadId = String(leadId)
  if (status) where.status = String(status)

  const [reminders, total] = await Promise.all([
    prisma.followUpReminder.findMany({
      where,
      include: {
        lead: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
      },
      orderBy: { dueAt: 'asc' },
      skip,
      take: Number(limit),
    }),
    prisma.followUpReminder.count({ where }),
  ])

  // Also get counts by status
  const [pendingCount, overdueCount] = await Promise.all([
    prisma.followUpReminder.count({
      where: { userId: req.user.userId, organizationId: req.user.organizationId, status: 'PENDING' },
    }),
    prisma.followUpReminder.count({
      where: {
        userId: req.user.userId,
        organizationId: req.user.organizationId,
        status: 'PENDING',
        dueAt: { lt: new Date() },
      },
    }),
  ])

  res.status(200).json({
    success: true,
    data: {
      reminders,
      stats: { total, pending: pendingCount, overdue: overdueCount },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    },
  })
}

/**
 * Get a single reminder
 * GET /api/reminders/:id
 */
export async function getReminder(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Authentication required')

  const reminder = await prisma.followUpReminder.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.userId,
      organizationId: req.user.organizationId,
    },
    include: {
      lead: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true },
      },
    },
  })

  if (!reminder) {
    res.status(404).json({ success: false, error: 'Reminder not found' })
    return
  }

  res.status(200).json({ success: true, data: { reminder } })
}

/**
 * Create a follow-up reminder
 * POST /api/reminders
 */
export async function createReminder(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Authentication required')

  const parsed = createReminderSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten() })
    return
  }

  const { leadId, title, note, dueAt, priority, channelInApp, channelEmail, channelSms, channelPush,
    isRecurring, recurrencePattern, recurrenceInterval, recurrenceEndDate, recurrenceCount } = parsed.data

  // Verify lead belongs to user's org
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: req.user.organizationId },
    select: { id: true },
  })

  if (!lead) {
    res.status(404).json({ success: false, error: 'Lead not found' })
    return
  }

  const reminder = await prisma.followUpReminder.create({
    data: {
      leadId,
      userId: req.user.userId,
      organizationId: req.user.organizationId,
      title,
      note,
      dueAt: new Date(dueAt),
      priority,
      channelInApp,
      channelEmail,
      channelSms,
      channelPush,
      isRecurring: isRecurring || false,
      recurrencePattern: isRecurring ? recurrencePattern : undefined,
      recurrenceInterval: isRecurring && recurrencePattern === 'CUSTOM' ? recurrenceInterval : undefined,
      recurrenceEndDate: isRecurring && recurrenceEndDate ? new Date(recurrenceEndDate) : undefined,
      recurrenceCount: isRecurring ? recurrenceCount : undefined,
      occurrenceNumber: 0,
    },
    include: {
      lead: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      },
    },
  })

  res.status(201).json({ success: true, data: { reminder } })
}

/**
 * Update a reminder
 * PATCH /api/reminders/:id
 */
export async function updateReminder(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Authentication required')

  const parsed = updateReminderSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten() })
    return
  }

  const data: Record<string, unknown> = { ...parsed.data }
  if (data.dueAt) data.dueAt = new Date(data.dueAt as string)

  const existing = await prisma.followUpReminder.findFirst({
    where: { id: req.params.id, userId: req.user.userId, organizationId: req.user.organizationId },
  })

  if (!existing) {
    res.status(404).json({ success: false, error: 'Reminder not found' })
    return
  }

  const reminder = await prisma.followUpReminder.update({
    where: { id: req.params.id },
    data,
    include: {
      lead: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      },
    },
  })

  res.status(200).json({ success: true, data: { reminder } })
}

/**
 * Complete a reminder (mark as acted upon)
 * PATCH /api/reminders/:id/complete
 */
export async function completeReminder(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Authentication required')

  const existing = await prisma.followUpReminder.findFirst({
    where: { id: req.params.id, userId: req.user.userId, organizationId: req.user.organizationId },
  })

  if (!existing) {
    res.status(404).json({ success: false, error: 'Reminder not found' })
    return
  }

  const reminder = await prisma.followUpReminder.update({
    where: { id: req.params.id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
    include: {
      lead: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  })

  res.status(200).json({ success: true, data: { reminder } })
}

/**
 * Snooze a reminder to a later time
 * PATCH /api/reminders/:id/snooze
 */
export async function snoozeReminder(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Authentication required')

  const { snoozedUntil } = req.body
  if (!snoozedUntil) {
    res.status(400).json({ success: false, error: 'snoozedUntil is required' })
    return
  }

  const existing = await prisma.followUpReminder.findFirst({
    where: { id: req.params.id, userId: req.user.userId, organizationId: req.user.organizationId },
  })

  if (!existing) {
    res.status(404).json({ success: false, error: 'Reminder not found' })
    return
  }

  const reminder = await prisma.followUpReminder.update({
    where: { id: req.params.id },
    data: {
      status: 'SNOOZED',
      snoozedUntil: new Date(snoozedUntil),
      dueAt: new Date(snoozedUntil), // Update dueAt to the snooze time so cron picks it up again
    },
    include: {
      lead: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  })

  res.status(200).json({ success: true, data: { reminder } })
}

/**
 * Cancel a reminder
 * DELETE /api/reminders/:id
 */
export async function deleteReminder(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Authentication required')

  const existing = await prisma.followUpReminder.findFirst({
    where: { id: req.params.id, userId: req.user.userId, organizationId: req.user.organizationId },
  })

  if (!existing) {
    res.status(404).json({ success: false, error: 'Reminder not found' })
    return
  }

  await prisma.followUpReminder.delete({ where: { id: req.params.id } })

  res.status(200).json({ success: true })
}

/**
 * Get upcoming reminders for dashboard/bell — due in next 24h + overdue
 * GET /api/reminders/upcoming
 */
export async function getUpcomingReminders(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError('Authentication required')

  const now = new Date()
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const reminders = await prisma.followUpReminder.findMany({
    where: {
      userId: req.user.userId,
      organizationId: req.user.organizationId,
      status: { in: ['PENDING', 'FIRED', 'SNOOZED'] },
      dueAt: { lte: next24h },
    },
    include: {
      lead: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      },
    },
    orderBy: { dueAt: 'asc' },
    take: 20,
  })

  const overdue = reminders.filter(r => r.dueAt <= now).length

  res.status(200).json({
    success: true,
    data: { reminders, overdue, total: reminders.length },
  })
}
