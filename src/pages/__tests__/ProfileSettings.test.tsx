import { renderWithProviders } from './test-utils'

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))
vi.mock('@/lib/api', () => ({
  settingsApi: {
    getProfile: vi.fn().mockResolvedValue({ firstName: 'Test', lastName: 'User', email: 'test@test.com' }),
    updateProfile: vi.fn().mockResolvedValue({}),
  },
}))

import ProfileSettings from '@/pages/settings/ProfileSettings'

describe('ProfileSettings', () => {
  it('renders without crashing', () => {
    renderWithProviders(<ProfileSettings />)
    // Shows loading spinner initially
    expect(document.body.textContent).toBeTruthy()
  })
})
