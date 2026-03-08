/**
 * Plan Usage Limits Middleware (Phase 9.18)
 * Enforces PLAN_FEATURES hard caps at API level.
 * Returns 403 with upgrade prompt when a plan limit is reached.
 */

import { Request, Response, NextFunction } from 'express'
import { SubscriptionTier } from '@prisma/client'
import { checkUsageLimit, getUpgradeMessage } from '../config/subscriptions'
import { prisma } from '../config/database'

type PlanResource = 'users' | 'leads' | 'pipelines' | 'campaigns' | 'workflows'

/**
 * Factory: creates middleware to enforce a resource limit before creation.
 *
 * Usage:
 *   router.post('/', enforcePlanLimit('leads'), handler)
 */
export function enforcePlanLimit(resource: PlanResource) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user?.organizationId
      if (!organizationId) {
        res.status(401).json({ success: false, message: 'Authentication required' })
        return
      }

      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { subscriptionTier: true },
      })

      if (!org) {
        res.status(404).json({ success: false, message: 'Organization not found' })
        return
      }

      const tier = org.subscriptionTier as SubscriptionTier
      const currentCount = await countResource(organizationId, resource)
      const result = checkUsageLimit(tier, resource, currentCount)

      if (result.isAtLimit) {
        const upgradeMsg = getUpgradeMessage(tier, RESOURCE_LABELS[resource])
        res.status(403).json({
          success: false,
          message: `${RESOURCE_LABELS[resource]} limit reached (${currentCount}/${result.limit}).`,
          upgrade: upgradeMsg,
          data: {
            resource,
            current: currentCount,
            limit: result.limit,
            tier,
          },
        })
        return
      }

      // Attach limit info for downstream handlers
      ;(req as any).planLimit = {
        resource,
        current: currentCount,
        limit: result.limit,
        remaining: result.remaining,
        tier,
      }

      next()
    } catch (error) {
      console.error(`Plan limit check error (${resource}):`, error)
      // Don't block on limit check errors — let the request through
      next()
    }
  }
}

/**
 * Checks monthly email or SMS sending limits for the org's tier.
 * Used in campaign execution and direct send endpoints.
 */
export async function checkMonthlyMessageLimit(
  organizationId: string,
  messageType: 'emails' | 'sms'
): Promise<{
  allowed: boolean
  sent: number
  limit: number | 'unlimited'
  remaining: number | 'unlimited'
  tier: SubscriptionTier
}> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { subscriptionTier: true },
  })

  if (!org) {
    return { allowed: false, sent: 0, limit: 0, remaining: 0, tier: 'STARTER' as SubscriptionTier }
  }

  const tier = org.subscriptionTier as SubscriptionTier
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const dbType = messageType === 'emails' ? 'EMAIL' : 'SMS'

  const sent = await prisma.message.count({
    where: {
      organizationId,
      type: dbType,
      direction: 'OUTBOUND',
      createdAt: { gte: startOfMonth },
    },
  })

  const result = checkUsageLimit(tier, messageType, sent)

  return {
    allowed: !result.isAtLimit,
    sent,
    limit: result.limit,
    remaining: result.remaining,
    tier,
  }
}

// ─── Helpers ───────────────────────────────────────────────

const RESOURCE_LABELS: Record<PlanResource, string> = {
  users: 'Team member',
  leads: 'Lead',
  pipelines: 'Pipeline',
  campaigns: 'Campaign',
  workflows: 'Workflow',
}

async function countResource(organizationId: string, resource: PlanResource): Promise<number> {
  switch (resource) {
    case 'users':
      return prisma.user.count({ where: { organizationId } })
    case 'leads':
      return prisma.lead.count({ where: { organizationId } })
    case 'pipelines':
      return prisma.pipeline.count({ where: { organizationId } })
    case 'campaigns':
      return prisma.campaign.count({ where: { organizationId } })
    case 'workflows':
      return prisma.workflow.count({ where: { organizationId } })
    default:
      return 0
  }
}
