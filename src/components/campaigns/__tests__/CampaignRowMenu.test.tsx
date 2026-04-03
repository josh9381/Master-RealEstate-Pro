import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'

import { CampaignRowMenu } from '../CampaignRowMenu'
import type { Campaign } from '@/types'

describe('CampaignRowMenu', () => {
  it('renders without crashing', () => {
    const campaign: Campaign = {
      id: 'camp-1',
      name: 'Test Campaign',
      type: 'EMAIL',
      status: 'DRAFT',
      startDate: '2026-01-01',
      sent: 0,
    }
    const actions = {
      onDuplicate: vi.fn(),
      onPause: vi.fn(),
      onResume: vi.fn(),
      onSend: vi.fn(),
      onArchive: vi.fn(),
      onUnarchive: vi.fn(),
      onChangeStatus: vi.fn(),
      onDelete: vi.fn(),
    }
    render(
      <MemoryRouter>
        <CampaignRowMenu campaign={campaign} actions={actions} />
      </MemoryRouter>
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
