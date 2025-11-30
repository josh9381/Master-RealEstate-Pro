import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { checkFeatureAccess, checkUsageLimit, getUpgradeMessage } from '../config/subscriptions';

const prisma = new PrismaClient();

/**
 * Middleware to check if user's subscription tier has access to a feature
 * Usage: checkFeature('advanced_analytics')
 */
export const checkFeature = (featureName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      // Get organization subscription tier
      const organization = await prisma.organization.findUnique({
        where: { id: req.user.organizationId },
        select: { subscriptionTier: true },
      });

      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Check if tier has access to feature
      const hasAccess = checkFeatureAccess(organization.subscriptionTier, featureName);

      if (!hasAccess) {
        const upgradeMessage = getUpgradeMessage(organization.subscriptionTier, featureName);
        return res.status(403).json({
          error: 'Feature not available in your current plan',
          feature: featureName,
          currentTier: organization.subscriptionTier,
          upgradeMessage,
        });
      }

      next();
    } catch (error) {
      console.error('Error checking feature access:', error);
      res.status(500).json({ error: 'Failed to check feature access' });
    }
  };
};

/**
 * Middleware to check if user has reached usage limit for a resource
 * Usage: checkUsageLimit('leads')
 */
export const checkUsageLimitMiddleware = (resource: 'users' | 'leads' | 'campaigns' | 'workflows' | 'emails' | 'sms') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const organizationId = req.user.organizationId;

      // Get organization subscription tier
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { subscriptionTier: true },
      });

      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Get current count for the resource
      let currentCount = 0;

      switch (resource) {
        case 'users':
          currentCount = await prisma.user.count({ where: { organizationId } });
          break;
        case 'leads':
          currentCount = await prisma.lead.count({ where: { organizationId } });
          break;
        case 'campaigns':
          currentCount = await prisma.campaign.count({ where: { organizationId } });
          break;
        case 'workflows':
          currentCount = await prisma.workflow.count({ where: { organizationId } });
          break;
        case 'emails': {
          // Count emails sent this month
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);
          currentCount = await prisma.message.count({
            where: {
              organizationId,
              type: 'EMAIL',
              createdAt: { gte: startOfMonth },
            },
          });
          break;
        }
        case 'sms': {
          // Count SMS sent this month
          const monthStart = new Date();
          monthStart.setDate(1);
          monthStart.setHours(0, 0, 0, 0);
          currentCount = await prisma.message.count({
            where: {
              organizationId,
              type: 'SMS',
              createdAt: { gte: monthStart },
            },
          });
          break;
        }
      }

      // Check if at or over limit
      const limitCheck = checkUsageLimit(organization.subscriptionTier, resource, currentCount);

      if (limitCheck.isAtLimit) {
        const upgradeMessage = getUpgradeMessage(organization.subscriptionTier, resource);
        return res.status(403).json({
          error: `You have reached your ${resource} limit`,
          resource,
          currentTier: organization.subscriptionTier,
          currentCount,
          limit: limitCheck.limit,
          upgradeMessage,
        });
      }

      // Attach usage info to request for potential use in controller
      req.usageInfo = {
        resource,
        current: currentCount,
        limit: limitCheck.limit,
        remaining: limitCheck.remaining,
      };

      next();
    } catch (error) {
      console.error('Error checking usage limit:', error);
      res.status(500).json({ error: 'Failed to check usage limit' });
    }
  };
};

/**
 * Extend Express Request type to include usage info
 */
declare module 'express-serve-static-core' {
  interface Request {
    usageInfo?: {
      resource: string;
      current: number;
      limit: number | 'unlimited';
      remaining: number | 'unlimited';
    };
  }
}
