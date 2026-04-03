/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(
    (selector?: any) => {
      const state = { user: { id: '1', name: 'Test User', email: 'test@test.com', role: 'admin', subscription: { plan: 'pro', status: 'active' } }, isAdmin: () => true, hasPermission: () => true, getSubscriptionTier: () => 'pro', isTrialActive: () => false }
      return selector ? selector(state) : state
    },
    { getState: () => ({ user: { id: '1', name: 'Test User', email: 'test@test.com', role: 'admin' }, isAdmin: () => true, getSubscriptionTier: () => 'pro' }) }
  ),
}))

vi.mock('@/lib/notificationSounds', () => ({
  getSoundSettings: vi.fn(() => ({ enabled: true, volume: 0.5, sound: 'default' })),
  saveSoundSettings: vi.fn(),
  playPreviewSound: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  settingsApi: {
    getNotificationSettings: vi.fn().mockResolvedValue({ data: {} }),
    updateNotificationSettings: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

import NotificationSettings from '@/pages/settings/NotificationSettings'

describe('NotificationSettings', () => {
  it('renders without crashing', () => {
    renderWithProviders(<NotificationSettings />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
