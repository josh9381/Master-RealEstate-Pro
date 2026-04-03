import { renderWithProviders } from './test-utils'

vi.mock('@/lib/api', () => ({
  supportApi: {
    getTickets: vi.fn().mockResolvedValue({ data: [] }),
    getTicket: vi.fn().mockResolvedValue({ data: null }),
    createTicket: vi.fn().mockResolvedValue({ data: {} }),
    addMessage: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

import SupportTicketSystem from '@/pages/help/SupportTicketSystem'

describe('SupportTicketSystem', () => {
  it('renders without crashing', () => {
    renderWithProviders(<SupportTicketSystem />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
