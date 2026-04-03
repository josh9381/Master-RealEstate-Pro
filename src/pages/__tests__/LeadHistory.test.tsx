import { renderWithProviders } from './test-utils'

vi.mock('@/lib/api', () => ({
  activitiesApi: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    getByLead: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

import LeadHistory from '@/pages/leads/LeadHistory'

describe('LeadHistory', () => {
  it('renders without crashing', () => {
    renderWithProviders(<LeadHistory />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
