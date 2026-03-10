import { getErrorMessage } from '../utils/errors'
import { logger } from '../lib/logger'
import { Request, Response } from 'express'
import { prisma } from '../config/database'

/**
 * Phase 5.4: Goal Setting & Tracking
 * CRUD for goals + auto-calculation of current progress.
 */

// Metric type → how to calculate current value
async function calculateMetricValue(metricType: string, organizationId: string, userId: string, startDate: Date, endDate: Date): Promise<number> {
  const dateWhere = { createdAt: { gte: startDate, lte: endDate } }

  switch (metricType) {
    case 'LEADS_GENERATED': {
      return prisma.lead.count({ where: { organizationId, ...dateWhere } })
    }
    case 'DEALS_CLOSED': {
      return prisma.lead.count({ where: { organizationId, status: 'WON', ...dateWhere } })
    }
    case 'REVENUE': {
      const result = await prisma.lead.aggregate({
        where: { organizationId, status: 'WON', ...dateWhere },
        _sum: { value: true },
      })
      return result._sum.value || 0
    }
    case 'CONVERSION_RATE': {
      const [total, won] = await Promise.all([
        prisma.lead.count({ where: { organizationId, ...dateWhere } }),
        prisma.lead.count({ where: { organizationId, status: 'WON', ...dateWhere } }),
      ])
      return total > 0 ? Math.round((won / total) * 1000) / 10 : 0
    }
    case 'CALLS_MADE': {
      return prisma.call.count({
        where: { organizationId, direction: 'OUTBOUND', ...dateWhere },
      })
    }
    case 'APPOINTMENTS_SET': {
      return prisma.appointment.count({
        where: { organizationId, ...dateWhere },
      })
    }
    case 'RESPONSE_TIME': {
      // Average hours from lead creation to first activity
      const leads = await prisma.lead.findMany({
        where: { organizationId, ...dateWhere },
        select: { id: true, createdAt: true },
        take: 100,
      })
      if (leads.length === 0) return 0

      let totalHours = 0
      let counted = 0
      for (const lead of leads) {
        const firstActivity = await prisma.activity.findFirst({
          where: { leadId: lead.id, type: { in: ['EMAIL_SENT', 'SMS_SENT', 'CALL_MADE'] } },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true },
        })
        if (firstActivity) {
          totalHours += (firstActivity.createdAt.getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60)
          counted++
        }
      }
      return counted > 0 ? Math.round((totalHours / counted) * 10) / 10 : 0
    }
    default:
      return 0 // CUSTOM goals are updated manually
  }
}

