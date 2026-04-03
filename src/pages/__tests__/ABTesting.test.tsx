import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))
vi.mock('@/services/abtestService', () => ({
  getABTests: vi.fn().mockResolvedValue([]),
  getABTestResults: vi.fn().mockResolvedValue({ results: [], analysis: null }),
  createABTest: vi.fn().mockResolvedValue({}),
  startABTest: vi.fn().mockResolvedValue({}),
  pauseABTest: vi.fn().mockResolvedValue({}),
  stopABTest: vi.fn().mockResolvedValue({}),
  deleteABTest: vi.fn().mockResolvedValue(undefined),
}))

import ABTesting from '@/pages/campaigns/ABTesting'

describe('ABTesting', () => {
  it('renders without crashing', () => {
    renderWithProviders(<ABTesting />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
