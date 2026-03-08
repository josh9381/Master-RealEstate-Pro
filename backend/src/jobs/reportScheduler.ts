import cron from 'node-cron'
import { prisma } from '../config/database'
import { acquireLock, releaseLock } from '../utils/distributedLock'

const LOCK_KEY = 'report-scheduler'
const LOCK_TTL = 120 // 2 minutes

/**
 * Phase 5.3: Report Scheduler
 * Runs every 5 minutes. Finds due report schedules, generates report data,
 * stores in ReportHistory, and optionally sends email.
 */
async function runReportScheduler() {
  const acquired = await acquireLock(LOCK_KEY, LOCK_TTL)
  if (!acquired) return

  try {
    const now = new Date()

    // Find all active schedules that are due
    const dueSchedules = await prisma.reportSchedule.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
      },
      include: {
        savedReport: true,
        user: { select: { email: true, firstName: true, timezone: true } },
      },
      take: 20, // Process at most 20 per cycle
    })

    for (const schedule of dueSchedules) {
      try {
        // Generate report data based on saved report config
        const reportConfig = schedule.savedReport.config as any
        const reportData = await generateReportData(schedule.savedReport.type, reportConfig, schedule.organizationId)

        // Store in ReportHistory
        const recipients = (schedule.recipients as string[]) || []
        const allRecipients = [schedule.user.email, ...recipients]

        await prisma.reportHistory.create({
          data: {
            reportScheduleId: schedule.id,
            savedReportId: schedule.savedReportId,
            userId: schedule.userId,
            organizationId: schedule.organizationId,
            title: `${schedule.savedReport.name} — ${now.toLocaleDateString()}`,
            generatedData: reportData,
            sentTo: allRecipients,
            status: 'COMPLETED',
          },
        })

        // Calculate next run
        const nextRunAt = calculateNextRunFromSchedule(schedule)

        // Update schedule
        await prisma.reportSchedule.update({
          where: { id: schedule.id },
          data: {
            lastRunAt: now,
            nextRunAt,
            runCount: { increment: 1 },
          },
        })

        // TODO: In production, send email with PDF attachment here
        // For now, the report is stored in-app in ReportHistory
        console.log(`[ReportScheduler] Generated report "${schedule.savedReport.name}" for user ${schedule.user.email}`)
      } catch (err: any) {
        console.error(`[ReportScheduler] Failed to generate report ${schedule.id}:`, err.message)

        // Record failure
        await prisma.reportHistory.create({
          data: {
            reportScheduleId: schedule.id,
            savedReportId: schedule.savedReportId,
            userId: schedule.userId,
            organizationId: schedule.organizationId,
            title: `${schedule.savedReport.name} — ${now.toLocaleDateString()} (FAILED)`,
            generatedData: {},
            status: 'FAILED',
            errorMessage: err.message,
          },
        })
      }
    }
  } catch (error: any) {
    console.error('[ReportScheduler] Error:', error.message)
  } finally {
    await releaseLock(LOCK_KEY)
  }
}

/** Generate report data based on type and config */
async function generateReportData(type: string, config: any, organizationId: string): Promise<any> {
  const dateFilter: any = {}
  if (config?.dateRange?.startDate) dateFilter.gte = new Date(config.dateRange.startDate)
  if (config?.dateRange?.endDate) dateFilter.lte = new Date(config.dateRange.endDate)
  const dateWhere = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}

  switch (type) {
    case 'leads':
    case 'lead-performance': {
      const [total, byStatus, bySource, wonLeads] = await Promise.all([
        prisma.lead.count({ where: { organizationId, ...dateWhere } }),
        prisma.lead.groupBy({ by: ['status'], where: { organizationId, ...dateWhere }, _count: true }),
        prisma.lead.groupBy({ by: ['source'], where: { organizationId, ...dateWhere }, _count: true }),
        prisma.lead.findMany({ where: { organizationId, status: 'WON', ...dateWhere }, select: { value: true } }),
      ])
      return { total, byStatus, bySource, revenue: wonLeads.reduce((s, l) => s + (l.value || 0), 0) }
    }
    case 'campaigns':
    case 'campaign-performance': {
      const campaigns = await prisma.campaign.findMany({
        where: { organizationId, ...dateWhere },
        select: { name: true, type: true, status: true, sent: true, opened: true, clicked: true },
      })
      return { total: campaigns.length, campaigns }
    }
    case 'pipeline':
    case 'sales-pipeline': {
      const leads = await prisma.lead.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
        _sum: { value: true },
      })
      return { stages: leads }
    }
    case 'team':
    case 'team-performance': {
      const users = await prisma.user.findMany({
        where: { organizationId, isActive: true },
        select: {
          id: true, firstName: true, lastName: true,
          _count: { select: { leads: true, tasks: true, activities: true } },
        },
      })
      return { members: users }
    }
    case 'revenue': {
      const wonLeads = await prisma.lead.findMany({
        where: { organizationId, status: 'WON', ...dateWhere },
        select: { value: true, source: true, createdAt: true },
      })
      const total = wonLeads.reduce((s, l) => s + (l.value || 0), 0)
      return { totalRevenue: total, deals: wonLeads.length }
    }
    default:
      return { message: 'Report type not recognized', type }
  }
}

/** Calculate next run date from an existing schedule */
function calculateNextRunFromSchedule(schedule: any): Date {
  const now = new Date()
  const [hours, minutes] = (schedule.timeOfDay || '08:00').split(':').map(Number)
  const next = new Date(now)
  next.setHours(hours, minutes, 0, 0)

  switch (schedule.frequency) {
    case 'DAILY':
      next.setDate(next.getDate() + 1)
      break
    case 'WEEKLY':
      next.setDate(next.getDate() + 7)
      break
    case 'BIWEEKLY':
      next.setDate(next.getDate() + 14)
      break
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1)
      if (schedule.dayOfMonth) next.setDate(schedule.dayOfMonth)
      break
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3)
      if (schedule.dayOfMonth) next.setDate(schedule.dayOfMonth)
      break
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1)
      break
    case 'CUSTOM':
      if (schedule.customInterval) next.setDate(next.getDate() + schedule.customInterval)
      else next.setDate(next.getDate() + 1)
      break
    default:
      next.setDate(next.getDate() + 7)
  }

  return next
}

// Schedule: run every 5 minutes
let reportSchedulerTask: ReturnType<typeof cron.schedule> | null = null

export function startReportScheduler() {
  reportSchedulerTask = cron.schedule('*/5 * * * *', runReportScheduler)
  console.log('[ReportScheduler] Started — checking every 5 minutes')
}

export function stopReportScheduler() {
  reportSchedulerTask?.stop()
  console.log('[ReportScheduler] Stopped')
}
