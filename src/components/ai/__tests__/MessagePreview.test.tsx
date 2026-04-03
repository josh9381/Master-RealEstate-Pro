import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { MessagePreview } from '../MessagePreview'

describe('MessagePreview', () => {
  it('renders without crashing', () => {
    render(
      <MessagePreview
        type="email"
        content={{
          subject: 'Test Subject',
          body: 'Test body content',
          tone: 'professional',
          leadName: 'John Doe',
          purpose: 'follow-up',
        }}
        onApply={vi.fn()}
        onEdit={vi.fn()}
        onCopy={vi.fn()}
      />
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
