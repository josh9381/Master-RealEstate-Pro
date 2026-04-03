import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  campaignsApi: {
    getCampaignStats: vi.fn().mockResolvedValue({ data: null }),
  },
}))

import { CampaignExecutionStatus } from '../CampaignExecutionStatus'

describe('CampaignExecutionStatus', () => {
  it('renders without crashing', () => {
    render(<CampaignExecutionStatus campaignId="camp-1" />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
