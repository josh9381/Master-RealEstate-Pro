/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderWithProviders } from './test-utils'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/hooks/useConfirm', () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(
    (selector?: any) => {
      const state = { user: { id: '1', name: 'Test User', email: 'test@test.com', role: 'admin', subscription: { plan: 'pro', status: 'active' } }, isAdmin: () => true, hasPermission: () => true, getSubscriptionTier: () => 'pro', isTrialActive: () => false, clearAuth: vi.fn() }
      return selector ? selector(state) : state
    },
    { getState: () => ({ user: { id: '1', name: 'Test User', email: 'test@test.com', role: 'admin' }, isAdmin: () => true, getSubscriptionTier: () => 'pro', clearAuth: vi.fn() }) }
  ),
}))

vi.mock('@/components/auth/PasswordStrengthIndicator', () => ({
  PasswordStrengthIndicator: () => <div />,
}))

vi.mock('@/components/auth/passwordUtils', () => ({
  isPasswordStrong: vi.fn(() => true),
}))

vi.mock('@/lib/api', () => ({
  settingsApi: {
    getSecuritySettings: vi.fn().mockResolvedValue({ data: {} }),
    updateSecuritySettings: vi.fn().mockResolvedValue({ data: {} }),
  },
  authApi: {
    changePassword: vi.fn().mockResolvedValue({ data: {} }),
    getSessions: vi.fn().mockResolvedValue({ data: [] }),
    revokeSession: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

import SecuritySettings from '@/pages/settings/SecuritySettings'

describe('SecuritySettings', () => {
  it('renders without crashing', () => {
    renderWithProviders(<SecuritySettings />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
