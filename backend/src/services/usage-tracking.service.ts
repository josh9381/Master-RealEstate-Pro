/**
 * Usage Tracking Service (Phase 2)
 * Tracks AI usage per subscription, enforces limits by tier.
 * Called after every AI request to increment counters.
 */

import { SubscriptionTier } from '@prisma/client'
import prisma from '../config/database'
import { AI_PLAN_LIMITS } from '../config/subscriptions'

export type AIUsageType =
  | 'aiMessages'
  | 'contentGenerations'
  | 'composeUses'
  | 'scoringRecalculations'
  | 'webSearches'
  | 'enhancements'

/**
 * Get the current YYYY-MM month string
 */
function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Get or create the UsageTracking record for a subscription's current month
 */
async function getOrCreateMonthlyUsage(subscriptionId: string) {
  const month = getCurrentMonth()

  const existing = await prisma.usageTracking.findUnique({
    where: { subscriptionId_month: { subscriptionId, month } },
  })

  if (existing) return existing

  return prisma.usageTracking.create({
    data: { subscriptionId, month },
  })
}

/**
 * Increment AI usage counter for a specific type
 * Also tracks total tokens and cost if provided
 */
export async function incrementAIUsage(
  organizationId: string,
  type: AIUsageType,
  extra?: { tokens?: number; cost?: number }
): Promise<void> {
  // Find the org's subscription
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
  })

  if (!subscription) {
    // No subscription = free tier; still track usage
    // Try to find or create a default subscription record
    console.warn(`No subscription found for org ${organizationId}, skipping usage tracking`)
    return
  }

  const month = getCurrentMonth()

  // Upsert the monthly record and increment the counter
  const incrementData: Record<string, number> = { [type]: 1 }
  if (extra?.tokens) incrementData.totalTokensUsed = extra.tokens
  if (extra?.cost) incrementData.totalCost = extra.cost

  await prisma.usageTracking.upsert({
    where: { subscriptionId_month: { subscriptionId: subscription.id, month } },
    create: {
      subscriptionId: subscription.id,
      month,
      [type]: 1,
      totalTokensUsed: extra?.tokens || 0,
      totalCost: extra?.cost || 0,
    },
    update: {
      [type]: { increment: 1 },
      ...(extra?.tokens ? { totalTokensUsed: { increment: extra.tokens } } : {}),
      ...(extra?.cost ? { totalCost: { increment: extra.cost } } : {}),
    },
  })
}

/**
 * Get monthly usage for an organization
 */
export async function getMonthlyUsage(organizationId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
  })

  if (!subscription) {
    // Return zero usage for orgs without a subscription
    return {
      aiMessages: 0,
      contentGenerations: 0,
      composeUses: 0,
      scoringRecalculations: 0,
      webSearches: 0,
      callMinutes: 0,
      enhancements: 0,
      totalTokensUsed: 0,
      totalCost: 0,
    }
  }

  const month = getCurrentMonth()
  const usage = await prisma.usageTracking.findUnique({
    where: { subscriptionId_month: { subscriptionId: subscription.id, month } },
  })

  return {
    aiMessages: usage?.aiMessages || 0,
    contentGenerations: usage?.contentGenerations || 0,
    composeUses: usage?.composeUses || 0,
    scoringRecalculations: usage?.scoringRecalculations || 0,
    webSearches: usage?.webSearches || 0,
    callMinutes: usage?.callMinutes || 0,
    enhancements: usage?.enhancements || 0,
    totalTokensUsed: usage?.totalTokensUsed || 0,
    totalCost: usage?.totalCost || 0,
  }
}

/**
 * Check if the org is within its usage limit for a given type
 * Returns { allowed, used, limit, remaining }
 */
