import { screen } from '@testing-library/react'
import { renderWithProviders } from './test-utils'

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))
vi.mock('@/hooks/useConfirm', () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}))
vi.mock('@/lib/api', () => ({
  appointmentsApi: {
    list: vi.fn().mockResolvedValue({ appointments: [] }),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

import CalendarPage from '@/pages/calendar/CalendarPage'

describe('CalendarPage', () => {
  it('renders calendar heading', () => {
    renderWithProviders(<CalendarPage />)
    expect(screen.getByText('Calendar')).toBeInTheDocument()
  })
})
