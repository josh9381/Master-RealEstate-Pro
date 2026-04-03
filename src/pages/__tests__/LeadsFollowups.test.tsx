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
  leadsApi: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
  },
  tasksApi: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    update: vi.fn().mockResolvedValue({ data: {} }),
    create: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

import LeadsFollowups from '@/pages/leads/LeadsFollowups'

describe('LeadsFollowups', () => {
  it('renders without crashing', () => {
    renderWithProviders(<LeadsFollowups />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
