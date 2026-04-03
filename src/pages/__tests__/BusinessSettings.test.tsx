import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  settingsApi: {
    getBusinessSettings: vi.fn().mockResolvedValue({ data: {} }),
    updateBusinessSettings: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

import BusinessSettings from '@/pages/settings/BusinessSettings'

describe('BusinessSettings', () => {
  it('renders without crashing', () => {
    renderWithProviders(<BusinessSettings />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
