import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  teamsApi: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    invite: vi.fn().mockResolvedValue({ data: {} }),
    update: vi.fn().mockResolvedValue({ data: {} }),
    remove: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

import TeamManagement from '@/pages/settings/TeamManagement'

describe('TeamManagement', () => {
  it('renders without crashing', () => {
    renderWithProviders(<TeamManagement />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
