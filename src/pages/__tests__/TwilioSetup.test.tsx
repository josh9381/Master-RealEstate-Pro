import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/hooks/useConfirm', () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/api', () => ({
  settingsApi: {
    getTwilioConfig: vi.fn().mockResolvedValue({ data: {} }),
    updateTwilioConfig: vi.fn().mockResolvedValue({ data: {} }),
    testTwilioConnection: vi.fn().mockResolvedValue({ data: {} }),
  },
  messagesApi: {
    getStats: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

import TwilioSetup from '@/pages/settings/TwilioSetup'

describe('TwilioSetup', () => {
  it('renders without crashing', () => {
    renderWithProviders(<TwilioSetup />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
