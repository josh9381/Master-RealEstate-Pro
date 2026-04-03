import { renderWithProviders } from './test-utils'

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  leadsApi: {
    importCSV: vi.fn().mockResolvedValue({ data: {} }),
    importPreview: vi.fn().mockResolvedValue({ data: {} }),
  },
  pipelinesApi: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

import LeadsImport from '@/pages/leads/LeadsImport'

describe('LeadsImport', () => {
  it('renders without crashing', () => {
    renderWithProviders(<LeadsImport />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
