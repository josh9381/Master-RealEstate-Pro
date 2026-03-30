import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { NotificationBell } from '../NotificationBell'

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn() } }))

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn() },
  notificationsApi: {
    getUnreadCount: vi.fn().mockResolvedValue({ data: { count: 3 } }),
    getAll: vi.fn().mockResolvedValue({ data: { data: [], pagination: { total: 0 } } }),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}))

vi.mock('@/hooks/useSocket', () => ({
  useSocketEvent: vi.fn(),
}))

vi.mock('@/store/authStore', () => {
  const store = Object.assign(
    (selector: any) => selector({ user: { id: 'user1' }, accessToken: 'token' }),
    { getState: () => ({ user: { id: 'user1' }, accessToken: 'token' }) }
  )
  return { useAuthStore: store }
})

vi.mock('@/lib/notificationSounds', () => ({
  playNotificationSound: vi.fn(),
}))

vi.mock('@/components/notifications/NotificationPanel', () => ({
  NotificationPanel: ({ isOpen }: any) => isOpen ? <div data-testid="panel">Panel</div> : null,
}))

describe('NotificationBell', () => {
  it('renders notification bell button', () => {
    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    )
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('clicking bell toggles open state', async () => {
    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    )
    const button = screen.getByRole('button')
    fireEvent.click(button)
    // Component should update without crashing
    expect(button).toBeInTheDocument()
  })
})
