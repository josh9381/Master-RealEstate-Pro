import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  settingsApi: {
    getComplianceSettings: vi.fn().mockResolvedValue({ data: {} }),
    updateComplianceSettings: vi.fn().mockResolvedValue({ data: {} }),
  },
  activitiesApi: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

import ComplianceSettings from '@/pages/settings/ComplianceSettings'

describe('ComplianceSettings', () => {
  it('renders without crashing', () => {
    renderWithProviders(<ComplianceSettings />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
