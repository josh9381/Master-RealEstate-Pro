/**
 * Shared plan configuration for billing pages.
 * Source of truth: backend/src/config/subscriptions.ts (PLAN_FEATURES)
 * Keep in sync when plans change.
 */
export interface PlanDisplay {
  id: string;
  name: string;
  price: number;
  interval: string;
  description: string;
  features: string[];
}

export const PLANS: PlanDisplay[] = [
  {
    id: 'STARTER',
    name: 'Starter',
    price: 49,
    interval: 'month',
    description: 'Perfect for solo agents getting started',
    features: [
      'Up to 500 leads',
      '1 pipeline',
      '1,000 emails/mo',
      '100 SMS/mo',
      '200 AI messages/mo',
      'Email support',
    ],
  },
  {
    id: 'PROFESSIONAL',
    name: 'Professional',
    price: 119,
    interval: 'month',
    description: 'For productive agents scaling their business',
    features: [
      'Up to 5,000 leads',
      '5 pipelines',
      '10,000 emails/mo',
      '500 SMS/mo',
      '2,000 AI messages/mo',
      'Priority support',
    ],
  },
  {
    id: 'ELITE',
    name: 'Elite',
    price: 179,
    interval: 'month',
    description: 'For top-producing agents who want every edge',
    features: [
      'Unlimited leads',
      'Unlimited pipelines',
      '25,000 emails/mo',
      '2,000 SMS/mo',
      '5,000 AI messages/mo',
      'Advanced analytics',
    ],
  },
  {
    id: 'TEAM',
    name: 'Team',
    price: 799,
    interval: 'month',
    description: 'For teams and small brokerages',
    features: [
      'Everything in Elite',
      'Up to 10 users (+$59/extra)',
      '50,000 emails/mo',
      '5,000 SMS/mo',
      '10,000 AI messages/mo',
      'Team management',
    ],
  },
  {
    id: 'ENTERPRISE',
    name: 'Brokerage',
    price: 0,
    interval: 'month',
    description: 'For large brokerages with custom needs',
    features: [
      'Everything in Team',
      'Unlimited users',
      'Custom email/SMS volume',
      'Unlimited AI messages',
      'SSO / SAML',
      'Dedicated support',
    ],
  },
];
