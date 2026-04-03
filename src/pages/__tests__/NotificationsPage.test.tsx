import { screen } from '@testing-library/react'
import { renderWithProviders } from './test-utils'

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))
vi.mock('@/lib/api', () => ({
  notificationsApi: {
    list: vi.fn().mockResolvedValue({ notifications: [], total: 0, totalPages: 0 }),
    markRead: vi.fn().mockResolvedValue({}),
    markAllRead: vi.fn().mockResolvedValue({}),
  },
}))

import { NotificationsPage } from '@/pages/notifications/NotificationsPage'

describe('NotificationsPage', () => {
  it('renders notifications heading', () => {
    renderWithProviders(<NotificationsPage />)
    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })
})
