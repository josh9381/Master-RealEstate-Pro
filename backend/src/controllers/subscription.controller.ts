import { Request, Response } from 'express';
import { SubscriptionTier } from '@prisma/client';
import { 
  PLAN_FEATURES, 
  getPlanFeatures, 
  checkUsageLimit,
  getTrialDaysRemaining,
} from '../config/subscriptions';
import { prisma } from '../config/database';

/**
 * Get current subscription for the user's organization
 * GET /api/subscriptions/current
 */
export const getCurrentSubscription = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    // Get organization with subscription info
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        subscriptionTier: true,
        subscriptionId: true,
        trialEndsAt: true,
        createdAt: true,
      },
    });

    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    // Get plan features
    const planFeatures = getPlanFeatures(organization.subscriptionTier);

    // Calculate trial info
    const trialDaysRemaining = getTrialDaysRemaining(organization.trialEndsAt);
    const isInTrial = trialDaysRemaining !== null && trialDaysRemaining > 0;

    // Get actual usage
    const [userCount, leadCount, campaignCount, workflowCount] = await Promise.all([
      prisma.user.count({ where: { organizationId } }),
      prisma.lead.count({ where: { organizationId } }),
      prisma.campaign.count({ where: { organizationId } }),
      prisma.workflow.count({ where: { organizationId } }),
    ]);

    // Check limits
    const usageLimits = {
      users: checkUsageLimit(organization.subscriptionTier, 'users', userCount),
      leads: checkUsageLimit(organization.subscriptionTier, 'leads', leadCount),
      campaigns: checkUsageLimit(organization.subscriptionTier, 'campaigns', campaignCount),
      workflows: checkUsageLimit(organization.subscriptionTier, 'workflows', workflowCount),
    };

    // Calculate usage percentages
    const usage = {
      users: {
        current: userCount,
        limit: usageLimits.users.limit,
        remaining: usageLimits.users.remaining,
        percentage: usageLimits.users.limit === 'unlimited' 
          ? 0 
          : Math.round((userCount / (usageLimits.users.limit as number)) * 100),
        isAtLimit: usageLimits.users.isAtLimit,
      },
      leads: {
        current: leadCount,
        limit: usageLimits.leads.limit,
        remaining: usageLimits.leads.remaining,
        percentage: usageLimits.leads.limit === 'unlimited'
          ? 0
          : Math.round((leadCount / (usageLimits.leads.limit as number)) * 100),
        isAtLimit: usageLimits.leads.isAtLimit,
      },
      campaigns: {
        current: campaignCount,
        limit: usageLimits.campaigns.limit,
        remaining: usageLimits.campaigns.remaining,
        percentage: usageLimits.campaigns.limit === 'unlimited'
          ? 0
          : Math.round((campaignCount / (usageLimits.campaigns.limit as number)) * 100),
        isAtLimit: usageLimits.campaigns.isAtLimit,
      },
      workflows: {
        current: workflowCount,
        limit: usageLimits.workflows.limit,
        remaining: usageLimits.workflows.remaining,
        percentage: usageLimits.workflows.limit === 'unlimited'
          ? 0
          : Math.round((workflowCount / (usageLimits.workflows.limit as number)) * 100),
        isAtLimit: usageLimits.workflows.isAtLimit,
      },
    };

    res.json({
      success: true,
      data: {
        subscription: {
          tier: organization.subscriptionTier,
          name: planFeatures.name,
          price: planFeatures.price,
          billingPeriod: planFeatures.billingPeriod,
          subscriptionId: organization.subscriptionId,
          isInTrial,
          trialEndsAt: organization.trialEndsAt,
          trialDaysRemaining,
          features: planFeatures.features,
        },
        usage,
        planFeatures,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subscription' });
  }
};

/**
 * Get all available plans
 * GET /api/subscriptions/plans
 */
export const getAvailablePlans = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    // Get current organization to mark current plan
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionTier: true },
    });

    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const currentTier = organization.subscriptionTier;

    // Return all plans with current plan marked
    const plans = Object.entries(PLAN_FEATURES).map(([tier, features]) => ({
      tier,
      ...features,
      isCurrent: tier === currentTier,
      isUpgrade: getTierLevel(tier as SubscriptionTier) > getTierLevel(currentTier),
      isDowngrade: getTierLevel(tier as SubscriptionTier) < getTierLevel(currentTier),
    }));

    res.json({ success: true, data: { plans } });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch plans' });
  }
};

