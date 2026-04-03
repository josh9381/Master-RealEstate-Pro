import { screen } from '@testing-library/react'
import { renderWithProviders } from './test-utils'

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))
vi.mock('@/lib/api', () => ({
  activitiesApi: { list: vi.fn().mockResolvedValue({ activities: [], total: 0 }) },
  leadsApi: { list: vi.fn().mockResolvedValue({ leads: [] }) },
}))

import ActivityPage from '@/pages/activity/ActivityPage'

describe('ActivityPage', () => {
  it('renders activity feed heading', () => {
    renderWithProviders(<ActivityPage />)
    expect(screen.getByText('Activity Feed')).toBeInTheDocument()
  })
})
