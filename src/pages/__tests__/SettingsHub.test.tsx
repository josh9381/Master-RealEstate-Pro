import { renderWithProviders } from './test-utils'

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ user: { id: '1', role: 'admin', organizationId: 'org1' } }),
}))
vi.mock('@/lib/api', () => ({
  settingsApi: {
    getProfile: vi.fn().mockResolvedValue({}),
    getSecurity: vi.fn().mockResolvedValue({}),
    getEmailConfig: vi.fn().mockResolvedValue({}),
    getSmsConfig: vi.fn().mockResolvedValue({}),
    getBusiness: vi.fn().mockResolvedValue({}),
  },
}))

import SettingsHub from '@/pages/settings/SettingsHub'

describe('SettingsHub', () => {
  it('renders without crashing', () => {
    renderWithProviders(<SettingsHub />)
    expect(document.body.textContent).toBeTruthy()
  })
})
