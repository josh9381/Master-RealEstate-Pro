import { renderWithProviders } from './test-utils'

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  exportApi: {
    exportData: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

import DataExportWizard from '@/pages/admin/DataExportWizard'

describe('DataExportWizard', () => {
  it('renders without crashing', () => {
    renderWithProviders(<DataExportWizard />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
