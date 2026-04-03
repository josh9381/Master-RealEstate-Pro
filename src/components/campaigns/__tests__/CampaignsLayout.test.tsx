import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/components/subscription/FeatureGate', () => ({
  FeatureGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UsageBadge: () => <span data-testid="usage-badge" />,
}))

import { CampaignsLayout } from '../CampaignsLayout'

describe('CampaignsLayout', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter initialEntries={['/campaigns']}>
        <CampaignsLayout>
          <div>child content</div>
        </CampaignsLayout>
      </MemoryRouter>
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
