import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn() } }))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  notificationsApi: {
    getNotifications: vi.fn().mockResolvedValue({ data: { notifications: [] } }),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    delete: vi.fn(),
  },
}))

import { NotificationPanel } from '../NotificationPanel'

describe('NotificationPanel', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <NotificationPanel onClose={vi.fn()} onMarkAllRead={vi.fn()} />
      </MemoryRouter>
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
