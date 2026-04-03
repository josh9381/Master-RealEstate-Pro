/* eslint-disable @typescript-eslint/no-explicit-any */
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/store/uiStore', () => ({
  useUIStore: () => ({
    toggleSidebar: vi.fn(),
    theme: 'light',
    toggleTheme: vi.fn(),
    sidebarOpen: true,
    setSidebarOpen: vi.fn(),
  }),
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(
    (selector?: any) => {
      const state = {
        user: { id: '1', firstName: 'Test', lastName: 'User', email: 'test@test.com', role: 'admin', avatar: null, subscription: { plan: 'pro', status: 'active' } },
        isAdmin: () => true,
        isManager: () => true,
        hasPermission: () => true,
        getSubscriptionTier: () => 'pro',
        isTrialActive: () => false,
        logout: vi.fn(),
      }
      return selector ? selector(state) : state
    },
    { getState: () => ({ user: { id: '1', firstName: 'Test', lastName: 'User', role: 'admin' }, isAdmin: () => true, logout: vi.fn() }) }
  ),
}))

vi.mock('@/components/notifications/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}))

vi.mock('@/components/search/GlobalSearchModal', () => ({
  GlobalSearchModal: () => null,
}))

import { Header } from '../Header'

describe('Header', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
