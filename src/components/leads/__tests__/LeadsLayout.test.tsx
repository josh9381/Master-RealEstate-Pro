/* eslint-disable @typescript-eslint/no-explicit-any */
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/components/subscription/FeatureGate', () => ({
  FeatureGate: ({ children }: any) => <>{children}</>,
  UsageBadge: () => null,
}))

import { LeadsLayout } from '../LeadsLayout'

describe('LeadsLayout', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter initialEntries={['/leads/all']}>
        <LeadsLayout><div>child content</div></LeadsLayout>
      </MemoryRouter>
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
