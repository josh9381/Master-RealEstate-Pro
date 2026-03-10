/**
 * AI Usage Limit Middleware (Phase 2)
 * Checks usage limits before AI route handlers.
 * Returns 429 with upgrade message when limit is hit.
 */

import { logger } from '../lib/logger'
import { Request, Response, NextFunction } from 'express'
import { checkUsageLimit, AIUsageType, getMonthlyUsage } from '../services/usage-tracking.service'
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
      ;(req as any).aiUsage = {
        type,
        used: result.used,
        limit: result.limit,
        remaining: result.remaining,
        tier: result.tier,
        useOwnKey: result.useOwnKey,
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
