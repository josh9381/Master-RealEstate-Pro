import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'

import { AIHubLayout } from '../AIHubLayout'

describe('AIHubLayout', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter initialEntries={['/ai']}>
        <AIHubLayout>
          <div>child content</div>
        </AIHubLayout>
      </MemoryRouter>
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
