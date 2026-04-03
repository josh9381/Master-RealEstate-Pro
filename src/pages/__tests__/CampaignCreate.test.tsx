import { screen } from '@testing-library/react'
import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))
vi.mock('@/lib/api', () => ({
  campaignsApi: { create: vi.fn().mockResolvedValue({}) },
  leadsApi: { list: vi.fn().mockResolvedValue({ leads: [], total: 0 }) },
  templatesApi: { list: vi.fn().mockResolvedValue({ templates: [] }) },
  segmentsApi: { list: vi.fn().mockResolvedValue({ segments: [] }) },
}))

import CampaignCreate from '@/pages/campaigns/CampaignCreate'

describe('CampaignCreate', () => {
  it('renders create new campaign heading', () => {
    renderWithProviders(<CampaignCreate />)
    expect(screen.getByText('Create New Campaign')).toBeInTheDocument()
  })
})
