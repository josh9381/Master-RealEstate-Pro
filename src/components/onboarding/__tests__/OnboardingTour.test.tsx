/* eslint-disable @typescript-eslint/no-explicit-any */
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(
    (selector?: any) => {
      const state = { user: { id: '1', name: 'Test', role: 'admin' }, isAdmin: () => true, hasPermission: () => true }
      return selector ? selector(state) : state
    },
    { getState: () => ({ user: { id: '1', name: 'Test', role: 'admin' } }) }
  ),
}))

vi.mock('@/lib/userStorage', () => ({
  getUserItem: vi.fn().mockReturnValue(null),
  setUserItem: vi.fn(),
}))

import { OnboardingTour } from '../OnboardingTour'

describe('OnboardingTour', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <OnboardingTour forceShow={true} onComplete={vi.fn()} />
      </MemoryRouter>
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
