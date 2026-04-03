import { renderWithProviders } from './test-utils'

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  settingsApi: {
    getBusinessSettings: vi.fn().mockResolvedValue({ data: {} }),
    updateBusinessSettings: vi.fn().mockResolvedValue({ data: {} }),
    testConnection: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

import ServiceConfiguration from '@/pages/settings/ServiceConfiguration'

describe('ServiceConfiguration', () => {
  it('renders without crashing', () => {
    renderWithProviders(<ServiceConfiguration />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
