import { screen } from '@testing-library/react'
import { renderWithProviders } from './test-utils'

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))
vi.mock('@/hooks/useConfirm', () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}))
vi.mock('@/lib/api', () => ({
  workflowsApi: {
    list: vi.fn().mockResolvedValue({ workflows: [] }),
    delete: vi.fn(),
  },
}))

import WorkflowsList from '@/pages/workflows/WorkflowsList'

describe('WorkflowsList', () => {
  it('renders workflows heading', () => {
    renderWithProviders(<WorkflowsList />)
    expect(screen.getByText('Workflows')).toBeInTheDocument()
  })
})
