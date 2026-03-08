import { SubscriptionTier } from '@prisma/client';

export interface PlanFeatures {
  name: string;
  price: number;
  priceLabel: string; // Display string (e.g. "$49/mo" or "Contact Us")
  billingPeriod: 'monthly' | 'annual';
  trialDays: number;
  maxUsers: number | 'unlimited';
  maxLeads: number | 'unlimited';
  maxPipelines: number | 'unlimited';
  maxCampaigns: number | 'unlimited';
  maxWorkflows: number | 'unlimited';
  maxMonthlyEmails: number | 'unlimited';
  maxMonthlySMS: number | 'unlimited';
  extraUserPrice?: number; // Per extra user cost (Team plan)
  features: string[];
  description: string;
}

export interface AIPlanLimits {
  maxMonthlyAIMessages: number | 'unlimited';
  maxTokensPerRequest: number;
  maxContentGenerations: number | 'unlimited';
  maxComposeUses: number | 'unlimited';
  maxScoringRecalculations: number | 'unlimited';
  maxWebSearches: number | 'unlimited';
  chatHistoryDays: number | 'unlimited';
  aiRateLimit: number; // requests per minute
  allowedModels: string[]; // Which AI models this tier can access
}

export const AI_PLAN_LIMITS: Record<SubscriptionTier, AIPlanLimits> = {
  STARTER: {
    maxMonthlyAIMessages: 200,
    maxTokensPerRequest: 500,
    maxContentGenerations: 50,
    maxComposeUses: 100,
    maxScoringRecalculations: 10,
    maxWebSearches: 20,
    chatHistoryDays: 7,
    aiRateLimit: 10,
    allowedModels: ['gpt-5-nano'],
  },
  PROFESSIONAL: {
    maxMonthlyAIMessages: 2000,
    maxTokensPerRequest: 2000,
    maxContentGenerations: 500,
    maxComposeUses: 1000,
    maxScoringRecalculations: 'unlimited',
    maxWebSearches: 500,
    chatHistoryDays: 90,
    aiRateLimit: 60,
    allowedModels: ['gpt-5.1', 'gpt-5-mini', 'gpt-5-nano', 'gpt-5.2', 'gpt-5.2-pro', 'gpt-4o-mini'],
  },
  ELITE: {
    maxMonthlyAIMessages: 5000,
    maxTokensPerRequest: 4000,
    maxContentGenerations: 2000,
    maxComposeUses: 5000,
    maxScoringRecalculations: 'unlimited',
    maxWebSearches: 2000,
    chatHistoryDays: 'unlimited',
    aiRateLimit: 100,
    allowedModels: ['gpt-5.1', 'gpt-5-mini', 'gpt-5-nano', 'gpt-5.2', 'gpt-5.2-pro', 'gpt-4o-mini'],
  },
  TEAM: {
    maxMonthlyAIMessages: 10000,
    maxTokensPerRequest: 4000,
    maxContentGenerations: 5000,
    maxComposeUses: 10000,
    maxScoringRecalculations: 'unlimited',
    maxWebSearches: 5000,
    chatHistoryDays: 'unlimited',
    aiRateLimit: 100,
    allowedModels: ['gpt-5.1', 'gpt-5-mini', 'gpt-5-nano', 'gpt-5.2', 'gpt-5.2-pro', 'gpt-4o-mini'],
  },
  ENTERPRISE: {
    maxMonthlyAIMessages: 'unlimited',
    maxTokensPerRequest: 4000,
    maxContentGenerations: 'unlimited',
    maxComposeUses: 'unlimited',
    maxScoringRecalculations: 'unlimited',
    maxWebSearches: 'unlimited',
    chatHistoryDays: 'unlimited',
    aiRateLimit: 200,
    allowedModels: ['gpt-5.1', 'gpt-5-mini', 'gpt-5-nano', 'gpt-5.2', 'gpt-5.2-pro', 'gpt-4o-mini'],
  },
};

