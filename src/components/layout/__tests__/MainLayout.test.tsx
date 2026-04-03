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

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/hooks/useRealtimeUpdates', () => ({
  useRealtimeUpdates: vi.fn(),
}))

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}))

vi.mock('./Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}))

vi.mock('./Header', () => ({
  Header: () => <div data-testid="header" />,
}))

vi.mock('./Breadcrumbs', () => ({
  Breadcrumbs: () => <div data-testid="breadcrumbs" />,
}))

vi.mock('@/components/ui/ToastContainer', () => ({
  ToastContainer: () => <div data-testid="toast-container" />,
}))

vi.mock('@/components/ui/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
}))

vi.mock('@/components/ai/FloatingAIButton', () => ({
  FloatingAIButton: () => null,
}))

vi.mock('@/components/onboarding/OnboardingTour', () => ({
  OnboardingTour: () => null,
}))

vi.mock('@/components/notifications/NotificationBell', () => ({
  NotificationBell: () => null,
}))

vi.mock('@/components/search/GlobalSearchModal', () => ({
  GlobalSearchModal: () => null,
}))

import { MainLayout } from '../MainLayout'

describe('MainLayout', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <MainLayout />
      </MemoryRouter>
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
