import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/lib/metricsCalculator', () => ({
  calcDeliveryRate: vi.fn(() => 0),
  calcOpenRateByDelivered: vi.fn(() => 0),
  calcBounceRate: vi.fn(() => 0),
  formatRate: vi.fn(() => '0%'),
  calcRate: vi.fn(() => 0),
  fmtMoney: vi.fn(() => '$0'),
}))

vi.mock('@/lib/api', () => ({
  settingsApi: {
    getEmailConfig: vi.fn().mockResolvedValue({ data: {} }),
    updateEmailConfig: vi.fn().mockResolvedValue({ data: {} }),
    testEmailConnection: vi.fn().mockResolvedValue({ data: {} }),
  },
  messagesApi: {
    getStats: vi.fn().mockResolvedValue({ data: {} }),
  },
  deliverabilityApi: {
    getStats: vi.fn().mockResolvedValue({ data: {} }),
    getSuppressed: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

import EmailConfiguration from '@/pages/settings/EmailConfiguration'

describe('EmailConfiguration', () => {
  it('renders without crashing', () => {
    renderWithProviders(<EmailConfiguration />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
