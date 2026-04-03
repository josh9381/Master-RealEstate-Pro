import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { EmailPreviewFrame } from '../EmailPreviewFrame'

describe('EmailPreviewFrame', () => {
  it('renders without crashing', () => {
    render(<EmailPreviewFrame html="<p>Hello</p>" subject="Test Subject" />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