export const PLAN_FEATURES: Record<SubscriptionTier, PlanFeatures> = {
  STARTER: {
    name: 'Starter',
    price: 49,
    priceLabel: '$49/mo',
    billingPeriod: 'monthly',
    trialDays: 7,
    maxUsers: 1,
    maxLeads: 500,
    maxPipelines: 1,
    maxCampaigns: 10,
    maxWorkflows: 5,
    maxMonthlyEmails: 1000,
    maxMonthlySMS: 100,
    features: [
      'Up to 500 leads',
      '1 pipeline',
      '1,000 emails/mo',
      '100 SMS/mo',
      '200 AI messages/mo (nano model)',
      'Basic AI assistant',
      'Single user',
      'Core CRM features',
      'Email campaigns',
      'Basic analytics',
    ],
    description: 'Perfect for solo agents getting started',
  },
  PROFESSIONAL: {
    name: 'Professional',
    price: 119,
    priceLabel: '$119/mo',
    billingPeriod: 'monthly',
    trialDays: 7,
    maxUsers: 1,
    maxLeads: 5000,
    maxPipelines: 5,
    maxCampaigns: 'unlimited',
    maxWorkflows: 'unlimited',
    maxMonthlyEmails: 10000,
    maxMonthlySMS: 500,
    features: [
      'Up to 5,000 leads',
      '5 pipelines',
      '10,000 emails/mo',
      '500 SMS/mo',
      '2,000 AI messages/mo (all models)',
      'Full AI assistant',
      'Workflows & automation',
      'A/B testing',
      'Custom reports',
      'Priority support',
    ],
    description: 'For productive agents scaling their business',
  },
  ELITE: {
    name: 'Elite',
    price: 179,
    priceLabel: '$179/mo',
    billingPeriod: 'monthly',
    trialDays: 7,
    maxUsers: 1,
    maxLeads: 'unlimited',
    maxPipelines: 'unlimited',
    maxCampaigns: 'unlimited',
    maxWorkflows: 'unlimited',
    maxMonthlyEmails: 25000,
    maxMonthlySMS: 2000,
    features: [
      'Unlimited leads',
      'Unlimited pipelines',
      '25,000 emails/mo',
      '2,000 SMS/mo',
      '5,000 AI messages/mo (priority)',
      'Priority AI processing',
      'Cold call hub',
      'Send-time optimization',
      'Advanced analytics',
      'Attribution reports',
    ],
    description: 'For top-producing agents who want every edge',
  },
  TEAM: {
    name: 'Team',
    price: 799,
    priceLabel: '$799/mo',
    billingPeriod: 'monthly',
    trialDays: 7,
    maxUsers: 10,
    maxLeads: 'unlimited',
    maxPipelines: 'unlimited',
    maxCampaigns: 'unlimited',
    maxWorkflows: 'unlimited',
    maxMonthlyEmails: 50000,
    maxMonthlySMS: 5000,
    extraUserPrice: 59,
    features: [
      'Everything in Elite',
      'Up to 10 users (+$59/extra)',
      '50,000 emails/mo',
      '5,000 SMS/mo',
      '10,000 AI messages/mo',
      'Team management',
      'Shared pipelines',
      'Lead assignment & routing',
      'Admin panel',
      'Team analytics',
    ],
    description: 'For teams and small brokerages',
  },
  ENTERPRISE: {
    name: 'Brokerage',
    price: 0, // Contact us
    priceLabel: 'Contact Us',
    billingPeriod: 'monthly',
    trialDays: 0,
    maxUsers: 'unlimited',
    maxLeads: 'unlimited',
    maxPipelines: 'unlimited',
    maxCampaigns: 'unlimited',
    maxWorkflows: 'unlimited',
    maxMonthlyEmails: 'unlimited',
    maxMonthlySMS: 'unlimited',
    features: [
      'Everything in Team',
      'Unlimited users',
      'Custom email/SMS volume',
      'Unlimited AI messages',
      'SSO / SAML',
      'Dedicated support',
      'Custom onboarding',
      'Volume discounts',
      'SLA guarantee',
      'White-label options',
    ],
    description: 'For large brokerages with custom needs',
  },
};

/** Stripe Price IDs — set these in your environment variables */
export const STRIPE_PRICE_IDS: Record<Exclude<SubscriptionTier, 'ENTERPRISE'>, string> = {
  STARTER: process.env.STRIPE_PRICE_STARTER || '',
  PROFESSIONAL: process.env.STRIPE_PRICE_PROFESSIONAL || '',
  ELITE: process.env.STRIPE_PRICE_ELITE || '',
  TEAM: process.env.STRIPE_PRICE_TEAM || '',
};

export function getPlanFeatures(tier: SubscriptionTier): PlanFeatures {
  return PLAN_FEATURES[tier];
}

export function checkFeatureAccess(tier: SubscriptionTier, feature: string): boolean {
  const plan = PLAN_FEATURES[tier];
  return plan.features.some(f => 
    f.toLowerCase().includes(feature.toLowerCase())
  );
}

export function checkUsageLimit(
  tier: SubscriptionTier,
  resource: 'users' | 'leads' | 'pipelines' | 'campaigns' | 'workflows' | 'emails' | 'sms',
  currentCount: number
): { isAtLimit: boolean; limit: number | 'unlimited'; remaining: number | 'unlimited' } {
  const plan = PLAN_FEATURES[tier];
  
  let limit: number | 'unlimited';
  switch (resource) {
    case 'users': limit = plan.maxUsers; break;
    case 'leads': limit = plan.maxLeads; break;
    case 'pipelines': limit = plan.maxPipelines; break;
    case 'campaigns': limit = plan.maxCampaigns; break;
    case 'workflows': limit = plan.maxWorkflows; break;
    case 'emails': limit = plan.maxMonthlyEmails; break;
    case 'sms': limit = plan.maxMonthlySMS; break;
    default: limit = 0;
  }

  if (limit === 'unlimited') {
    return { isAtLimit: false, limit: 'unlimited', remaining: 'unlimited' };
  }

  const isAtLimit = currentCount >= limit;
  const remaining = Math.max(0, limit - currentCount);
  return { isAtLimit, limit, remaining };
}

/** Tier ordering for comparison (lowest to highest) */
const TIER_ORDER: SubscriptionTier[] = ['STARTER', 'PROFESSIONAL', 'ELITE', 'TEAM', 'ENTERPRISE'];

export function getTierLevel(tier: SubscriptionTier): number {
  return TIER_ORDER.indexOf(tier);
}

export function getUpgradeMessage(
  currentTier: SubscriptionTier,
  resource: string
): string {
  const currentIndex = TIER_ORDER.indexOf(currentTier);
  
  if (currentIndex === TIER_ORDER.length - 1) {
    return `You're on the highest plan. Contact support for custom limits.`;
  }

  const nextTier = TIER_ORDER[currentIndex + 1];
  const nextPlan = PLAN_FEATURES[nextTier];

  return `Upgrade to ${nextPlan.name} (${nextPlan.priceLabel}) to get more ${resource}.`;
}

export function getTrialDaysRemaining(trialEndsAt: Date | null): number | null {
  if (!trialEndsAt) return null;
  const now = new Date();
  const diff = trialEndsAt.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}
