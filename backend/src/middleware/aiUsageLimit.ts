/**
 * AI Usage Limit Middleware (Phase 2)
 * Checks usage limits before AI route handlers.
 * Returns 429 with upgrade message when limit is hit.
 *
 * Uses atomic pre-increment to prevent TOCTOU race conditions:
 * 1. Atomically increment the usage counter (reserve the slot)
 * 2. Check if the post-increment count exceeds the limit
 * 3. If over limit, decrement (release the slot) and return 429
 * 4. If under limit, proceed to handler
 */

import { logger } from '../lib/logger'
import { Request, Response, NextFunction } from 'express'
import { checkUsageLimit, incrementAIUsage, AIUsageType, getMonthlyUsage } from '../services/usage-tracking.service'
import { getUpgradeMessage } from '../config/subscriptions'
import { SubscriptionTier } from '@prisma/client'
import prisma from '../config/database'

/**
 * Factory that creates middleware to check a specific usage type.
 * Usage: router.post('/chat', checkAIUsage('aiMessages'), aiController.chatWithAI)
 */
export function checkAIUsage(type: AIUsageType) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user?.organizationId
      if (!organizationId) {
        res.status(401).json({ success: false, message: 'Authentication required' })
        return
      }

      const result = await checkUsageLimit(organizationId, type)

      if (!result.allowed) {
        const upgradeMsg = getUpgradeMessage(result.tier as SubscriptionTier, getResourceName(type))
        res.status(429).json({
          success: false,
          message: `Monthly ${getResourceName(type)} limit reached (${result.used}/${result.limit}).`,
          upgrade: upgradeMsg,
          data: {
            used: result.used,
            limit: result.limit,
            remaining: result.remaining,
            tier: result.tier,
          },
        })
        return
      }

      // Pre-increment usage to reserve the slot atomically (prevents TOCTOU race)
      // The downstream handler should NOT call incrementAIUsage for the base count
      // (it may still call it to update token/cost data)
      await incrementAIUsage(organizationId, type).catch(err => {
        logger.warn('Pre-increment usage failed (non-blocking):', err)
      })

      // Phase 7: Check budget hard limit
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { aiBudgetHardLimit: true, aiBudgetAlertEnabled: true },
      })
      if (org?.aiBudgetAlertEnabled && org.aiBudgetHardLimit) {
        const usage = await getMonthlyUsage(organizationId)
        if (usage.totalCost >= org.aiBudgetHardLimit) {
          res.status(429).json({
            success: false,
            message: `Monthly AI budget limit reached ($${usage.totalCost.toFixed(2)}/$${org.aiBudgetHardLimit.toFixed(2)}). Contact your admin to increase the limit.`,
            data: {
              currentCost: usage.totalCost,
              hardLimit: org.aiBudgetHardLimit,
              budgetExceeded: true,
            },
          })
          return
        }
      }

      // Attach usage info to request for downstream handlers
      // Mark as pre-incremented so handlers know not to double-count
      ;(req as any).aiUsage = {
        type,
        used: result.used,
        limit: result.limit,
        remaining: result.remaining,
        tier: result.tier,
        useOwnKey: result.useOwnKey,
        preIncremented: true,
      }

      next()
    } catch (error: unknown) {
      logger.error('AI usage check error:', error)
      // Don't block on usage check errors — let the request through
      next()
    }
  }
}

/**
 * Human-readable names for usage types
 */
function getResourceName(type: AIUsageType): string {
  const names: Record<AIUsageType, string> = {
    aiMessages: 'AI messages',
    contentGenerations: 'content generations',
    composeUses: 'AI compose uses',
    scoringRecalculations: 'scoring recalculations',
    webSearches: 'web searches',
    enhancements: 'message enhancements',
  }
  return names[type] || type
}
