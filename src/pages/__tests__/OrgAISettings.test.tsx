/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderWithProviders } from './test-utils'

vi.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(
    (selector?: any) => {
      const state = { user: { id: '1', role: 'admin' }, isAdmin: () => true, hasPermission: () => true, getSubscriptionTier: () => 'pro', isTrialActive: () => false }
      return selector ? selector(state) : state
    },
    { getState: () => ({ user: { id: '1', role: 'admin' }, isAdmin: () => true, hasPermission: () => true, getSubscriptionTier: () => 'pro' }) }
  ),
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  aiApi: {
    getOrgSettings: vi.fn().mockResolvedValue({
      data: {
        useOwnAIKey: false,
        hasApiKey: false,
        openaiApiKeyMasked: null,
        openaiOrgId: null,
        aiSystemPrompt: null,
        aiDefaultTone: 'professional',
        aiDefaultModel: null,
        aiMaxTokensPerRequest: null,
        aiMonthlyTokenBudget: null,
        aiIndustryContext: null,
        budget: { warning: 0, caution: 0, hardLimit: 0, alertEnabled: false },
        subscriptionTier: 'pro',
        availableModels: [],
      },
    }),
    updateOrgSettings: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

import OrgAISettings from '@/pages/ai/OrgAISettings'

describe('OrgAISettings', () => {
  it('renders without crashing', () => {
    renderWithProviders(<OrgAISettings />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
