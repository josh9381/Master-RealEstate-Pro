import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  leadsApi: {
    getDuplicates: vi.fn().mockResolvedValue({ data: [] }),
    merge: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

import LeadsMerge from '@/pages/leads/LeadsMerge'

describe('LeadsMerge', () => {
  it('renders without crashing', () => {
    renderWithProviders(<LeadsMerge />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
