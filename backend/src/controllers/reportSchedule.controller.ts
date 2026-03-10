import { getErrorMessage } from '../utils/errors'
import { logger } from '../lib/logger'
import { Request, Response } from 'express'
import { prisma } from '../config/database'

/**
 * Phase 5.3: Report Schedule CRUD
 * Manages automated report scheduling — frequency, delivery, recipients.
 */

// Helper: calculate next run date based on frequency
function calculateNextRun(frequency: string, customInterval: number | null, timeOfDay: string, timezone: string, dayOfWeek?: number | null, dayOfMonth?: number | null): Date {
  const now = new Date()
  const [hours, minutes] = timeOfDay.split(':').map(Number)
  const next = new Date(now)
  next.setHours(hours, minutes, 0, 0)

  // If the time today has passed, start from tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1)
  }

  switch (frequency) {
    case 'DAILY':
      break // Already set to next occurrence of timeOfDay
    case 'WEEKLY':
      if (dayOfWeek != null) {
        const currentDay = next.getDay()
        const daysUntil = (dayOfWeek - currentDay + 7) % 7
        next.setDate(next.getDate() + (daysUntil === 0 && next <= now ? 7 : daysUntil))
      }
      break
    case 'BIWEEKLY':
      if (dayOfWeek != null) {
        const currentDay = next.getDay()
        const daysUntil = (dayOfWeek - currentDay + 7) % 7
        next.setDate(next.getDate() + (daysUntil === 0 ? 14 : daysUntil))
      } else {
        next.setDate(next.getDate() + 14)
      }
      break
    case 'MONTHLY':
      if (dayOfMonth != null) {
        next.setDate(dayOfMonth)
        if (next <= now) next.setMonth(next.getMonth() + 1)
      } else {
        next.setMonth(next.getMonth() + 1)
      }
      break
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3)
      if (dayOfMonth != null) next.setDate(dayOfMonth)
      break
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1)
      if (dayOfMonth != null) next.setDate(dayOfMonth)
      break
    case 'CUSTOM':
      if (customInterval && customInterval > 0) {
        next.setDate(next.getDate() + customInterval)
      }
      break
  }

  return next
}

// GET /api/report-schedules
export async function listReportSchedules(req: Request, res: Response) {
  try {
    const organizationId = req.user!.organizationId
    const userId = req.user!.userId

    const schedules = await prisma.reportSchedule.findMany({
      where: { organizationId, userId },
      include: {
        savedReport: { select: { id: true, name: true, type: true } },
        reportHistory: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          select: { id: true, status: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ success: true, data: schedules })
  } catch (error: unknown) {
    logger.error('Error listing report schedules:', error)
    res.status(500).json({ success: false, message: 'Failed to list report schedules', error: getErrorMessage(error) })
  }
}

// POST /api/report-schedules
export async function createReportSchedule(req: Request, res: Response) {
  try {
    const organizationId = req.user!.organizationId
    const userId = req.user!.userId

    const { savedReportId, frequency, customInterval, dayOfWeek, dayOfMonth, timeOfDay, timezone, recipients } = req.body

    // Verify the saved report exists and belongs to user
    const report = await prisma.savedReport.findFirst({
      where: { id: savedReportId, organizationId },
    })
    if (!report) {
      return res.status(404).json({ success: false, message: 'Saved report not found' })
    }

    const nextRunAt = calculateNextRun(frequency, customInterval || null, timeOfDay || '08:00', timezone || 'America/New_York', dayOfWeek, dayOfMonth)

    const schedule = await prisma.reportSchedule.create({
      data: {
        savedReportId,
        userId,
        organizationId,
        frequency,
        customInterval: customInterval || null,
        dayOfWeek: dayOfWeek ?? null,
        dayOfMonth: dayOfMonth ?? null,
        timeOfDay: timeOfDay || '08:00',
        timezone: timezone || 'America/New_York',
        recipients: recipients || null,
        nextRunAt,
      },
      include: { savedReport: { select: { id: true, name: true, type: true } } },
    })

    res.status(201).json({ success: true, data: schedule })
  } catch (error: unknown) {
    logger.error('Error creating report schedule:', error)
    res.status(500).json({ success: false, message: 'Failed to create report schedule', error: getErrorMessage(error) })
  }
}

// PATCH /api/report-schedules/:id
export async function updateReportSchedule(req: Request, res: Response) {
  try {
    const organizationId = req.user!.organizationId
    const { id } = req.params
    const { frequency, customInterval, dayOfWeek, dayOfMonth, timeOfDay, timezone, recipients, isActive } = req.body

    const existing = await prisma.reportSchedule.findFirst({
      where: { id, organizationId },
    })
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Schedule not found' })
    }

    const updateData: Record<string, any> = {}
    if (frequency !== undefined) updateData.frequency = frequency
    if (customInterval !== undefined) updateData.customInterval = customInterval
    if (dayOfWeek !== undefined) updateData.dayOfWeek = dayOfWeek
    if (dayOfMonth !== undefined) updateData.dayOfMonth = dayOfMonth
    if (timeOfDay !== undefined) updateData.timeOfDay = timeOfDay
    if (timezone !== undefined) updateData.timezone = timezone
    if (recipients !== undefined) updateData.recipients = recipients
    if (isActive !== undefined) updateData.isActive = isActive

    // Recalculate next run if schedule params changed
    if (frequency || timeOfDay || dayOfWeek !== undefined || dayOfMonth !== undefined) {
      updateData.nextRunAt = calculateNextRun(
        frequency || existing.frequency,
        customInterval ?? existing.customInterval,
        timeOfDay || existing.timeOfDay,
        timezone || existing.timezone,
        dayOfWeek ?? existing.dayOfWeek,
        dayOfMonth ?? existing.dayOfMonth,
      )
    }

    const schedule = await prisma.reportSchedule.update({
      where: { id },
      data: updateData,
      include: { savedReport: { select: { id: true, name: true, type: true } } },
    })

    res.json({ success: true, data: schedule })
  } catch (error: unknown) {
    logger.error('Error updating report schedule:', error)
    res.status(500).json({ success: false, message: 'Failed to update report schedule', error: getErrorMessage(error) })
  }
}

// DELETE /api/report-schedules/:id
export async function deleteReportSchedule(req: Request, res: Response) {
  try {
    const organizationId = req.user!.organizationId
    const { id } = req.params

    const existing = await prisma.reportSchedule.findFirst({ where: { id, organizationId } })
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Schedule not found' })
    }

    await prisma.reportSchedule.delete({ where: { id } })
    res.json({ success: true, message: 'Schedule deleted' })
  } catch (error: unknown) {
    logger.error('Error deleting report schedule:', error)
    res.status(500).json({ success: false, message: 'Failed to delete report schedule', error: getErrorMessage(error) })
  }
}

// GET /api/report-schedules/:id/history
export async function getReportHistory(req: Request, res: Response) {
  try {
    const organizationId = req.user!.organizationId
    const { id } = req.params
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20

    const [history, total] = await Promise.all([
      prisma.reportHistory.findMany({
        where: { reportScheduleId: id, organizationId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.reportHistory.count({ where: { reportScheduleId: id, organizationId } }),
    ])

    res.json({ success: true, data: history, pagination: { page, limit, total } })
  } catch (error: unknown) {
    logger.error('Error fetching report history:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch report history', error: getErrorMessage(error) })
  }
}
