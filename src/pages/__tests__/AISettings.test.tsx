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
    getPreferences: vi.fn().mockResolvedValue({
      data: {
        composer: { defaultTone: 'professional', defaultLength: 'medium', defaultCTA: true, defaultPersonalization: 'balanced', autoGenerate: false, showAdvanced: false },
        profile: { brandGuidelines: null, businessContext: null, defaultEmailStructure: 'standard', propertyDescStyle: 'detailed', socialMediaPrefs: null, enhancementLevel: 'moderate' },
        featureToggles: { enableLeadScoring: true, enableCompose: true, enableContentGen: true, enableMessageEnhancer: true, enableTemplateAI: true, enableInsights: true },
        chatbot: { tone: 'professional', autoSuggestActions: true, enableProactive: false, preferredContactTime: null, aiInsightsFrequency: 'daily' },
      },
    }),
    updatePreferences: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

vi.mock('@/lib/metricsCalculator', () => ({
  calcProgress: vi.fn().mockReturnValue(0),
}))

import AISettings from '@/pages/ai/AISettings'

describe('AISettings', () => {
  it('renders without crashing', () => {
    renderWithProviders(<AISettings />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
