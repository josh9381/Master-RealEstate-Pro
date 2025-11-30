import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SUBSCRIPTION_LIMITS = {
  FREE: {
    maxUsers: 1,
    maxLeads: 100,
    maxCampaigns: null,
    maxWorkflows: null,
    emailsPerMonth: 1000,
    smsPerMonth: 100,
  },
  STARTER: {
    maxUsers: 5,
    maxLeads: 1000,
    maxCampaigns: 10,
    maxWorkflows: 5,
    emailsPerMonth: 10000,
    smsPerMonth: 1000,
  },
  PROFESSIONAL: {
    maxUsers: 10,
    maxLeads: null,
    maxCampaigns: null,
    maxWorkflows: 20,
    emailsPerMonth: null,
    smsPerMonth: null,
  },
  ENTERPRISE: {
    maxUsers: null,
    maxLeads: null,
    maxCampaigns: null,
    maxWorkflows: null,
    emailsPerMonth: null,
    smsPerMonth: null,
  },
};

/**
 * Get current subscription and usage
 */
export const getCurrentSubscription = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    // Get organization subscription fields
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        subscriptionId: true,
        subscriptionTier: true,
        trialEndsAt: true,
      },
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get current usage
    const [userCount, leadCount, campaignCount, workflowCount] = await Promise.all([
      prisma.user.count({ where: { organizationId } }),
      prisma.lead.count({ where: { organizationId } }),
      prisma.campaign.count({ where: { organizationId } }),
      prisma.workflow.count({ where: { organizationId } }),
    ]);

    // Get this month's email and SMS usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [emailCount, smsCount] = await Promise.all([
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

    const tier = (organization.subscriptionTier as keyof typeof SUBSCRIPTION_LIMITS) || 'FREE';
    const limits = SUBSCRIPTION_LIMITS[tier];

    // Map tier to plan details
    const planDetails = {
      FREE: { name: 'Free', price: 0 },
      STARTER: { name: 'Starter', price: 49 },
      PROFESSIONAL: { name: 'Professional', price: 149 },
      ENTERPRISE: { name: 'Enterprise', price: 499 },
    };

    const plan = planDetails[tier];

    res.json({
      currentPlan: {
        tier: organization.subscriptionTier || 'FREE',
        name: plan.name,
        price: plan.price,
      },
      subscription: {
        tier: organization.subscriptionTier,
        status: organization.subscriptionId ? 'ACTIVE' : 'INACTIVE',
        trialEndsAt: organization.trialEndsAt,
        currentPeriodEnd: null,
      },
      usage: {
        users: { current: userCount, limit: limits.maxUsers },
        leads: { current: leadCount, limit: limits.maxLeads },
        campaigns: { current: campaignCount, limit: limits.maxCampaigns },
        workflows: { current: workflowCount, limit: limits.maxWorkflows },
        emailsPerMonth: { current: emailCount, limit: limits.emailsPerMonth },
        smsPerMonth: { current: smsCount, limit: limits.smsPerMonth },
      },
      trialEndsAt: organization.trialEndsAt,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
};

/**
 * Change subscription plan
 */
export const changePlan = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { tier } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    if (!['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        subscriptionId: true,
        subscriptionTier: true,
        trialEndsAt: true,
      },
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Update organization subscription tier
    const updatedOrg = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        subscriptionTier: tier,
        trialEndsAt: tier !== 'FREE' && organization.subscriptionTier === 'FREE' ? null : organization.trialEndsAt,
      },
      select: {
        subscriptionTier: true,
        subscriptionId: true,
        trialEndsAt: true,
      },
    });

    res.json({
      subscription: {
        tier: updatedOrg.subscriptionTier,
        status: updatedOrg.subscriptionId ? 'ACTIVE' : 'INACTIVE',
        currentPeriodEnd: null,
        trialEndsAt: updatedOrg.trialEndsAt,
      },
    });
  } catch (error) {
    console.error('Error changing plan:', error);
    res.status(500).json({ error: 'Failed to change plan' });
  }
};

/**
 * Get available plans
 */
export const getPlans = async (_req: Request, res: Response) => {
  try {
    const plans = [
      {
        tier: 'FREE',
        name: 'Free',
        description: 'Perfect for getting started',
        price: 0,
        billingPeriod: 'month',
        features: {
          ...SUBSCRIPTION_LIMITS.FREE,
          features: [
            'Basic lead management',
            'Email support',
            '1 GB storage',
            'Up to 1,000 emails/month',
            'Up to 100 SMS/month'
          ]
        },
      },
      {
        tier: 'STARTER',
        name: 'Starter',
        description: 'For growing teams',
        price: 49,
        billingPeriod: 'month',
        features: {
          ...SUBSCRIPTION_LIMITS.STARTER,
          features: [
            'Advanced lead management',
            'Up to 10 campaigns',
            '5 workflow automations',
            'Priority email support',
            '10 GB storage',
            'Up to 10,000 emails/month',
            'Up to 1,000 SMS/month'
          ]
        },
      },
      {
        tier: 'PROFESSIONAL',
        name: 'Professional',
        description: 'For established businesses',
        price: 149,
        billingPeriod: 'month',
        features: {
          ...SUBSCRIPTION_LIMITS.PROFESSIONAL,
          features: [
            'Unlimited leads & campaigns',
            '20 workflow automations',
            'Advanced analytics & reporting',
            'Priority phone & email support',
            '100 GB storage',
            'Unlimited emails/month',
            'Unlimited SMS/month',
            'Custom integrations'
          ]
        },
      },
      {
        tier: 'ENTERPRISE',
        name: 'Enterprise',
        description: 'For large organizations',
        price: 499,
        billingPeriod: 'month',
        features: {
          ...SUBSCRIPTION_LIMITS.ENTERPRISE,
          features: [
            'Everything in Professional',
            'Unlimited workflow automations',
            'Dedicated account manager',
            '24/7 priority support',
            'Unlimited storage',
            'Custom SLA',
            'White-label options',
            'Advanced security features',
            'API access & custom integrations'
          ]
        },
      },
    ];

    res.json({ plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
};
