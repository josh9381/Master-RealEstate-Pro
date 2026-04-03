import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { AdvancedAudienceFilters } from '../AdvancedAudienceFilters'

describe('AdvancedAudienceFilters', () => {
  it('renders without crashing', () => {
    render(
      <AdvancedAudienceFilters
        filters={[]}
        onChange={vi.fn()}
        leadCount={42}
      />
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
