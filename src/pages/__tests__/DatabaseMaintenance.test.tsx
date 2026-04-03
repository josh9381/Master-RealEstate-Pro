import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/hooks/useConfirm', () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/api', () => ({
  adminApi: {
    getDbStats: vi.fn().mockResolvedValue({ data: {} }),
    runMaintenance: vi.fn().mockResolvedValue({ history: [] }),
  },
}))

import DatabaseMaintenance from '@/pages/admin/DatabaseMaintenance'

describe('DatabaseMaintenance', () => {
  it('renders without crashing', () => {
    renderWithProviders(<DatabaseMaintenance />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
