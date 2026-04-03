import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(
    () => ({ user: { id: '1', role: 'admin' }, isAdmin: () => true, isManager: () => true }),
    { getState: () => ({ user: { id: '1', role: 'admin' }, isAdmin: () => true, isManager: () => true }) }
  ),
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { plans: [], currentTier: 'STARTER' } }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

import Subscription from '@/pages/admin/Subscription'

describe('Subscription', () => {
  it('renders without crashing', () => {
    renderWithProviders(<Subscription />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
