import { SubscriptionTier } from '@prisma/client';

export interface PlanFeatures {
  name: string;
  price: number;
  billingPeriod: 'monthly' | 'annual';
  maxUsers: number | 'unlimited';
  maxLeads: number | 'unlimited';
  maxCampaigns: number | 'unlimited';
  maxWorkflows: number | 'unlimited';
  maxMonthlyEmails: number | 'unlimited';
  maxMonthlySMS: number | 'unlimited';
  features: string[];
  description: string;
}

/**
 * AI-specific plan limits (Phase 2)
 * Controls usage caps per subscription tier
 */
export interface AIPlanLimits {
  maxMonthlyAIMessages: number | 'unlimited';
  maxTokensPerRequest: number;
  maxContentGenerations: number | 'unlimited';
  maxComposeUses: number | 'unlimited';
  maxScoringRecalculations: number | 'unlimited';
  maxWebSearches: number | 'unlimited';
  chatHistoryDays: number | 'unlimited';
  aiRateLimit: number; // requests per minute
}

export const AI_PLAN_LIMITS: Record<SubscriptionTier, AIPlanLimits> = {
  FREE: {
    maxMonthlyAIMessages: 50,
    maxTokensPerRequest: 500,
    maxContentGenerations: 10,
    maxComposeUses: 20,
    maxScoringRecalculations: 5,
    maxWebSearches: 10,
    chatHistoryDays: 7,
    aiRateLimit: 10,
  },
  STARTER: {
    maxMonthlyAIMessages: 500,
    maxTokensPerRequest: 1000,
    maxContentGenerations: 100,
    maxComposeUses: 200,
    maxScoringRecalculations: 50,
    maxWebSearches: 100,
    chatHistoryDays: 30,
    aiRateLimit: 30,
  },
  PROFESSIONAL: {
    maxMonthlyAIMessages: 5000,
    maxTokensPerRequest: 2000,
    maxContentGenerations: 1000,
    maxComposeUses: 2000,
    maxScoringRecalculations: 'unlimited',
    maxWebSearches: 1000,
    chatHistoryDays: 90,
    aiRateLimit: 60,
  },
  ENTERPRISE: {
    maxMonthlyAIMessages: 'unlimited',
    maxTokensPerRequest: 4000,
    maxContentGenerations: 'unlimited',
    maxComposeUses: 'unlimited',
    maxScoringRecalculations: 'unlimited',
    maxWebSearches: 'unlimited',
    chatHistoryDays: 'unlimited',
    aiRateLimit: 100,
  },
};

export const PLAN_FEATURES: Record<SubscriptionTier, PlanFeatures> = {
  FREE: {
    name: 'Free',
    price: 0,
    billingPeriod: 'monthly',
    maxUsers: 1,
    maxLeads: 100,
    maxCampaigns: 5,
    maxWorkflows: 3,
    maxMonthlyEmails: 100,
    maxMonthlySMS: 10,
    features: [
      'Basic lead management',
      'Basic analytics',
      'Email campaigns',
      'Up to 100 leads',
      '5 campaigns',
      '3 workflows',
      'Email support',
    ],
    description: 'Perfect for getting started',
  },
  STARTER: {
    name: 'Starter',
    price: 29,
    billingPeriod: 'monthly',
    maxUsers: 5,
    maxLeads: 1000,
    maxCampaigns: 25,
    maxWorkflows: 10,
    maxMonthlyEmails: 5000,
    maxMonthlySMS: 500,
    features: [
      'Everything in Free',
      'Up to 5 team members',
      '1,000 leads',
      '25 campaigns',
      '10 workflows',
      'SMS campaigns',
      'Marketing automation',
      'Advanced analytics',
      'Priority email support',
    ],
    description: 'Great for small teams',
  },
  PROFESSIONAL: {
    name: 'Professional',
    price: 99,
    billingPeriod: 'monthly',
    maxUsers: 10,
    maxLeads: 'unlimited',
    maxCampaigns: 'unlimited',
    maxWorkflows: 'unlimited',
    maxMonthlyEmails: 50000,
    maxMonthlySMS: 5000,
    features: [
      'Everything in Starter',
      'Up to 10 team members',
      'Unlimited leads',
      'Unlimited campaigns',
      'Unlimited workflows',
      'Advanced automation',
      'Custom integrations',
      'API access',
      'Priority support',
      'Team collaboration',
    ],
    description: 'Best for growing businesses',
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 299,
    billingPeriod: 'monthly',
    maxUsers: 'unlimited',
    maxLeads: 'unlimited',
    maxCampaigns: 'unlimited',
    maxWorkflows: 'unlimited',
    maxMonthlyEmails: 'unlimited',
    maxMonthlySMS: 'unlimited',
    features: [
      'Everything in Professional',
      'Unlimited team members',
      'Unlimited everything',
      'Dedicated account manager',
      'Custom onboarding',
      'Advanced security',
      'SLA guarantee',
      'Phone support',
      'Custom integrations',
      'White-label options',
    ],
    description: 'For large organizations',
  },
};

/**
 * Get plan features for a subscription tier
 */
export function getPlanFeatures(tier: SubscriptionTier): PlanFeatures {
  return PLAN_FEATURES[tier];
}

/**
 * Check if a plan has access to a specific feature
 */
export function checkFeatureAccess(tier: SubscriptionTier, feature: string): boolean {
  const plan = PLAN_FEATURES[tier];
  return plan.features.some(f => 
    f.toLowerCase().includes(feature.toLowerCase())
  );
}

/**
 * Check if current usage is at or over limit
 */
export function checkUsageLimit(
  tier: SubscriptionTier,
  resource: 'users' | 'leads' | 'campaigns' | 'workflows' | 'emails' | 'sms',
  currentCount: number
): { isAtLimit: boolean; limit: number | 'unlimited'; remaining: number | 'unlimited' } {
  const plan = PLAN_FEATURES[tier];
  
  let limit: number | 'unlimited';
  switch (resource) {
    case 'users':
      limit = plan.maxUsers;
      break;
    case 'leads':
      limit = plan.maxLeads;
      break;
    case 'campaigns':
      limit = plan.maxCampaigns;
      break;
    case 'workflows':
      limit = plan.maxWorkflows;
      break;
    case 'emails':
      limit = plan.maxMonthlyEmails;
      break;
    case 'sms':
      limit = plan.maxMonthlySMS;
      break;
    default:
      limit = 0;
  }

  if (limit === 'unlimited') {
    return {
      isAtLimit: false,
      limit: 'unlimited',
      remaining: 'unlimited',
    };
  }

  const isAtLimit = currentCount >= limit;
  const remaining = Math.max(0, limit - currentCount);

  return {
    isAtLimit,
    limit,
    remaining,
  };
}

/**
 * Get upgrade message for when limit is reached
 */
export function getUpgradeMessage(
  currentTier: SubscriptionTier,
  resource: string
): string {
  const tierOrder: SubscriptionTier[] = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
  const currentIndex = tierOrder.indexOf(currentTier);
  
  if (currentIndex === tierOrder.length - 1) {
    return `You're on the highest plan. Contact support for custom limits.`;
  }

  const nextTier = tierOrder[currentIndex + 1];
  const nextPlan = PLAN_FEATURES[nextTier];

  return `Upgrade to ${nextPlan.name} ($${nextPlan.price}/mo) to get more ${resource}.`;
}

/**
 * Calculate trial days remaining
 */
export function getTrialDaysRemaining(trialEndsAt: Date | null): number | null {
  if (!trialEndsAt) return null;

  const now = new Date();
  const diff = trialEndsAt.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  return Math.max(0, days);
}
