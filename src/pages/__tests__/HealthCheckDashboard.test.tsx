import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  adminApi: {
    healthCheck: vi.fn().mockResolvedValue({ data: { services: [] } }),
  },
}))

vi.mock('@/lib/metricsCalculator', () => ({
  calcRate: vi.fn().mockReturnValue(0),
}))

import HealthCheckDashboard from '@/pages/admin/HealthCheckDashboard'

describe('HealthCheckDashboard', () => {
  it('renders without crashing', () => {
    renderWithProviders(<HealthCheckDashboard />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
