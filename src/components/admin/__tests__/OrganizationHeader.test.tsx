/* eslint-disable @typescript-eslint/no-explicit-any */
import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(
    (selector?: any) => {
      const state = {
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@test.com',
          role: 'admin',
          avatar: null,
          subscription: { plan: 'pro', status: 'active' },
          organization: { name: 'Test Org', logo: null, memberCount: 5, trialEndsAt: null },
        },
        isAdmin: () => true,
        isManager: () => true,
        hasPermission: () => true,
        getSubscriptionTier: () => 'PROFESSIONAL',
        isTrialActive: () => false,
        logout: vi.fn(),
      }
      return selector ? selector(state) : state
    },
    { getState: () => ({ user: { id: '1', name: 'Test User', role: 'admin' }, isAdmin: () => true, logout: vi.fn() }) }
  ),
}))

import { OrganizationHeader } from '../OrganizationHeader'

describe('OrganizationHeader', () => {
  it('renders without crashing', () => {
    render(<OrganizationHeader />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
