import { renderWithProviders } from './test-utils'

vi.mock('@/lib/api', () => ({
  goalsApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn().mockResolvedValue({ data: {} }),
    update: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({}),
  },
}))
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))
vi.mock('@/hooks/useConfirm', () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}))
vi.mock('@/lib/metricsCalculator', () => ({
  calcRate: vi.fn(() => 0),
  formatRate: vi.fn(() => '0%'),
  fmtMoney: vi.fn(() => '$0'),
  calcProgress: vi.fn(() => 0),
  calcRateClamped: vi.fn(() => 0),
}))

import GoalTracking from '@/pages/analytics/GoalTracking'

describe('GoalTracking', () => {
  it('renders without crashing', () => {
    renderWithProviders(<GoalTracking />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
