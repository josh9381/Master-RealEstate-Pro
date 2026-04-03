import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('dompurify', () => ({
  default: { sanitize: (x: string) => x },
}))
vi.mock('@/lib/metricsCalculator', () => ({
  formatCurrency: (v: number) => `$${v}`,
}))

import { CampaignPreviewModal } from '../CampaignPreviewModal'

describe('CampaignPreviewModal', () => {
  it('renders without crashing', () => {
    render(
      <CampaignPreviewModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        preview={{
          campaignName: 'Test Campaign',
          recipientCount: 100,
          cost: { total: 10, perRecipient: 0.1 },
        }}
      />
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