export async function checkUsageLimit(
  organizationId: string,
  type: AIUsageType
): Promise<{
  allowed: boolean
  used: number
  limit: number | 'unlimited'
  remaining: number | 'unlimited'
  tier: SubscriptionTier
  useOwnKey: boolean
}> {
  // Get org's subscription + check if they use their own key
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      subscriptionTier: true,
      useOwnAIKey: true,
      openaiApiKey: true,
      Subscription: { select: { id: true } },
    },
  })

  const tier = org?.subscriptionTier || 'FREE'
  const useOwnKey = !!(org?.useOwnAIKey && org?.openaiApiKey)
  const limits = AI_PLAN_LIMITS[tier as SubscriptionTier]

  // Map usage type to limit field
  const limitMap: Record<AIUsageType, keyof typeof limits> = {
    aiMessages: 'maxMonthlyAIMessages',
    contentGenerations: 'maxContentGenerations',
    composeUses: 'maxComposeUses',
    scoringRecalculations: 'maxScoringRecalculations',
    webSearches: 'maxWebSearches',
    enhancements: 'maxContentGenerations', // Enhancements count toward content limit
  }

  const limitValue = limits[limitMap[type]]

  // If org uses their own key, skip message count limits (they pay OpenAI directly)
  // But still enforce rate limits (handled by middleware)
  if (useOwnKey && type !== 'scoringRecalculations') {
    return {
      allowed: true,
      used: 0,
      limit: 'unlimited',
      remaining: 'unlimited',
      tier,
      useOwnKey: true,
    }
  }

  if (limitValue === 'unlimited') {
    return {
      allowed: true,
      used: 0,
      limit: 'unlimited',
      remaining: 'unlimited',
      tier,
      useOwnKey,
    }
  }

  // Get current usage
  const usage = await getMonthlyUsage(organizationId)
  // Enhancements share the content-generation budget — sum both counters
  const used = type === 'enhancements'
    ? (usage.contentGenerations || 0) + (usage.enhancements || 0)
    : type === 'contentGenerations'
      ? (usage.contentGenerations || 0) + (usage.enhancements || 0)
      : usage[type] || 0

  return {
    allowed: used < limitValue,
    used,
    limit: limitValue,
    remaining: Math.max(0, limitValue - used),
    tier,
    useOwnKey,
  }
}

/**
 * Get detailed usage with limits for dashboard display
 */
export async function getUsageWithLimits(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      subscriptionTier: true,
      useOwnAIKey: true,
      openaiApiKey: true,
    },
  })

  const tier = (org?.subscriptionTier || 'FREE') as SubscriptionTier
  const useOwnKey = !!(org?.useOwnAIKey && org?.openaiApiKey)
  const limits = AI_PLAN_LIMITS[tier]
  const usage = await getMonthlyUsage(organizationId)

  return {
    tier,
    useOwnKey,
    month: getCurrentMonth(),
    usage,
    limits: {
      maxMonthlyAIMessages: useOwnKey ? 'unlimited' as const : limits.maxMonthlyAIMessages,
      maxTokensPerRequest: limits.maxTokensPerRequest,
      maxContentGenerations: useOwnKey ? 'unlimited' as const : limits.maxContentGenerations,
      maxComposeUses: useOwnKey ? 'unlimited' as const : limits.maxComposeUses,
      maxScoringRecalculations: limits.maxScoringRecalculations,
      maxWebSearches: useOwnKey ? 'unlimited' as const : limits.maxWebSearches,
      chatHistoryDays: limits.chatHistoryDays,
      aiRateLimit: limits.aiRateLimit,
    },
  }
}

/**
 * Get cost breakdown for admin dashboard
 */
export async function getCostBreakdown(organizationId: string, months: number = 6) {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    select: { id: true },
  })

  if (!subscription) return []

  // Get last N months of usage
  const now = new Date()
  const monthKeys: string[] = []
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const records = await prisma.usageTracking.findMany({
    where: {
      subscriptionId: subscription.id,
      month: { in: monthKeys },
    },
    orderBy: { month: 'asc' },
  })

  return records.map(r => ({
    month: r.month,
    aiMessages: r.aiMessages,
    contentGenerations: r.contentGenerations,
    composeUses: r.composeUses,
    enhancements: r.enhancements,
    totalTokensUsed: r.totalTokensUsed,
    totalCost: r.totalCost,
  }))
}
