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

import { Sidebar } from '../Sidebar'

describe('Sidebar', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