/**
 * Change subscription plan (Admin only)
 * POST /api/subscriptions/change-plan
 */
export const changePlan = async (req: Request, res: Response) => {
  try {
    const { newTier } = req.body;
    const organizationId = req.user!.organizationId;
    const userId = req.user!.userId;

    // Validate new tier
    if (!['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(newTier)) {
      return res.status(400).json({ success: false, message: 'Invalid subscription tier' });
    }

    // Get current organization
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        subscriptionTier: true,
        name: true,
      },
    });

    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const oldTier = organization.subscriptionTier;

    // Update subscription tier
    const updatedOrganization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        subscriptionTier: newTier as SubscriptionTier,
        subscriptionId: `manual_${Date.now()}`, // Placeholder for manual upgrades
      },
    });

    // Log the change in activity
    await prisma.activity.create({
      data: {
        type: 'STATUS_CHANGED', // Using existing enum
        title: 'Subscription Changed',
        description: `Subscription changed from ${oldTier} to ${newTier}`,
        userId,
        organizationId,
        metadata: {
          oldTier,
          newTier,
          changedBy: userId,
          timestamp: new Date().toISOString(),
        },
      },
    });

    const newPlanFeatures = getPlanFeatures(newTier as SubscriptionTier);

    res.json({
      success: true,
      data: {
        subscription: {
          tier: updatedOrganization.subscriptionTier,
          name: newPlanFeatures.name,
          price: newPlanFeatures.price,
          features: newPlanFeatures.features,
        },
      },
      message: 'Subscription updated successfully',
    });
  } catch (error) {
    console.error('Error changing plan:', error);
    res.status(500).json({ success: false, message: 'Failed to change subscription plan' });
  }
};

/**
 * Get usage statistics
 * GET /api/subscriptions/usage
 */
export const getUsageStats = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionTier: true },
    });

    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    // Get counts
    const [
      userCount,
      leadCount,
      campaignCount,
      workflowCount,
      messageCount,
      appointmentCount,
    ] = await Promise.all([
      prisma.user.count({ where: { organizationId } }),
      prisma.lead.count({ where: { organizationId } }),
      prisma.campaign.count({ where: { organizationId } }),
      prisma.workflow.count({ where: { organizationId } }),
      prisma.message.count({ where: { organizationId } }),
      prisma.appointment.count({ where: { organizationId } }),
    ]);

    // Get monthly message counts
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [monthlyEmails, monthlySMS] = await Promise.all([
      prisma.message.count({
        where: {
          organizationId,
          type: 'EMAIL',
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.message.count({
        where: {
          organizationId,
          type: 'SMS',
          createdAt: { gte: startOfMonth },
        },
      }),
    ]);

    // Check all limits
    const limits = {
      users: checkUsageLimit(organization.subscriptionTier, 'users', userCount),
      leads: checkUsageLimit(organization.subscriptionTier, 'leads', leadCount),
      campaigns: checkUsageLimit(organization.subscriptionTier, 'campaigns', campaignCount),
      workflows: checkUsageLimit(organization.subscriptionTier, 'workflows', workflowCount),
      emails: checkUsageLimit(organization.subscriptionTier, 'emails', monthlyEmails),
      sms: checkUsageLimit(organization.subscriptionTier, 'sms', monthlySMS),
    };

    res.json({
      success: true,
      data: {
        usage: {
          users: { current: userCount, ...limits.users },
          leads: { current: leadCount, ...limits.leads },
          campaigns: { current: campaignCount, ...limits.campaigns },
          workflows: { current: workflowCount, ...limits.workflows },
          emails: { current: monthlyEmails, ...limits.emails, period: 'monthly' },
          sms: { current: monthlySMS, ...limits.sms, period: 'monthly' },
          totalMessages: messageCount,
          totalAppointments: appointmentCount,
        },
        tier: organization.subscriptionTier,
      },
    });
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch usage statistics' });
  }
};

/**
 * Helper function to get tier level for comparison
 */
function getTierLevel(tier: SubscriptionTier): number {
  const levels: Record<SubscriptionTier, number> = {
    FREE: 0,
    STARTER: 1,
    PROFESSIONAL: 2,
    ENTERPRISE: 3,
  };
  return levels[tier];
}
