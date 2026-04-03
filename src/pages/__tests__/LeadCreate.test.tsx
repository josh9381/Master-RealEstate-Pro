import { screen } from '@testing-library/react'
import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))
vi.mock('@/hooks/useConfirm', () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}))
vi.mock('@/lib/api', () => ({
  leadsApi: { create: vi.fn().mockResolvedValue({}), list: vi.fn().mockResolvedValue({ leads: [] }) },
  usersApi: { listTeam: vi.fn().mockResolvedValue({ users: [] }) },
}))

import LeadCreate from '@/pages/leads/LeadCreate'

describe('LeadCreate', () => {
  it('renders create new lead heading', () => {
    renderWithProviders(<LeadCreate />)
    expect(screen.getByText('Create New Lead')).toBeInTheDocument()
  })
})
