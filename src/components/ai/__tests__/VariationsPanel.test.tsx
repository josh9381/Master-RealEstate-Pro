import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/metricsCalculator', () => ({
  formatRate: (v: number) => `${v}%`,
}))

import { VariationsPanel } from '../VariationsPanel'

describe('VariationsPanel', () => {
  it('renders without crashing', () => {
    const variations = [
      {
        id: 1,
        tone: 'professional',
        message: { subject: 'Subject A', body: 'Body A' },
        predictedResponseRate: 75,
        reasoning: 'Best match for audience',
      },
      {
        id: 2,
        tone: 'friendly',
        message: { body: 'Body B' },
        predictedResponseRate: 60,
        reasoning: 'Casual approach',
      },
    ]
    render(<VariationsPanel variations={variations} onSelect={vi.fn()} />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
