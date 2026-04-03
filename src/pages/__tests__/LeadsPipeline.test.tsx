import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/metricsCalculator', () => ({
  fmtMoney: vi.fn(() => '$0'),
  calcRate: vi.fn(() => 0),
  formatRate: vi.fn(() => '0%'),
  calcProgress: vi.fn(() => 0),
  calcRateClamped: vi.fn(() => 0),
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/hooks/useConfirm', () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/api', () => ({
  pipelinesApi: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn().mockResolvedValue({ data: {} }),
    update: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
  leadsApi: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    update: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

vi.mock('@/components/leads/PipelineManager', () => ({
  PipelineManager: () => <div />,
}))

import LeadsPipeline from '@/pages/leads/LeadsPipeline'

describe('LeadsPipeline', () => {
  it('renders without crashing', () => {
    renderWithProviders(<LeadsPipeline />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
