/**
 * AI Spend Monitoring Service (Phase 5C)
 * Monitors monthly AI spend and triggers alerts when thresholds are exceeded.
 *
 * Thresholds:
 * - Platform-wide: from AI_SPEND_ALERT_THRESHOLD env var (default $500)
 * - Per-org: from organization.aiMonthlyTokenBudget
 *
 * Alerts are logged via aiLogger and can be extended with email/webhook notifications.
 */

import prisma from '../config/database'
import { aiLogger } from '../utils/ai-logger'
import { calculateCost, MODEL_TIERS } from './ai-config.service'

// Alert thresholds
const PLATFORM_MONTHLY_THRESHOLD = parseFloat(process.env.AI_SPEND_ALERT_THRESHOLD || '500')
const ALERT_WARNING_PERCENT = 0.8  // Alert at 80% of budget
const ALERT_CRITICAL_PERCENT = 1.0 // Alert at 100% of budget

// Track which alerts have already been sent this month (avoid spam)
const alertsSent = new Map<string, Set<string>>()

/**
 * Check and alert on platform-wide AI spend
 */
export async function checkPlatformSpend(): Promise<void> {
  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

  const result = await prisma.usageTracking.aggregate({
    where: {
      month: currentMonth,
    },
    _sum: {
      totalCost: true,
    },
  })

  const totalSpend = result._sum.totalCost || 0
  const alertKey = `platform:${currentMonth}`

  if (totalSpend >= PLATFORM_MONTHLY_THRESHOLD * ALERT_CRITICAL_PERCENT) {
    if (!hasAlerted(alertKey, 'critical')) {
      aiLogger.spendAlert({
        organizationId: 'PLATFORM',
        currentSpend: totalSpend,
        threshold: PLATFORM_MONTHLY_THRESHOLD,
        period: currentMonth,
      })
      markAlerted(alertKey, 'critical')
      console.error(`🚨 [SPEND ALERT] Platform AI spend $${totalSpend.toFixed(2)} has exceeded threshold $${PLATFORM_MONTHLY_THRESHOLD}`)
    }
  } else if (totalSpend >= PLATFORM_MONTHLY_THRESHOLD * ALERT_WARNING_PERCENT) {
    if (!hasAlerted(alertKey, 'warning')) {
      aiLogger.spendAlert({
        organizationId: 'PLATFORM',
        currentSpend: totalSpend,
        threshold: PLATFORM_MONTHLY_THRESHOLD,
        period: currentMonth,
      })
      markAlerted(alertKey, 'warning')
      console.warn(`⚠️ [SPEND WARNING] Platform AI spend $${totalSpend.toFixed(2)} is at ${Math.round((totalSpend / PLATFORM_MONTHLY_THRESHOLD) * 100)}% of threshold $${PLATFORM_MONTHLY_THRESHOLD}`)
    }
  }
}

/**
 * Check and alert on per-org AI spend
 */
export async function checkOrgSpend(organizationId: string): Promise<{
  spend: number
  budget: number | null
  percentUsed: number | null
  overBudget: boolean
}> {
  const currentMonth = new Date().toISOString().slice(0, 7)

  const [usage, org] = await Promise.all([
    prisma.usageTracking.findFirst({
      where: {
        subscription: { organizationId },
        month: currentMonth,
      },
      select: { totalCost: true, totalTokensUsed: true },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { aiMonthlyTokenBudget: true },
    }),
  ])

  const spend = usage?.totalCost || 0
  const budget = org?.aiMonthlyTokenBudget || null

  if (budget === null) {
    return { spend, budget, percentUsed: null, overBudget: false }
  }

  // Convert token budget to approximate dollar budget
  // Use mainModel pricing as baseline
  const dollarBudget = calculateCost(budget, MODEL_TIERS.mainModel)
  const percentUsed = dollarBudget > 0 ? (spend / dollarBudget) * 100 : 0
  const overBudget = percentUsed >= 100

  const alertKey = `org:${organizationId}:${currentMonth}`

  if (overBudget) {
    if (!hasAlerted(alertKey, 'critical')) {
      aiLogger.spendAlert({
        organizationId,
        currentSpend: spend,
        threshold: dollarBudget,
        period: currentMonth,
      })
      markAlerted(alertKey, 'critical')
    }
  } else if (percentUsed >= 80) {
    if (!hasAlerted(alertKey, 'warning')) {
      aiLogger.spendAlert({
        organizationId,
        currentSpend: spend,
        threshold: dollarBudget,
        period: currentMonth,
      })
      markAlerted(alertKey, 'warning')
    }
  }

  return { spend, budget, percentUsed: Math.round(percentUsed), overBudget }
}

/**
 * Get spend summary for all orgs (admin dashboard)
 */
export async function getSpendSummary(): Promise<{
  platformTotal: number
  threshold: number
  topOrgs: Array<{ organizationId: string; spend: number; name: string }>
}> {
  const currentMonth = new Date().toISOString().slice(0, 7)

  const usage = await prisma.usageTracking.findMany({
    where: { month: currentMonth },
    include: {
      subscription: {
        include: {
          organization: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { totalCost: 'desc' },
    take: 10,
  })

  const platformTotal = usage.reduce((sum, u) => sum + (u.totalCost || 0), 0)

  return {
    platformTotal,
    threshold: PLATFORM_MONTHLY_THRESHOLD,
    topOrgs: usage.map(u => ({
      organizationId: u.subscription.organization.id,
      name: u.subscription.organization.name,
      spend: u.totalCost || 0,
    })),
  }
}

// -- Internal alert tracking --

function hasAlerted(key: string, level: string): boolean {
  return alertsSent.get(key)?.has(level) || false
}

function markAlerted(key: string, level: string): void {
  if (!alertsSent.has(key)) {
    alertsSent.set(key, new Set())
  }
  alertsSent.get(key)!.add(level)
}

/**
 * Reset alert tracking (call at start of each month or on demand)
 */
export function resetAlertTracking(): void {
  alertsSent.clear()
}