// GET /api/goals
export async function listGoals(req: Request, res: Response) {
  try {
    const organizationId = req.user!.organizationId
    const userId = req.user!.userId
    const activeOnly = req.query.active === 'true'

    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100)
    const skip = (page - 1) * limit

    const goalWhere = {
      organizationId,
      userId,
      ...(activeOnly ? { isActive: true } : {}),
    }

    const [goals, total] = await Promise.all([
      prisma.goal.findMany({
        where: goalWhere,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.goal.count({ where: goalWhere }),
    ])

    // Auto-refresh current values for active goals
    const refreshed = await Promise.all(
      goals.map(async (goal) => {
        if (!goal.isActive || goal.metricType === 'CUSTOM') return goal

        try {
          const currentValue = await calculateMetricValue(
            goal.metricType,
            organizationId,
            userId,
            goal.startDate,
            goal.endDate,
          )
          const progress = goal.targetValue > 0 ? Math.min(100, Math.round((currentValue / goal.targetValue) * 1000) / 10) : 0
          const isCompleted = currentValue >= goal.targetValue

          // Update in DB if value changed
          if (currentValue !== goal.currentValue || (isCompleted && !goal.completedAt)) {
            await prisma.goal.update({
              where: { id: goal.id },
              data: {
                currentValue,
                ...(isCompleted && !goal.completedAt ? { completedAt: new Date() } : {}),
              },
            })
          }

          return { ...goal, currentValue, progress, isCompleted }
        } catch (error) {
          logger.error(`[GOALS] Failed to calculate metric for goal ${goal.id}:`, error)
          return { ...goal, progress: goal.targetValue > 0 ? Math.round((goal.currentValue / goal.targetValue) * 1000) / 10 : 0 }
        }
      }),
    )

    res.json({ success: true, data: refreshed, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (error: unknown) {
    logger.error('Error listing goals:', error)
    res.status(500).json({ success: false, message: 'Failed to list goals', error: getErrorMessage(error) })
  }
}

// POST /api/goals
export async function createGoal(req: Request, res: Response) {
  try {
    const organizationId = req.user!.organizationId
    const userId = req.user!.userId

    const { name, metricType, targetValue, startDate, endDate, period, notes } = req.body

    if (!name || !metricType || !targetValue || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'name, metricType, targetValue, startDate, and endDate are required' })
    }

    // Calculate initial current value
    const start = new Date(startDate)
    const end = new Date(endDate)
    let currentValue = 0
    if (metricType !== 'CUSTOM') {
      currentValue = await calculateMetricValue(metricType, organizationId, userId, start, end)
    }

    const goal = await prisma.goal.create({
      data: {
        userId,
        organizationId,
        name,
        metricType,
        targetValue: parseFloat(targetValue),
        currentValue,
        startDate: start,
        endDate: end,
        period: period || 'MONTHLY',
        notes: notes || null,
      },
    })

    const progress = goal.targetValue > 0 ? Math.round((goal.currentValue / goal.targetValue) * 1000) / 10 : 0
    res.status(201).json({ success: true, data: { ...goal, progress } })
  } catch (error: unknown) {
    logger.error('Error creating goal:', error)
    res.status(500).json({ success: false, message: 'Failed to create goal', error: getErrorMessage(error) })
  }
}

// PATCH /api/goals/:id
export async function updateGoal(req: Request, res: Response) {
  try {
    const organizationId = req.user!.organizationId
    const { id } = req.params
    const { name, targetValue, endDate, period, notes, isActive, currentValue } = req.body

    const existing = await prisma.goal.findFirst({ where: { id, organizationId } })
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Goal not found' })
    }

    const updateData: Record<string, any> = {}
    if (name !== undefined) updateData.name = name
    if (targetValue !== undefined) updateData.targetValue = parseFloat(targetValue)
    if (endDate !== undefined) updateData.endDate = new Date(endDate)
    if (period !== undefined) updateData.period = period
    if (notes !== undefined) updateData.notes = notes
    if (isActive !== undefined) updateData.isActive = isActive
    if (currentValue !== undefined) updateData.currentValue = parseFloat(currentValue) // For CUSTOM goals

    const goal = await prisma.goal.update({
      where: { id },
      data: updateData,
    })

    res.json({ success: true, data: goal })
  } catch (error: unknown) {
    logger.error('Error updating goal:', error)
    res.status(500).json({ success: false, message: 'Failed to update goal', error: getErrorMessage(error) })
  }
}

// DELETE /api/goals/:id
export async function deleteGoal(req: Request, res: Response) {
  try {
    const organizationId = req.user!.organizationId
    const { id } = req.params

    const existing = await prisma.goal.findFirst({ where: { id, organizationId } })
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Goal not found' })
    }

    await prisma.goal.delete({ where: { id } })
    res.json({ success: true, message: 'Goal deleted' })
  } catch (error: unknown) {
    logger.error('Error deleting goal:', error)
    res.status(500).json({ success: false, message: 'Failed to delete goal', error: getErrorMessage(error) })
  }
}

// GET /api/goals/:id — Single goal with fresh progress
export async function getGoal(req: Request, res: Response) {
  try {
    const organizationId = req.user!.organizationId
    const { id } = req.params

    const goal = await prisma.goal.findFirst({ where: { id, organizationId } })
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' })
    }

    let currentValue = goal.currentValue
    if (goal.isActive && goal.metricType !== 'CUSTOM') {
      currentValue = await calculateMetricValue(goal.metricType, organizationId, goal.userId, goal.startDate, goal.endDate)
      if (currentValue !== goal.currentValue) {
        await prisma.goal.update({ where: { id }, data: { currentValue } })
      }
    }

    const progress = goal.targetValue > 0 ? Math.min(100, Math.round((currentValue / goal.targetValue) * 1000) / 10) : 0

    res.json({ success: true, data: { ...goal, currentValue, progress } })
  } catch (error: unknown) {
    logger.error('Error fetching goal:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch goal', error: getErrorMessage(error) })
  }
}
