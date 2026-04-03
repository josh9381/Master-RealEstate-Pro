import { renderWithProviders } from './test-utils'

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  callsApi: {
    getQueue: vi.fn().mockResolvedValue({ data: [] }),
    getCallHistory: vi.fn().mockResolvedValue({ data: [] }),
    getStats: vi.fn().mockResolvedValue({ data: {} }),
    initiateCall: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

vi.mock('@/lib/metricsCalculator', () => ({
  formatRate: (v: number) => `${v}%`,
}))

import CallCenter from '@/pages/communication/CallCenter'

describe('CallCenter', () => {
  it('renders without crashing', () => {
    renderWithProviders(<CallCenter />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
